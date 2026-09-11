import { describe, expect, it } from 'vitest'
import { formatMomentDay, formatMomentTime, momentTime } from '../moment'

const TODAY = '2026-09-02'

describe('момент часу', () => {
  it('дата без часу лягає на полудень UTC — доба не зʼїжджає', () => {
    expect(momentTime('2026-09-15')).toBe(Date.parse('2026-09-15T12:00:00Z'))
  })

  it('нерозбірлива мітка не ламає сортування', () => {
    expect(momentTime('колись')).toBe(0)
  })

  it('поточний рік показуємо без року, інший — з роком', () => {
    expect(formatMomentDay('2026-09-15', TODAY)).toBe('15.09')
    expect(formatMomentDay('2025-09-15', TODAY)).toBe('15.09.2025')
  })

  it('нерозбірливу дату показуємо порожнім рядком', () => {
    expect(formatMomentDay('колись', TODAY)).toBe('')
  })

  it('час показуємо лише там, де його фіксували', () => {
    expect(formatMomentTime('2026-09-15')).toBe('')
    expect(formatMomentTime('2026-09-15T14:20:00')).toBe('14:20')
  })
})
