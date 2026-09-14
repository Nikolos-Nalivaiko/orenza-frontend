import { momentTime } from '@/lib/moment'

export interface ObjectPhoto {
  id: number
  thumb: string
  full: string
  width: number
  height: number
  color: string
  name: string | null
  taken_at: string | null
  created_at: string | null
}

export interface ViewerPhoto {
  id: number
  thumb: string
  full: string
  width: number
  height: number
  color: string
  at: string | null
  name?: string | null
}

export interface LegacyPhoto {
  id: number
  object_id: number
  src: string
  name: string
  at: string
}

export const LEGACY_PHOTOS_KEY = 'orenza.objects.photos'

export const PHOTO_UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
export const PHOTO_INPUT_TYPES = [...PHOTO_UPLOAD_TYPES, 'image/heic', 'image/heif']
export const PHOTO_MAX_BYTES = 40 * 1024 * 1024
export const PHOTO_UPLOAD_MAX_BYTES = 15 * 1024 * 1024
export const PHOTO_SERVER_MAX_SIDE = 8000
export const PHOTO_UPLOAD_SIDE = 2560
export const PHOTO_MIN_SIDE = 200
export const PHOTO_STRIP = 8
export const PHOTO_PARALLEL_UPLOADS = 2

export function photoMoment(photo: Pick<ObjectPhoto, 'taken_at' | 'created_at'>): string | null {
  return photo.taken_at ?? photo.created_at
}

export function sortPhotos(photos: ObjectPhoto[]): ObjectPhoto[] {
  return [...photos].sort((left, right) => {
    const leftAt = photoMoment(left)
    const rightAt = photoMoment(right)
    const byMoment =
      (rightAt === null ? 0 : momentTime(rightAt)) - (leftAt === null ? 0 : momentTime(leftAt))

    return byMoment !== 0 ? byMoment : right.id - left.id
  })
}

export function toViewerPhoto(photo: ObjectPhoto): ViewerPhoto {
  return {
    id: photo.id,
    thumb: photo.thumb,
    full: photo.full,
    width: photo.width,
    height: photo.height,
    color: photo.color,
    at: photoMoment(photo),
    name: photo.name,
  }
}

export function photoFileProblem(file: File): string | null {
  if (!PHOTO_INPUT_TYPES.includes(file.type)) {
    return `«${file.name}» — не зображення: потрібні JPG, PNG, WEBP, AVIF або HEIC`
  }

  if (file.size > PHOTO_MAX_BYTES) {
    return `«${file.name}» важчий за ${Math.round(PHOTO_MAX_BYTES / 1024 / 1024)} МБ`
  }

  return null
}

export function photoNeedsShrink(file: File): boolean {
  return file.size > PHOTO_UPLOAD_MAX_BYTES || !PHOTO_UPLOAD_TYPES.includes(file.type)
}

export function photoSizeProblem(name: string, width: number, height: number): string | null {
  return width < PHOTO_MIN_SIDE || height < PHOTO_MIN_SIDE
    ? `«${name}» замале: потрібно щонайменше ${PHOTO_MIN_SIDE}×${PHOTO_MIN_SIDE} пікселів`
    : null
}

export function isLegacyPhoto(value: unknown): value is LegacyPhoto {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const item = value as Record<string, unknown>

  return (
    typeof item.id === 'number' &&
    typeof item.object_id === 'number' &&
    typeof item.src === 'string' &&
    item.src.startsWith('data:image/') &&
    typeof item.name === 'string' &&
    typeof item.at === 'string'
  )
}

export function parseLegacyPhotos(raw: string | null): LegacyPhoto[] {
  if (raw === null) {
    return []
  }

  try {
    const parsed: unknown = JSON.parse(raw)

    return Array.isArray(parsed) ? parsed.filter(isLegacyPhoto) : []
  } catch {
    return []
  }
}

export function dataUrlToFile(src: string, name: string): File {
  const [header = '', body = ''] = src.split(',', 2)
  const type = /^data:([^;,]+)/.exec(header)?.[1] ?? 'image/jpeg'
  const binary = header.includes(';base64') ? atob(body) : decodeURIComponent(body)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  const extension = type.split('/')[1]?.replace('jpeg', 'jpg') ?? 'jpg'
  const base = name.replace(/\.[^.]+$/, '') || 'photo'

  return new File([bytes], `${base}.${extension}`, { type })
}
