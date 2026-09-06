import { describe, expect, it } from 'vitest'
import {
  buildCalendar,
  buildEvents,
  buildSchedule,
  countKinds,
  defaultScheduleFilters,
  formatWhen,
  groupByWeek,
  isDefaultScheduleFilters,
  monthOf,
  objectEvents,
  objectsOf,
  rangeEnd,
  shiftDays,
  shiftMonth,
  weekStart,
  type ScheduleFilters,
} from '../schedule'
import { OBJECT_STATUS_LABELS, type ConstructionObject, type ObjectStatus } from '../objects'
import { PAYMENT_STATUS_LABELS, type Payment, type PaymentStatus } from '../finance'

/** Середа — щоб було видно, як тиждень збирається на понеділок. */
const TODAY = '2026-09-02'

function payment(overrides: Partial<Payment> = {}): Payment {
  const status: PaymentStatus = overrides.status?.value ?? 'pending'

  return {
    id: 1,
    name: 'Транш за вересень',
    description: null,
    amount: 100_000,
    paid_at: '2026-09-10',
    client_visible: false,
    ...overrides,
    status: { value: status, label: PAYMENT_STATUS_LABELS[status] },
  }
}

function object(overrides: Partial<ConstructionObject> = {}): ConstructionObject {
  const status: ObjectStatus = overrides.status?.value ?? 'in_progress'

  return {
    id: 1,
    workspace_id: 1,
    name: 'ЖК «Пасаж»',
    description: null,
    address: 'вул. Стеценка, 12',
    client: null,
    started_at: '2026-09-05',
    finished_at: '2026-09-20',
    actual_started_at: null,
    actual_finished_at: null,
    cover: null,
    materials: [],
    services: [],
    discount_percent: null,
    discount_amount: null,
    payments: [],
    public_token: 'token',
    archived_at: null,
    created_at: '2026-08-01T09:00:00.000Z',
    ...overrides,
    status: { value: status, label: OBJECT_STATUS_LABELS[status] },
  }
}

describe('objectEvents', () => {
  it('бере планові дати та очікувані платежі', () => {
    const events = objectEvents(object({ payments: [payment()] }), TODAY)

    expect(events.map((event) => event.kind)).toEqual(['start', 'finish', 'payment'])
    expect(events.map((event) => event.date)).toEqual(['2026-09-05', '2026-09-20', '2026-09-10'])
    expect(events[2]?.amount).toBe(100_000)
  })

  it('прибирає початок, щойно на обʼєкт вийшли', () => {
    const events = objectEvents(object({ actual_started_at: '2026-09-01' }), TODAY)

    expect(events.map((event) => event.kind)).toEqual(['finish'])
  })

  it('завершений і архівний обʼєкти в графік не потрапляють', () => {
    const done = object({ status: { value: 'done', label: '' }, actual_finished_at: '2026-09-01' })

    expect(objectEvents(done, TODAY)).toEqual([])
    expect(objectEvents(object({ archived_at: '2026-09-01T10:00:00.000Z' }), TODAY)).toEqual([])
  })

  it('оплачений і скасований платежі — це вже не подія', () => {
    const payments = [
      payment({ id: 1, status: { value: 'paid', label: '' }, paid_at: '2026-09-10' }),
      payment({ id: 2, status: { value: 'cancelled', label: '' } }),
      payment({ id: 3, status: { value: 'overdue', label: '' }, paid_at: '2026-08-20' }),
    ]

    const events = objectEvents(object({ payments }), TODAY).filter(
      (event) => event.kind === 'payment',
    )

    expect(events).toHaveLength(1)
    expect(events[0]?.date).toBe('2026-08-20')
  })

  it('платіж без дати нікуди покласти', () => {
    const events = objectEvents(object({ payments: [payment({ paid_at: null })] }), TODAY)

    expect(events.some((event) => event.kind === 'payment')).toBe(false)
  })

  it('минулий день без факту — прострочення', () => {
    const events = objectEvents(object({ started_at: '2026-08-28' }), TODAY)

    expect(events[0]?.overdue).toBe(true)
    expect(events[0]?.daysLeft).toBe(-5)
  })
})

describe('buildEvents', () => {
  it('складає події всіх обʼєктів у хронологію', () => {
    const events = buildEvents(
      [
        object({ id: 1, name: 'Б', started_at: '2026-09-10', finished_at: null }),
        object({ id: 2, name: 'А', started_at: '2026-09-05', finished_at: '2026-09-10' }),
      ],
      TODAY,
    )

    expect(events.map((event) => [event.date, event.kind])).toEqual([
      ['2026-09-05', 'start'],
      ['2026-09-10', 'start'],
      ['2026-09-10', 'finish'],
    ])
  })
})

describe('buildSchedule', () => {
  const events = buildEvents(
    [
      object({ id: 1, started_at: '2026-08-20', finished_at: '2026-09-20' }),
      object({
        id: 2,
        name: 'Липки',
        started_at: null,
        finished_at: '2026-12-01',
        payments: [payment({ id: 7, amount: 50_000, paid_at: '2026-09-08' })],
      }),
    ],
    TODAY,
  )

  it('прострочене лишається поза періодом', () => {
    const schedule = buildSchedule(events, defaultScheduleFilters(), TODAY)

    expect(schedule.overdue.map((event) => event.date)).toEqual(['2026-08-20'])
    expect(schedule.upcoming.map((event) => event.date)).toEqual(['2026-09-08', '2026-09-20'])
  })

  it('період відрізає дальні події', () => {
    const filters: ScheduleFilters = { ...defaultScheduleFilters(), range: '2w' }

    expect(buildSchedule(events, filters, TODAY).upcoming.map((event) => event.date)).toEqual([
      '2026-09-08',
    ])
  })

  it('«увесь графік» не відрізає нічого', () => {
    const filters: ScheduleFilters = { ...defaultScheduleFilters(), range: 'all' }

    expect(buildSchedule(events, filters, TODAY).upcoming).toHaveLength(3)
  })

  it('фільтри по обʼєкту й типу звужують обидва списки', () => {
    const filters: ScheduleFilters = { objectId: 2, kinds: ['payment'], range: 'all' }
    const schedule = buildSchedule(events, filters, TODAY)

    expect(schedule.overdue).toEqual([])
    expect(schedule.upcoming).toHaveLength(1)
    expect(schedule.expected).toBe(50_000)
  })

  it('рахує гроші, яких чекають у періоді', () => {
    const schedule = buildSchedule(events, defaultScheduleFilters(), TODAY)

    expect(schedule.expected).toBe(50_000)
    expect(schedule.overdueAmount).toBe(0)
  })
})

describe('groupByWeek', () => {
  it('складає події в дні, дні — у тижні', () => {
    const events = buildEvents(
      [
        object({ id: 1, started_at: '2026-09-03', finished_at: '2026-09-03' }),
        object({ id: 2, name: 'Липки', started_at: '2026-09-08', finished_at: null }),
      ],
      TODAY,
    )

    const weeks = groupByWeek(events, TODAY)

    expect(weeks).toHaveLength(2)
    expect(weeks[0]?.label).toBe('Цього тижня')
    expect(weeks[0]?.start).toBe('2026-08-31')
    expect(weeks[0]?.days).toHaveLength(1)
    expect(weeks[0]?.days[0]?.events).toHaveLength(2)
    expect(weeks[0]?.count).toBe(2)
    expect(weeks[1]?.label).toBe('Наступного тижня')
  })

  it('позначає сьогодні й завтра', () => {
    const events = buildEvents(
      [
        object({ id: 1, started_at: TODAY, finished_at: '2026-09-03' }),
        object({ id: 2, name: 'Липки', started_at: '2026-09-30', finished_at: null }),
      ],
      TODAY,
    )

    const days = groupByWeek(events, TODAY).flatMap((week) => week.days)

    expect(days.map((day) => day.relative)).toEqual(['Сьогодні', 'Завтра', ''])
  })
})

describe('дати', () => {
  it('shiftDays переходить через межу місяця', () => {
    expect(shiftDays('2026-08-31', 1)).toBe('2026-09-01')
    expect(shiftDays('2026-09-01', -1)).toBe('2026-08-31')
  })

  it('тиждень починається з понеділка', () => {
    expect(weekStart('2026-09-02')).toBe('2026-08-31')
    expect(weekStart('2026-08-31')).toBe('2026-08-31')
    expect(weekStart('2026-09-06')).toBe('2026-08-31')
  })

  it('rangeEnd рахує кінець періоду', () => {
    expect(rangeEnd(TODAY, '2w')).toBe('2026-09-16')
    expect(rangeEnd(TODAY, 'all')).toBeNull()
  })

  it('shiftMonth переходить через межу року', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
  })

  it('formatWhen читається людиною', () => {
    expect(formatWhen(0)).toBe('Сьогодні')
    expect(formatWhen(1)).toBe('Завтра')
    expect(formatWhen(5)).toBe('Через 5 днів')
    expect(formatWhen(-3)).toBe('Прострочено 3 дні')
  })
})

describe('buildCalendar', () => {
  const events = buildEvents([object({ started_at: '2026-09-05', finished_at: null })], TODAY)
  const month = buildCalendar('2026-09', events, TODAY)

  it('сітка починається з понеділка і накриває весь місяць', () => {
    expect(month.weeks[0]?.[0]?.date).toBe('2026-08-31')
    expect(month.weeks[month.weeks.length - 1]?.[6]?.date).toBe('2026-10-04')
    expect(month.weeks.every((week) => week.length === 7)).toBe(true)
  })

  it('відрізняє свої дні від чужих і знає сьогодні', () => {
    const days = month.weeks.flat()

    expect(days.find((day) => day.date === '2026-08-31')?.inMonth).toBe(false)
    expect(days.find((day) => day.date === TODAY)?.isToday).toBe(true)
    expect(days.find((day) => day.date === '2026-09-05')?.events).toHaveLength(1)
  })

  it('monthOf бере місяць дати', () => {
    expect(monthOf('2026-09-05')).toBe('2026-09')
  })
})

describe('фільтри', () => {
  const events = buildEvents(
    [object({ id: 1, payments: [payment()] }), object({ id: 2, name: 'Липки', started_at: null })],
    TODAY,
  )

  it('рахує події за типом', () => {
    expect(countKinds(events, null)).toEqual({ start: 1, finish: 2, payment: 1 })
    expect(countKinds(events, 2)).toEqual({ start: 0, finish: 1, payment: 0 })
  })

  it('пропонує лише обʼєкти з подіями', () => {
    expect(objectsOf(events)).toEqual([
      { id: 1, name: 'ЖК «Пасаж»', count: 3 },
      { id: 2, name: 'Липки', count: 1 },
    ])
  })

  it('знає, коли фільтри за замовчуванням', () => {
    expect(isDefaultScheduleFilters(defaultScheduleFilters())).toBe(true)
    expect(isDefaultScheduleFilters({ ...defaultScheduleFilters(), objectId: 1 })).toBe(false)
  })
})
