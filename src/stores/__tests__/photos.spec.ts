import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import type { UploadOptions } from '@/lib/http'
import type { PreparedImage } from '@/lib/image'
import { LEGACY_PHOTOS_KEY, type ObjectPhoto } from '@/lib/photos'

const uploadMock = vi.hoisted(() =>
  vi.fn<(path: string, form: FormData, options?: UploadOptions) => Promise<unknown>>(),
)
const getMock = vi.hoisted(() => vi.fn<(path: string) => Promise<unknown>>())
const deleteMock = vi.hoisted(() => vi.fn<(path: string) => Promise<unknown>>())

vi.mock('@/lib/http', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/http')>()

  return {
    ...original,
    upload: uploadMock,
    api: { ...original.api, get: getMock, delete: deleteMock },
  }
})

vi.mock('@/lib/image', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/image')>()

  return {
    ...original,
    prepareImageUpload: vi.fn<(file: File) => Promise<PreparedImage>>(async (file) => ({
      file,
      width: 1600,
      height: 1200,
    })),
  }
})

vi.mock('../workspaces', () => ({
  useWorkspacesStore: () => ({ current: { slug: 'acme' }, currentId: 1 }),
}))

const { usePhotosStore } = await import('../photos')
const { ApiError } = await import('@/lib/http')

function serverPhoto(id: number, takenAt: string | null = null): ObjectPhoto {
  return {
    id,
    thumb: `https://cdn.test/${id}-thumb.webp`,
    full: `https://cdn.test/${id}-full.webp`,
    width: 1600,
    height: 1200,
    color: '#8a7f6a',
    name: `IMG_${id}.jpg`,
    taken_at: takenAt,
    created_at: `2026-09-${String(id).padStart(2, '0')}T10:00:00Z`,
  }
}

function jpeg(name: string): File {
  return new File([new Uint8Array([0xff, 0xd8, 0xff])], name, {
    type: 'image/jpeg',
    lastModified: Date.parse('2026-08-20T08:00:00Z'),
  })
}

function sentForm(call: number): FormData {
  const form = uploadMock.mock.calls[call]?.[1]

  if (!(form instanceof FormData)) {
    throw new Error(`upload #${call} was not called with FormData`)
  }

  return form
}

async function settle(): Promise<void> {
  for (let step = 0; step < 10; step += 1) {
    await Promise.resolve()
    await nextTick()
  }
}

function memoryStorage(): Storage {
  const items = new Map<string, string>()

  return {
    get length() {
      return items.size
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  setActivePinia(createPinia())
  vi.stubGlobal(
    'URL',
    Object.assign(URL, {
      createObjectURL: vi.fn<() => string>(() => 'blob:preview'),
      revokeObjectURL: vi.fn<() => void>(),
    }),
  )
  uploadMock.mockReset()
  getMock.mockReset()
  deleteMock.mockReset()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('photos store', () => {
  it('завантажує список обʼєкта свіжими першими', async () => {
    getMock.mockResolvedValue([serverPhoto(1), serverPhoto(3), serverPhoto(2)])

    const store = usePhotosStore()

    await store.fetch(7)

    expect(getMock).toHaveBeenCalledWith('/workspaces/acme/objects/7/photos')
    expect(store.photosOf(7).map((photo) => photo.id)).toEqual([3, 2, 1])
    expect(store.isLoaded(7)).toBe(true)
  })

  it('вантажить файли в черзі й додає готові фото в галерею', async () => {
    getMock.mockResolvedValue([])
    uploadMock.mockImplementation(async (_path, form, options) => {
      options?.onProgress?.(0.5)

      return serverPhoto(Number((form.get('photo') as File).name.replace(/\D/g, '')))
    })

    const store = usePhotosStore()

    await store.fetch(7)
    store.add(7, [jpeg('IMG_4.jpg'), jpeg('IMG_5.jpg')])

    expect(store.uploadsOf(7)).toHaveLength(2)

    await settle()

    expect(uploadMock).toHaveBeenCalledTimes(2)
    expect(uploadMock.mock.calls[0]?.[0]).toBe('/workspaces/acme/objects/7/photos')
    expect(sentForm(0).get('taken_at')).toBe('2026-08-20T08:00:00.000Z')
    expect(store.uploadsOf(7)).toHaveLength(0)
    expect(store.photosOf(7).map((photo) => photo.id)).toEqual([5, 4])
  })

  it('не пускає в чергу не зображення', () => {
    const store = usePhotosStore()

    store.add(7, [new File(['x'], 'act.pdf', { type: 'application/pdf' })])

    expect(store.uploadsOf(7)).toHaveLength(0)
    expect(store.errors[7]).toContain('act.pdf')
  })

  it('лишає невдале завантаження з можливістю повторити', async () => {
    uploadMock.mockRejectedValueOnce(new ApiError('Немає звʼязку із сервером.', 0, 'network'))
    uploadMock.mockResolvedValueOnce(serverPhoto(9))

    const store = usePhotosStore()

    store.add(7, [jpeg('IMG_9.jpg')])
    await settle()

    const [failed] = store.uploadsOf(7)

    expect(failed?.status).toBe('failed')
    expect(failed?.retryable).toBe(true)
    expect(failed?.error).toBe('Немає звʼязку із сервером.')

    store.retry(failed?.uid ?? '')
    await settle()

    expect(store.uploadsOf(7)).toHaveLength(0)
    expect(store.photosOf(7).map((photo) => photo.id)).toEqual([9])
  })

  it('помилку валідації повторювати не пропонує', async () => {
    uploadMock.mockRejectedValue(
      new ApiError('Перевірте заповнені поля.', 422, 'validation_failed', {
        photo: ['Файл завеликий.'],
      }),
    )

    const store = usePhotosStore()

    store.add(7, [jpeg('IMG_9.jpg')])
    await settle()

    expect(store.uploadsOf(7)[0]?.error).toBe('Файл завеликий.')
    expect(store.uploadsOf(7)[0]?.retryable).toBe(false)
  })

  it('переносить старі фото з localStorage і прибирає їх звідти', async () => {
    localStorage.setItem(
      LEGACY_PHOTOS_KEY,
      JSON.stringify([
        {
          id: 1,
          object_id: 7,
          src: 'data:image/jpeg;base64,/9j/4A==',
          name: 'old.jpg',
          at: '2026-07-01T09:00:00.000Z',
        },
        {
          id: 2,
          object_id: 8,
          src: 'data:image/jpeg;base64,/9j/4A==',
          name: 'other.jpg',
          at: '2026-07-02T09:00:00.000Z',
        },
      ]),
    )
    setActivePinia(createPinia())
    uploadMock.mockResolvedValue(serverPhoto(11))

    const store = usePhotosStore()

    expect(store.legacyOf(7)).toHaveLength(1)

    store.importLegacy(7)
    await settle()

    expect(sentForm(0).get('taken_at')).toBe('2026-07-01T09:00:00.000Z')
    expect(store.legacyOf(7)).toHaveLength(0)
    expect(store.legacyOf(8)).toHaveLength(1)
    expect(JSON.parse(localStorage.getItem(LEGACY_PHOTOS_KEY) ?? '[]')).toHaveLength(1)
  })

  it('видаляє фото з сервера й зі списку', async () => {
    getMock.mockResolvedValue([serverPhoto(1), serverPhoto(2)])
    deleteMock.mockResolvedValue(null)

    const store = usePhotosStore()

    await store.fetch(7)

    await expect(store.remove(7, 1)).resolves.toBe(true)
    expect(deleteMock).toHaveBeenCalledWith('/workspaces/acme/objects/7/photos/1')
    expect(store.photosOf(7).map((photo) => photo.id)).toEqual([2])
  })
})
