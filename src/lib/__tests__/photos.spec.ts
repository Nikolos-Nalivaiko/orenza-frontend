import { describe, expect, it } from 'vitest'
import {
  dataUrlToFile,
  parseLegacyPhotos,
  PHOTO_MAX_BYTES,
  PHOTO_UPLOAD_MAX_BYTES,
  photoFileProblem,
  photoMoment,
  photoNeedsShrink,
  photoSizeProblem,
  sortPhotos,
  toViewerPhoto,
  type ObjectPhoto,
} from '../photos'

function photo(overrides: Partial<ObjectPhoto> = {}): ObjectPhoto {
  return {
    id: 1,
    thumb: 'https://cdn.test/p-thumb.webp',
    full: 'https://cdn.test/p-full.webp',
    width: 1600,
    height: 1200,
    color: '#8a7f6a',
    name: 'IMG_1.jpg',
    taken_at: null,
    created_at: '2026-09-10T10:00:00+00:00',
    ...overrides,
  }
}

function file(type: string, size = 1024, name = 'photo.jpg'): File {
  const blob = new File([new Uint8Array(1)], name, { type })

  Object.defineProperty(blob, 'size', { value: size })

  return blob
}

describe('photoMoment', () => {
  it('бере дату зйомки, а без неї — дату завантаження', () => {
    expect(photoMoment(photo({ taken_at: '2026-08-01T09:00:00+00:00' }))).toBe(
      '2026-08-01T09:00:00+00:00',
    )
    expect(photoMoment(photo())).toBe('2026-09-10T10:00:00+00:00')
  })
})

describe('sortPhotos', () => {
  it('ставить свіжі знімки першими, а однакові дати — за id', () => {
    const sorted = sortPhotos([
      photo({ id: 1, taken_at: '2026-06-01T09:00:00Z' }),
      photo({ id: 2, taken_at: null, created_at: '2026-09-01T09:00:00Z' }),
      photo({ id: 3, taken_at: '2026-07-01T09:00:00Z' }),
      photo({ id: 4, taken_at: '2026-07-01T09:00:00Z' }),
    ])

    expect(sorted.map((item) => item.id)).toEqual([2, 4, 3, 1])
  })
})

describe('toViewerPhoto', () => {
  it('готує знімок для переглядача', () => {
    expect(toViewerPhoto(photo({ taken_at: '2026-08-01T09:00:00Z' }))).toEqual({
      id: 1,
      thumb: 'https://cdn.test/p-thumb.webp',
      full: 'https://cdn.test/p-full.webp',
      width: 1600,
      height: 1200,
      color: '#8a7f6a',
      at: '2026-08-01T09:00:00Z',
      name: 'IMG_1.jpg',
    })
  })
})

describe('перевірка файлів', () => {
  it('приймає фото з телефона й відхиляє інше', () => {
    expect(photoFileProblem(file('image/heic'))).toBeNull()
    expect(photoFileProblem(file('image/jpeg'))).toBeNull()
    expect(photoFileProblem(file('application/pdf', 10, 'act.pdf'))).toContain('act.pdf')
    expect(photoFileProblem(file('image/jpeg', PHOTO_MAX_BYTES + 1))).not.toBeNull()
  })

  it('стискає лише те, що сервер не прийме як є', () => {
    expect(photoNeedsShrink(file('image/jpeg', 4 * 1024 * 1024))).toBe(false)
    expect(photoNeedsShrink(file('image/jpeg', PHOTO_UPLOAD_MAX_BYTES + 1))).toBe(true)
    expect(photoNeedsShrink(file('image/heic'))).toBe(true)
  })

  it('не пускає крихітні зображення', () => {
    expect(photoSizeProblem('icon.png', 64, 64)).toContain('icon.png')
    expect(photoSizeProblem('site.jpg', 1600, 1200)).toBeNull()
  })
})

describe('старі фото з localStorage', () => {
  it('читає лише коректні записи', () => {
    const raw = JSON.stringify([
      {
        id: 1,
        object_id: 2,
        src: 'data:image/jpeg;base64,AAAA',
        name: 'a.jpg',
        at: '2026-08-01T09:00:00Z',
      },
      {
        id: 2,
        object_id: 2,
        src: 'https://evil.test/x.jpg',
        name: 'b.jpg',
        at: '2026-08-01T09:00:00Z',
      },
      {
        id: 3,
        object_id: '2',
        src: 'data:image/png;base64,AAAA',
        name: 'c.png',
        at: '2026-08-01T09:00:00Z',
      },
      null,
    ])

    expect(parseLegacyPhotos(raw).map((item) => item.id)).toEqual([1])
    expect(parseLegacyPhotos('not json')).toEqual([])
    expect(parseLegacyPhotos(null)).toEqual([])
  })

  it('перетворює data-URL на файл для завантаження', async () => {
    const converted = dataUrlToFile('data:image/jpeg;base64,/9j/4A==', 'site.webp')

    expect(converted.name).toBe('site.jpg')
    expect(converted.type).toBe('image/jpeg')
    expect([...new Uint8Array(await converted.arrayBuffer())]).toEqual([0xff, 0xd8, 0xff, 0xe0])
  })
})
