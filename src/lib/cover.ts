export type CoverVariant = 'thumb' | 'card' | 'hero'

export interface CoverFocus {
  x: number
  y: number
}

export interface ObjectCover {
  thumb: string
  card: string
  hero: string
  width: number
  height: number
  color: string
  focus: CoverFocus
}

export interface CoverDraft {
  file: File
  preview: string
  width: number
  height: number
  focus: CoverFocus
}

export const COVER_VARIANT_SIDES: Record<CoverVariant, number> = {
  thumb: 320,
  card: 960,
  hero: 2048,
}

export const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
export const COVER_INPUT_TYPES = [...COVER_TYPES, 'image/heic', 'image/heif']
export const COVER_MAX_BYTES = 25 * 1024 * 1024
export const COVER_UPLOAD_SIDE = 2560
export const COVER_MIN_WIDTH = 320
export const COVER_MIN_HEIGHT = 180

export const CENTER_FOCUS: CoverFocus = { x: 0.5, y: 0.5 }

export function clampFocus(focus: CoverFocus): CoverFocus {
  const clamp = (value: number): number =>
    Number.isFinite(value) ? Math.round(Math.min(1, Math.max(0, value)) * 1000) / 1000 : 0.5

  return { x: clamp(focus.x), y: clamp(focus.y) }
}

export function coverPosition(focus: CoverFocus | null | undefined): string {
  const { x, y } = clampFocus(focus ?? CENTER_FOCUS)

  return `${Math.round(x * 1000) / 10}% ${Math.round(y * 1000) / 10}%`
}

export function variantWidth(
  cover: Pick<ObjectCover, 'width' | 'height'>,
  variant: CoverVariant,
): number {
  const longest = Math.max(cover.width, cover.height)

  if (longest <= 0) {
    return COVER_VARIANT_SIDES[variant]
  }

  const scale = Math.min(1, COVER_VARIANT_SIDES[variant] / longest)

  return Math.max(1, Math.round(cover.width * scale))
}

export function coverSrcset(cover: ObjectCover, variants: CoverVariant[]): string {
  const seen = new Set<number>()

  return variants
    .map((variant) => ({ url: cover[variant], width: variantWidth(cover, variant) }))
    .sort((a, b) => a.width - b.width)
    .filter(({ width }) => {
      if (seen.has(width)) {
        return false
      }

      seen.add(width)

      return true
    })
    .map(({ url, width }) => `${url} ${width}w`)
    .join(', ')
}

export const COVER_SRCSET_VARIANTS: Record<CoverVariant, CoverVariant[]> = {
  thumb: ['thumb'],
  card: ['thumb', 'card'],
  hero: ['card', 'hero'],
}

function hashOf(text: string): number {
  let hash = 2166136261

  for (const char of text) {
    hash ^= char.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

export interface CoverPlaceholder {
  initials: string
  background: string
  ink: string
}

export function coverPlaceholder(name: string): CoverPlaceholder {
  const hue = hashOf(name.trim().toLowerCase()) % 360
  const words = name.match(/[\p{L}\p{N}]+/gu) ?? []
  const initials = words
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
    .toUpperCase()

  return {
    initials: initials === '' ? 'O' : initials,
    background: `linear-gradient(135deg, hsl(${hue} 46% 88%), hsl(${(hue + 36) % 360} 38% 76%))`,
    ink: `hsl(${hue} 42% 28%)`,
  }
}

export function coverFileProblem(file: File): string | null {
  if (!COVER_INPUT_TYPES.includes(file.type)) {
    return 'Потрібне зображення: JPG, PNG, WEBP, AVIF або HEIC'
  }

  if (file.size > COVER_MAX_BYTES) {
    return `Файл важчий за ${Math.round(COVER_MAX_BYTES / 1024 / 1024)} МБ`
  }

  return null
}

export function coverSizeProblem(width: number, height: number): string | null {
  return width < COVER_MIN_WIDTH || height < COVER_MIN_HEIGHT
    ? `Зображення замале: потрібно щонайменше ${COVER_MIN_WIDTH}×${COVER_MIN_HEIGHT} пікселів`
    : null
}
