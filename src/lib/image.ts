/**
 * Підготовка знімків до збереження. Поки фото лежать у localStorage разом із
 * рештою даних, оригінал із телефона туди не влізе: одна квота на весь простір,
 * а знімків на обʼєкт буває десятки. Тож перед збереженням зменшуємо довшу
 * сторону й перекладаємо в JPEG — на екрані різниці не видно, а важить воно
 * у десятки разів менше.
 *
 * Усе тут — браузерні API (FileReader, canvas). Коли зʼявиться завантаження
 * файлів на бекенд, модуль поїде разом із data-URL.
 */

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.addEventListener('load', () => resolve(String(reader.result)))
    reader.addEventListener('error', () => reject(new Error('read')))
    reader.readAsDataURL(file)
  })
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => reject(new Error('decode')))
    image.src = src
  })
}

/**
 * Знімок, готовий до збереження: не ширший і не вищий за maxSide.
 * Якщо стиснути не вдалося — віддаємо оригінал: краще важкий знімок,
 * ніж жодного.
 */
export async function shrinkImage(file: File, maxSide: number): Promise<string> {
  const original = await readFileAsDataUrl(file)

  try {
    const image = await loadImage(original)
    const scale = maxSide / Math.max(image.naturalWidth, image.naturalHeight)

    // Маленький знімок перекодовувати немає сенсу — тільки втратимо якість.
    if (scale >= 1) {
      return original
    }

    const canvas = document.createElement('canvas')

    canvas.width = Math.round(image.naturalWidth * scale)
    canvas.height = Math.round(image.naturalHeight * scale)

    const context = canvas.getContext('2d')

    if (context === null) {
      return original
    }

    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    return canvas.toDataURL('image/jpeg', 0.82)
  } catch {
    return original
  }
}
