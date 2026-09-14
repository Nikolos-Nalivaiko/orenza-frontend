import { describe, expect, it } from 'vitest'
import {
  clampFocus,
  COVER_MAX_BYTES,
  coverFileProblem,
  coverPlaceholder,
  coverPosition,
  coverSizeProblem,
  coverSrcset,
  variantWidth,
  type ObjectCover,
} from '../cover'

function cover(overrides: Partial<ObjectCover> = {}): ObjectCover {
  return {
    thumb: 'https://cdn.test/objects/1/cover/abc-thumb.webp',
    card: 'https://cdn.test/objects/1/cover/abc-card.webp',
    hero: 'https://cdn.test/objects/1/cover/abc-hero.webp',
    width: 4000,
    height: 3000,
    color: '#7a8b6c',
    focus: { x: 0.5, y: 0.5 },
    ...overrides,
  }
}

function file(type: string, size = 1024): File {
  return new File([new Uint8Array(size)], 'photo', { type })
}

describe('clampFocus', () => {
  it('тримає точку всередині кадру й округлює до тисячних', () => {
    expect(clampFocus({ x: -0.4, y: 1.7 })).toEqual({ x: 0, y: 1 })
    expect(clampFocus({ x: 0.12345, y: 0.98765 })).toEqual({ x: 0.123, y: 0.988 })
  })

  it('повертає центр замість NaN', () => {
    expect(clampFocus({ x: Number.NaN, y: Number.POSITIVE_INFINITY })).toEqual({ x: 0.5, y: 0.5 })
  })
})

describe('coverPosition', () => {
  it('перетворює фокус на object-position', () => {
    expect(coverPosition({ x: 0.25, y: 0.8 })).toBe('25% 80%')
    expect(coverPosition(null)).toBe('50% 50%')
  })
})

describe('variantWidth', () => {
  it('рахує реальну ширину варіанта з пропорцій оригіналу', () => {
    expect(variantWidth(cover(), 'hero')).toBe(2048)
    expect(variantWidth(cover(), 'card')).toBe(960)
    expect(variantWidth(cover({ width: 3000, height: 4000 }), 'hero')).toBe(1536)
  })

  it('не збільшує маленький оригінал', () => {
    expect(variantWidth(cover({ width: 800, height: 450 }), 'hero')).toBe(800)
  })
})

describe('coverSrcset', () => {
  it('описує варіанти за зростанням ширини', () => {
    expect(coverSrcset(cover(), ['card', 'hero'])).toBe(
      'https://cdn.test/objects/1/cover/abc-card.webp 960w, https://cdn.test/objects/1/cover/abc-hero.webp 2048w',
    )
  })

  it('не дублює однакові ширини маленького зображення', () => {
    expect(coverSrcset(cover({ width: 640, height: 360 }), ['card', 'hero'])).toBe(
      'https://cdn.test/objects/1/cover/abc-card.webp 640w',
    )
  })
})

describe('coverPlaceholder', () => {
  it('бере ініціали без лапок і розділових знаків', () => {
    expect(coverPlaceholder('ЖК «Пасаж»').initials).toBe('ЖП')
    expect(coverPlaceholder('   ').initials).toBe('O')
  })

  it('дає обʼєкту сталий колір, а різним обʼєктам — різний', () => {
    expect(coverPlaceholder('ЖК «Пасаж»')).toEqual(coverPlaceholder('жк «пасаж»'))
    expect(coverPlaceholder('ЖК «Пасаж»').background).not.toBe(
      coverPlaceholder('Котеджі «Липки»').background,
    )
  })
})

describe('coverFileProblem', () => {
  it('приймає фото з телефона й звичайні формати', () => {
    for (const type of ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic']) {
      expect(coverFileProblem(file(type))).toBeNull()
    }
  })

  it('відхиляє не зображення й завеликі файли', () => {
    expect(coverFileProblem(file('application/pdf'))).not.toBeNull()
    expect(coverFileProblem(file('image/jpeg', COVER_MAX_BYTES + 1))).not.toBeNull()
  })
})

describe('coverSizeProblem', () => {
  it('не пускає зовсім маленькі зображення', () => {
    expect(coverSizeProblem(120, 120)).not.toBeNull()
    expect(coverSizeProblem(1600, 900)).toBeNull()
  })
})
