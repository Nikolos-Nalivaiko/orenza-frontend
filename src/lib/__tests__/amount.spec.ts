import { describe, expect, it } from 'vitest'
import { formatAmount, multiply, parseAmount } from '../amount'

describe('parseAmount', () => {
  it('розуміє кому та пробіли в розрядах', () => {
    expect(parseAmount('1 200,5')).toBe(1200.5)
    expect(parseAmount('12')).toBe(12)
    expect(parseAmount('')).toBeNull()
    expect(parseAmount('   ')).toBeNull()
    expect(parseAmount('дві тонни')).toBeNull()
  })
})

describe('multiply', () => {
  it('множить два введені руками числа', () => {
    expect(multiply('1 200', '12,5')).toBe(15000)
    expect(multiply('10', '')).toBeNull()
    expect(multiply('', '10')).toBeNull()
  })
})

describe('formatAmount', () => {
  it('форматує суму з розрядами й без зайвих нулів', () => {
    // Intl розділяє розряди нерозривним пробілом — у тесті звіряємось зі звичайним.
    const plain = (value: number): string => formatAmount(value).replace(/\u00a0/g, ' ')

    expect(plain(15000)).toBe('15 000')
    expect(plain(1200.5)).toBe('1 200,5')
    expect(plain(0)).toBe('0')
  })
})
