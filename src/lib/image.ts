function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', () => reject(new Error('decode')))
    image.src = src
  })
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
