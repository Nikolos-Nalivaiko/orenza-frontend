import { describe, expect, it } from 'vitest'
import { demoDashboard, formatDelta, formatMetric, formatMoney, PERIODS } from '../dashboard'

describe('formatMoney', () => {
  it('скорочує великі суми до млн і тис', () => {
    expect(formatMoney(2_400_000)).toBe('2,4 млн')
    expect(formatMoney(860_000)).toBe('860 тис')
    expect(formatMoney(940)).toBe('940')
  })

  it('тримає знак для відʼємних сум', () => {
    expect(formatMoney(-1_200_000)).toBe('-1,2 млн')
  })
})

describe('formatMetric', () => {
  it('кожен формат подає число по-своєму', () => {
    expect(formatMetric(4.6, 'count')).toBe('5')
    expect(formatMetric(62.4, 'percent')).toBe('62%')
    expect(formatMetric(1_046_000, 'money')).toBe('1,0 млн')
  })
})

describe('formatDelta', () => {
  it('додає знак і прибирає його на нулі', () => {
    expect(formatDelta(12.4)).toBe('+12%')
    expect(formatDelta(-25)).toBe('−25%')
    expect(formatDelta(0.2)).toBe('0%')
  })
})

describe('demoDashboard', () => {
  it('віддає повний набір даних для кожного періоду', () => {
    for (const period of PERIODS) {
      const data = demoDashboard(period.value)

      expect(data.metrics).toHaveLength(4)
      expect(data.costs).toHaveLength(4)
      expect(data.flow.length).toBeGreaterThan(0)
      expect(data.sites.length).toBeGreaterThan(0)
    }
  })

  it('віддає копію — правка задачі не тече в наступний виклик', () => {
    const first = demoDashboard('week')

    first.tasks[0]!.done = true

    expect(demoDashboard('week').tasks[0]?.done).toBe(false)
  })
})
