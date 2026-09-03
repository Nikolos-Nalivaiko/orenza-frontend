/**
 * Фото з майданчика. Завантаження файлів на бекенді ще немає, тож знімок
 * живе як data-URL — рівно так само, як обкладинка обʼєкта. Тип описаний так,
 * як його віддаватиме майбутній GET|POST /api/v1/objects/{id}/photos.
 */

export interface ObjectPhoto {
  id: number
  object_id: number
  /** data-URL знімка. На бекенді тут буде посилання на файл. */
  src: string
  name: string
  /** Коли знімок зʼявився в картці, ISO. */
  at: string
}

export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

/**
 * Знімок із телефона важить 3–6 МБ, тож приймаємо із запасом: у сховище він
 * усе одно ляже стисненим (див. lib/image).
 */
export const PHOTO_MAX_BYTES = 12 * 1024 * 1024

/** Довша сторона знімка в сховищі, px. */
export const PHOTO_MAX_SIDE = 1440

/** Скільки мініатюр показує стрічка — решта ховається за «Усі фото». */
export const PHOTO_STRIP = 8

/** Знімки обʼєкта, свіжі спочатку — саме в такому порядку їх і дивляться. */
export function photosOf(photos: ObjectPhoto[], objectId: number): ObjectPhoto[] {
  return photos
    .filter((photo) => photo.object_id === objectId)
    .sort((left, right) => Date.parse(right.at) - Date.parse(left.at))
}

/** 1 знімок, 2–4 знімки, 5+ знімків. */
export function formatShots(count: number): string {
  const tail = count % 100 >= 11 && count % 100 <= 14 ? 0 : count % 10

  if (tail === 1) {
    return `${count} знімок`
  }

  return tail >= 2 && tail <= 4 ? `${count} знімки` : `${count} знімків`
}
