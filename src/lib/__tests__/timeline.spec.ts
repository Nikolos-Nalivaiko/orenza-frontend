import { describe, expect, it } from 'vitest'
import { dateDeviation, objectTimeline, type TimelineDates } from '../timeline'

const TODAY = '2026-09-14'

function dates(overrides: Partial<TimelineDates> = {}): TimelineDates {
  return {
    started_at: '2026-09-01',
    finished_at: '2026-09-30',
    actual_started_at: '2026-09-03',
    actual_finished_at: null,
    ...overrides,
  }
}

function figures(input: TimelineDates, today = TODAY): string[] {
  return objectTimeline(input, today).figures.map(
    ({ label, value, unit, hint, tone }) =>
      `${label}: ${value}${unit ? ` ${unit}` : ''} (${hint}) ${tone}`,
  )
}

function shift(day: string, by: number): string {
  const date = new Date(`${day}T12:00:00Z`)

  date.setUTCDate(date.getUTCDate() + by)

  return date.toISOString().slice(0, 10)
}

function numberOf(figure: { value: string } | undefined): number {
  return Number((figure?.value ?? '').replace('−', '-'))
}

describe('objectTimeline: підписи', () => {
  it('у роботі — до здачі, скільки тривають роботи й плановий строк з датами', () => {
    expect(objectTimeline(dates(), TODAY).state).toBe('going')
    expect(figures(dates())).toEqual([
      'До здачі: 16 днів (здача 30 вер.) neutral',
      'Роботи тривають: 12 днів (з 3 вер.) muted',
      'Плановий строк: 30 днів (1–30 вер.) muted',
    ])
  })

  it('за три дні до здачі і в день здачі — попередження', () => {
    expect(figures(dates({ finished_at: '2026-09-16' }))[0]).toBe(
      'До здачі: 2 дні (здача 16 вер.) warn',
    )
    expect(figures(dates({ finished_at: TODAY }))[0]).toBe(
      'Здача за планом: Сьогодні (14 вер.) warn',
    )
  })

  it('прострочка показує, коли мала бути здача', () => {
    expect(
      figures(
        dates({
          started_at: '2026-08-01',
          finished_at: '2026-09-05',
          actual_started_at: '2026-08-04',
        }),
      ),
    ).toEqual([
      'Прострочено: +9 днів (здача була 5 вер.) late',
      'Роботи тривають: 42 дні (з 4 серп.) muted',
      'Плановий строк: 36 днів (1 серп. — 5 вер.) muted',
    ])
    expect(figures(dates({ finished_at: '2026-09-05', actual_started_at: null }))[1]).toBe(
      'Старт: Не почали (планували 1 вер.) muted',
    )
  })

  it('здане порівнює фактичну дату з плановою', () => {
    expect(figures(dates({ actual_finished_at: '2026-09-10', finished_at: '2026-09-12' }))).toEqual(
      [
        'Здано раніше строку: −2 дні (10 вер. замість 12 вер.) good',
        'Фактичний строк: 8 днів (3–10 вер.) muted',
        'Плановий строк: 12 днів (1–12 вер.) muted',
      ],
    )
    expect(figures(dates({ finished_at: '2026-09-08', actual_finished_at: '2026-09-10' }))[0]).toBe(
      'Здано із запізненням: +2 дні (10 вер. замість 8 вер.) late',
    )
    expect(figures(dates({ finished_at: '2026-09-10', actual_finished_at: '2026-09-10' }))[0]).toBe(
      'Здано: Вчасно (10 вер.) good',
    )
  })

  it('до старту і при затримці старту', () => {
    expect(
      figures(
        dates({ started_at: '2026-10-01', finished_at: '2026-12-15', actual_started_at: null }),
      ),
    ).toEqual([
      'До старту: 17 днів (старт 1 жовт.) neutral',
      'Плановий строк: 76 днів (1 жовт. — 15 груд.) muted',
    ])
    expect(figures(dates({ actual_started_at: null }))).toEqual([
      'Затримка старту: 13 днів (старт планували 1 вер.) warn',
      'До здачі: 16 днів (здача 30 вер.) muted',
      'Плановий строк: 30 днів (1–30 вер.) muted',
    ])
    expect(figures(dates({ started_at: TODAY, actual_started_at: null }))[0]).toBe(
      'Старт за планом: Сьогодні (14 вер.) warn',
    )
  })

  it('рік показує лише для дат не з поточного року', () => {
    expect(
      figures(
        dates({ started_at: '2026-12-01', finished_at: '2027-02-10', actual_started_at: null }),
      )[1],
    ).toBe('Плановий строк: 72 дні (1 груд. — 10 лют. 2027) muted')
  })

  it('без плану, з переплутаним планом і без дат — лише підказка', () => {
    const partial = objectTimeline(dates({ started_at: null, finished_at: null }), TODAY)

    expect(partial.note).toBe('Вкажіть плановий строк, щоб звіряти з ним факт')
    expect(figures(dates({ started_at: null, finished_at: null }))).toEqual([
      'Роботи тривають: 12 днів (з 3 вер.) neutral',
    ])

    expect(
      objectTimeline(dates({ started_at: '2026-09-30', finished_at: '2026-09-01' }), TODAY),
    ).toMatchObject({
      state: 'invalid',
      figures: [],
    })

    const empty = objectTimeline(
      { started_at: null, finished_at: null, actual_started_at: null, actual_finished_at: null },
      TODAY,
    )

    expect(empty).toMatchObject({ state: 'empty', figures: [] })
  })

  it('фактичні дати з майбутнього не вважає фактом', () => {
    expect(objectTimeline(dates({ actual_started_at: '2026-09-20' }), TODAY).state).toBe('waiting')
    expect(objectTimeline(dates({ actual_finished_at: '2026-09-20' }), TODAY).state).toBe('going')
  })
})

describe('objectTimeline: арифметика на всіх комбінаціях дат', () => {
  const planStart = '2026-09-01'
  const offsets = [-40, -10, -3, -1, 0, 1, 2, 5, 15, 29, 30, 31, 45]

  function check(label: string, actual: unknown, expected: unknown, problems: string[]): void {
    if (actual !== expected) {
      problems.push(`${label}: отримали ${String(actual)}, чекали ${String(expected)}`)
    }
  }

  it('частини строку сходяться з планом, дедлайном і відхиленнями', () => {
    const problems: string[] = []
    let checked = 0

    for (const planLength of [1, 2, 30]) {
      const planFinish = shift(planStart, planLength - 1)

      for (const todayOffset of offsets) {
        const today = shift(planStart, todayOffset)

        for (const startOffset of [null, -2, 0, 3, 10]) {
          const start = startOffset === null ? null : shift(planStart, startOffset)

          if (start !== null && start > today) {
            continue
          }

          for (const finishOffset of [null, 0, 5, 29, 35]) {
            const finish =
              finishOffset === null || start === null ? null : shift(planStart, finishOffset)

            if (finish !== null && (start === null || finish < start || finish > today)) {
              continue
            }

            const timeline = objectTimeline(
              {
                started_at: planStart,
                finished_at: planFinish,
                actual_started_at: start,
                actual_finished_at: finish,
              },
              today,
            )
            const [key, second, third] = timeline.figures
            const plan = third ?? second
            const where = `план ${planLength} дн., сьогодні ${today}, старт ${start}, здача ${finish}`

            check(`${where} · плановий строк`, numberOf(plan), planLength, problems)

            if (timeline.state === 'going' && key?.value !== 'Сьогодні') {
              const toDeadline = numberOf(key)

              check(`${where} · до здачі`, toDeadline, planLength - 1 - todayOffset, problems)

              if ((startOffset ?? 0) >= 0) {
                check(
                  `${where} · затримка + у роботі + до здачі`,
                  (startOffset ?? 0) + numberOf(second) + toDeadline,
                  planLength,
                  problems,
                )
              }
            }

            if (timeline.state === 'late') {
              check(
                `${where} · прострочка`,
                numberOf(key),
                todayOffset - (planLength - 1),
                problems,
              )
            }

            if (timeline.state === 'done' && finishOffset !== null) {
              const drift = finishOffset - (planLength - 1)
              const expected = drift === 0 ? 'Вчасно' : `${drift > 0 ? '+' : '−'}${Math.abs(drift)}`

              check(`${where} · відхилення здачі`, key?.value, expected, problems)
              check(
                `${where} · фактичний строк`,
                numberOf(second),
                finishOffset - (startOffset ?? 0) + 1,
                problems,
              )
              check(
                `${where} · чип здачі`,
                dateDeviation(planFinish, finish, 'finish')?.days,
                drift,
                problems,
              )
            }

            if (timeline.state === 'upcoming') {
              check(`${where} · до старту`, numberOf(key), -todayOffset, problems)
            }

            if (timeline.state === 'waiting' && key?.value !== 'Сьогодні') {
              check(`${where} · затримка старту`, numberOf(key), todayOffset, problems)
              check(`${where} · до здачі`, numberOf(second), planLength - 1 - todayOffset, problems)
            }

            checked += 1
          }
        }
      }
    }

    expect(problems).toEqual([])
    expect(checked).toBeGreaterThan(150)
  })
})

describe('dateDeviation', () => {
  it('зсув старту нейтральний, зсув здачі — кольоровий', () => {
    expect(dateDeviation('2026-09-01', '2026-09-03', 'start')).toEqual({
      days: 2,
      label: '+2 дні',
      tone: 'neutral',
    })
    expect(dateDeviation('2026-09-30', '2026-10-02', 'finish')?.tone).toBe('late')
    expect(dateDeviation('2026-09-30', '2026-09-25', 'finish')).toEqual({
      days: -5,
      label: '−5 днів',
      tone: 'good',
    })
    expect(dateDeviation('2026-09-30', '2026-09-30', 'finish')?.label).toBe('вчасно')
    expect(dateDeviation('2026-09-30', null, 'finish')).toBeNull()
  })
})
