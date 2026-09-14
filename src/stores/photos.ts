import { ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useProgressStore } from './progress'
import { useWorkspacesStore } from './workspaces'
import { api, ApiError, upload as uploadForm } from '@/lib/http'
import { ImageDecodeError, prepareImageUpload } from '@/lib/image'
import {
  dataUrlToFile,
  LEGACY_PHOTOS_KEY,
  parseLegacyPhotos,
  PHOTO_PARALLEL_UPLOADS,
  PHOTO_SERVER_MAX_SIDE,
  PHOTO_UPLOAD_SIDE,
  PHOTO_UPLOAD_TYPES,
  photoFileProblem,
  photoNeedsShrink,
  photoSizeProblem,
  sortPhotos,
  type LegacyPhoto,
  type ObjectPhoto,
} from '@/lib/photos'

export type PhotoUploadStatus = 'queued' | 'preparing' | 'uploading' | 'failed'

export interface PhotoUpload {
  uid: string
  objectId: number
  path: string
  name: string
  source: File
  takenAt: string | null
  legacyId: number | null
  preview: string | null
  progress: number
  status: PhotoUploadStatus
  error: string | null
  retryable: boolean
}

function readLegacy(): LegacyPhoto[] {
  try {
    return parseLegacyPhotos(localStorage.getItem(LEGACY_PHOTOS_KEY))
  } catch {
    return []
  }
}

function writeLegacy(photos: LegacyPhoto[]): void {
  try {
    if (photos.length === 0) {
      localStorage.removeItem(LEGACY_PHOTOS_KEY)
    } else {
      localStorage.setItem(LEGACY_PHOTOS_KEY, JSON.stringify(photos))
    }
  } catch {
    return
  }
}

function messageFor(cause: unknown, fallback: string): string {
  if (cause instanceof ApiError) {
    return cause.fieldError('photo') ?? cause.fieldError('taken_at') ?? cause.message
  }

  if (cause instanceof ImageDecodeError) {
    return 'Браузер не зміг відкрити це зображення. Спробуйте JPG або PNG.'
  }

  return fallback
}

let sequence = 0

export const usePhotosStore = defineStore('photos', () => {
  const workspaces = useWorkspacesStore()
  const progress = useProgressStore()

  const byObject = ref<Record<number, ObjectPhoto[]>>({})
  const loading = ref<Record<number, boolean>>({})
  const errors = ref<Record<number, string | null>>({})
  const removing = ref<Record<number, boolean>>({})
  const uploads = ref<PhotoUpload[]>([])
  const legacy = ref<LegacyPhoto[]>(readLegacy())

  let active = 0

  function basePath(objectId: number): string | null {
    const slug = workspaces.current?.slug

    return slug === undefined ? null : `/workspaces/${slug}/objects/${objectId}/photos`
  }

  function photosOf(objectId: number): ObjectPhoto[] {
    return byObject.value[objectId] ?? []
  }

  function isLoaded(objectId: number): boolean {
    return byObject.value[objectId] !== undefined
  }

  function uploadsOf(objectId: number): PhotoUpload[] {
    return uploads.value.filter((item) => item.objectId === objectId)
  }

  function legacyOf(objectId: number): LegacyPhoto[] {
    const queued = new Set(uploads.value.map((item) => item.legacyId))

    return legacy.value.filter((item) => item.object_id === objectId && !queued.has(item.id))
  }

  function setError(objectId: number, message: string | null): void {
    errors.value = { ...errors.value, [objectId]: message }
  }

  async function fetch(objectId: number): Promise<void> {
    const path = basePath(objectId)

    if (path === null || loading.value[objectId] === true) {
      return
    }

    loading.value = { ...loading.value, [objectId]: true }
    setError(objectId, null)

    try {
      const list = await progress.track(api.get<ObjectPhoto[]>(path))

      if (basePath(objectId) === path) {
        byObject.value = { ...byObject.value, [objectId]: sortPhotos(list) }
      }
    } catch (cause) {
      setError(objectId, messageFor(cause, 'Не вдалося завантажити фото.'))
    } finally {
      loading.value = { ...loading.value, [objectId]: false }
    }
  }

  function find(uid: string): PhotoUpload | undefined {
    return uploads.value.find((item) => item.uid === uid)
  }

  function release(item: PhotoUpload): void {
    if (item.preview !== null) {
      URL.revokeObjectURL(item.preview)
      item.preview = null
    }
  }

  function enqueue(
    objectId: number,
    source: File,
    takenAt: string | null,
    legacyId: number | null = null,
  ): void {
    const path = basePath(objectId)

    if (path === null) {
      return
    }

    sequence += 1

    uploads.value.push({
      uid: `upload-${Date.now()}-${sequence}`,
      objectId,
      path,
      name: source.name,
      source,
      takenAt,
      legacyId,
      preview: null,
      progress: 0,
      status: 'queued',
      error: null,
      retryable: true,
    })
  }

  function add(objectId: number, files: File[]): void {
    const problems: string[] = []

    for (const file of files) {
      const problem = photoFileProblem(file)

      if (problem !== null) {
        problems.push(problem)

        continue
      }

      const takenAt = file.lastModified > 0 ? new Date(file.lastModified).toISOString() : null

      enqueue(objectId, file, takenAt)
    }

    setError(objectId, problems.length === 0 ? null : problems.join(' · '))
    pump()
  }

  function pump(): void {
    while (active < PHOTO_PARALLEL_UPLOADS) {
      const next = uploads.value.find((item) => item.status === 'queued')

      if (next === undefined) {
        return
      }

      next.status = 'preparing'
      active += 1

      void run(next.uid).finally(() => {
        active -= 1
        pump()
      })
    }
  }

  async function run(uid: string): Promise<void> {
    const item = find(uid)

    if (item === undefined) {
      return
    }

    item.error = null
    item.progress = 0

    try {
      const shrink = photoNeedsShrink(item.source)
      const prepared = await prepareImageUpload(
        item.source,
        shrink ? PHOTO_UPLOAD_SIDE : PHOTO_SERVER_MAX_SIDE,
        shrink ? [] : PHOTO_UPLOAD_TYPES,
      )
      const tooSmall = photoSizeProblem(item.name, prepared.width, prepared.height)

      if (tooSmall !== null) {
        item.status = 'failed'
        item.error = tooSmall
        item.retryable = false

        return
      }

      if (find(uid) === undefined) {
        return
      }

      if (item.preview === null) {
        item.preview = URL.createObjectURL(prepared.file)
      }

      item.status = 'uploading'

      const form = new FormData()

      form.append('photo', prepared.file)

      if (item.takenAt !== null) {
        form.append('taken_at', item.takenAt)
      }

      const photo = await uploadForm<ObjectPhoto>(item.path, form, {
        onProgress: (fraction) => {
          item.progress = fraction
        },
      })

      if (find(uid) === undefined) {
        return
      }

      if (basePath(item.objectId) === item.path) {
        byObject.value = {
          ...byObject.value,
          [item.objectId]: sortPhotos([...photosOf(item.objectId), photo]),
        }
      }

      if (item.legacyId !== null) {
        legacy.value = legacy.value.filter((entry) => entry.id !== item.legacyId)
        writeLegacy(legacy.value)
      }

      release(item)
      uploads.value = uploads.value.filter((entry) => entry.uid !== uid)
    } catch (cause) {
      item.status = 'failed'
      item.error = messageFor(cause, `Не вдалося завантажити «${item.name}».`)
      item.retryable =
        !(cause instanceof ImageDecodeError) && !(cause instanceof ApiError && cause.isValidation)
    }
  }

  function retry(uid: string): void {
    const item = find(uid)

    if (item !== undefined && item.status === 'failed' && item.retryable) {
      item.status = 'queued'
      item.error = null
      pump()
    }
  }

  function dismiss(uid: string): void {
    const item = find(uid)

    if (item === undefined || item.status === 'preparing' || item.status === 'uploading') {
      return
    }

    release(item)
    uploads.value = uploads.value.filter((entry) => entry.uid !== uid)
  }

  async function remove(objectId: number, photoId: number): Promise<boolean> {
    const path = basePath(objectId)

    if (path === null || removing.value[photoId] === true) {
      return false
    }

    removing.value = { ...removing.value, [photoId]: true }
    setError(objectId, null)

    try {
      await progress.track(api.delete(`${path}/${photoId}`))

      byObject.value = {
        ...byObject.value,
        [objectId]: photosOf(objectId).filter((photo) => photo.id !== photoId),
      }

      return true
    } catch (cause) {
      setError(objectId, messageFor(cause, 'Не вдалося прибрати фото.'))

      return false
    } finally {
      const { [photoId]: _, ...rest } = removing.value

      removing.value = rest
    }
  }

  function importLegacy(objectId: number): void {
    for (const photo of legacyOf(objectId)) {
      enqueue(objectId, dataUrlToFile(photo.src, photo.name), photo.at, photo.id)
    }

    pump()
  }

  function discardLegacy(objectId: number): void {
    legacy.value = legacy.value.filter((photo) => photo.object_id !== objectId)
    writeLegacy(legacy.value)
  }

  function forget(objectId: number): void {
    const { [objectId]: _, ...rest } = byObject.value

    byObject.value = rest
  }

  watch(
    () => workspaces.currentId,
    () => {
      byObject.value = {}
      errors.value = {}

      for (const item of uploads.value) {
        if (item.status === 'failed' || item.status === 'queued') {
          release(item)
        }
      }

      uploads.value = uploads.value.filter(
        (item) => item.status === 'preparing' || item.status === 'uploading',
      )
    },
  )

  return {
    byObject,
    loading,
    errors,
    removing,
    uploads,
    legacy,
    photosOf,
    isLoaded,
    uploadsOf,
    legacyOf,
    fetch,
    add,
    retry,
    dismiss,
    remove,
    importLegacy,
    discardLegacy,
    forget,
  }
})
