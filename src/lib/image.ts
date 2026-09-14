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

export interface PreparedImage {
  file: File
  width: number
  height: number
}

export class ImageDecodeError extends Error {
  constructor() {
    super('decode')
    this.name = 'ImageDecodeError'
  }
}

interface DecodedImage {
  source: CanvasImageSource
  width: number
  height: number
  release: () => void
}

async function decodeImage(file: File): Promise<DecodedImage> {
  const bitmap =
    typeof createImageBitmap === 'function'
      ? await createImageBitmap(file, { imageOrientation: 'from-image' }).catch(() => null)
      : null

  if (bitmap !== null) {
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      release: () => bitmap.close(),
    }
  }

  const url = URL.createObjectURL(file)

  try {
    const image = await loadImage(url)

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    }
  } catch {
    URL.revokeObjectURL(url)

    throw new ImageDecodeError()
  }
}

function canvasBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

export async function prepareImageUpload(
  file: File,
  maxSide: number,
  passthroughTypes: readonly string[],
): Promise<PreparedImage> {
  const decoded = await decodeImage(file)

  try {
    const longest = Math.max(decoded.width, decoded.height)
    const scale = longest > maxSide ? maxSide / longest : 1

    if (scale === 1 && passthroughTypes.includes(file.type)) {
      return { file, width: decoded.width, height: decoded.height }
    }

    const canvas = document.createElement('canvas')

    canvas.width = Math.round(decoded.width * scale)
    canvas.height = Math.round(decoded.height * scale)

    const context = canvas.getContext('2d')

    if (context === null) {
      return { file, width: decoded.width, height: decoded.height }
    }

    context.drawImage(decoded.source, 0, 0, canvas.width, canvas.height)

    const blob = await canvasBlob(canvas, 'image/jpeg', 0.9)

    if (blob === null) {
      return { file, width: decoded.width, height: decoded.height }
    }

    const name = file.name.replace(/\.[^.]+$/, '') || 'cover'

    return {
      file: new File([blob], `${name}.jpg`, { type: 'image/jpeg' }),
      width: canvas.width,
      height: canvas.height,
    }
  } finally {
    decoded.release()
  }
}
