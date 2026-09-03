import { describe, expect, it } from 'vitest'
import {
  buildObjectRows,
  clientsOf,
  countArchived,
  countByStatus,
  defaultObjectFilters,
  formatDeadline,
  isDefaultFilters,
  matchesQuery,
  objectSummary,
  readiness,
  servicesDone,
  type ObjectFilters,
} from '../objectList'
import { OBJECT_STATUS_LABELS, type Client, type ConstructionObject } from '../objects'
import type { Material } from '../materials'
import type { Service } from '../services'
import type { Payment } from '../finance'

const TODAY = '2026-09-02'

const CLIENT: Client = {
  id: 1,
  name: 'ТОВ «Мегабуд»',
  contact: 'Ірина Ковальчук',
  phone: '',
  discount: 5,
}

function material(overrides: Partial<Material> = {}): Material {
  return {
    id: 1,
    name: 'Бетон',
    unit: 'м³',
    quantity: 100,
    buyer: { value: 'contractor', label: 'Підрядник' },
    cost_price: 3000,
    client_price: 3600,
    status: { value: 'delivered', label: 'Доставлено' },
    approved_by_client: true,
    ...overrides,
  }
}

function service(overrides: Partial<Service> = {}): Service {
  return {
    id: 1,
    name: 'Монолітні роботи',
    description: null,
    unit: 'м³',
    planned_volume: 100,
    actual_volume: null,
    client_price: 1000,
    status: { value: 'in_progress', label: 'В роботі' },
    workers: [{ employee_id: 1, volume: 100, rate: 400 }],
    ...overrides,
  }
}

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 1,
    name: 'Аванс',
    description: null,
    amount: 100_000,
    status: { value: 'paid', label: 'Оплачено' },
    paid_at: '2026-08-01',
    ...overrides,
  }
}

function makeObject(overrides: Partial<ConstructionObject> = {}): ConstructionObject {
  return {
    id: 1,
    workspace_id: 1,
    name: 'ЖК «Пасаж»',
    description: null,
    address: 'вул. Стеценка, 12 · Київ',
    client: CLIENT,
    status: { value: 'in_progress', label: OBJECT_STATUS_LABELS.in_progress },
    started_at: '2026-06-01',
    finished_at: '2026-10-14',
    actual_started_at: '2026-06-08',
    actual_finished_at: null,
    cover: null,
    materials: [material()],
    services: [service()],
    discount_percent: null,
    discount_amount: null,
    payments: [payment()],
    archived_at: null,
    created_at: '2026-06-01T09:00:00.000Z',
    ...overrides,
  }
}

function filters(overrides: Partial<ObjectFilters> = {}): ObjectFilters {
  return { ...defaultObjectFilters(), ...overrides }
}

describe('objectSummary', () => {
  it('складає суму для клієнта з матеріалів і робіт', () => {
    const summary = objectSummary(makeObject(), TODAY)

    expect(summary.client).toBe(100 * 3600 + 100 * 1000)
    expect(summary.paid).toBe(100_000)
    expect(summary.due).toBe(460_000 - 100_000)
  })

  it('віднімає знижку — відсотком або сумою', () => {
    expect(objectSummary(makeObject({ discount_percent: 5 }), TODAY).client).toBe(460_000 * 0.95)
    expect(objectSummary(makeObject({ discount_amount: 60_000 }), TODAY).client).toBe(400_000)
  })

  it('матеріали замовника не потрапляють у суму для клієнта', () => {
    const summary = objectSummary(
      makeObject({
        materials: [material({ buyer: { value: 'client', label: 'Замовник' } })],
        services: [],
      }),
      TODAY,
    )

    expect(summary.client).toBe(0)
    expect(summary.progress).toBe(0)
  })

  it('собівартість збирає закупівлю матеріалів і зарплату виконавців', () => {
    const summary = objectSummary(makeObject(), TODAY)

    // 100 × 3000 закупівлі + 100 × 400 зарплати.
    expect(summary.cost).toBe(340_000)
    expect(summary.profit).toBe(460_000 - 340_000)
  })

  it('матеріали замовника нам нічого не коштують', () => {
    const summary = objectSummary(
      makeObject({
        materials: [material({ buyer: { value: 'client', label: 'Замовник' } })],
        services: [],
      }),
      TODAY,
    )

    expect(summary.cost).toBe(0)
  })

  it('оплата рахується лише за платежами зі статусом «оплачено»', () => {
    const summary = objectSummary(
      makeObject({
        payments: [
          payment({ id: 1, amount: 230_000 }),
          payment({ id: 2, amount: 90_000, status: { value: 'pending', label: 'В очікуванні' } }),
        ],
      }),
      TODAY,
    )

    expect(summary.paid).toBe(230_000)
    expect(summary.progress).toBe(0.5)
  })

  it('прострочення рахує лише для незавершених обʼєктів', () => {
    const late = objectSummary(makeObject({ finished_at: '2026-08-28' }), TODAY)

    expect(late.daysLeft).toBe(-5)
    expect(late.overdue).toBe(true)

    const closed = makeObject({
      finished_at: '2026-08-28',
      status: { value: 'done', label: OBJECT_STATUS_LABELS.done },
    })

    expect(objectSummary(closed, TODAY).overdue).toBe(false)
    expect(objectSummary(makeObject({ finished_at: null }), TODAY).daysLeft).toBeNull()
  })
})

describe('readiness', () => {
  it('рахує частку виконаного обсягу робіт', () => {
    expect(readiness(makeObject({ services: [service({ actual_volume: 25 })] }))).toBe(0.25)
  })

  it('виконана робота без фактичного обсягу вважається виконаною повністю', () => {
    const done = service({ status: { value: 'done', label: 'Виконано' } })

    expect(readiness(makeObject({ services: [done] }))).toBe(1)
  })

  it('рахує, скільки робіт уже закрито', () => {
    const object = makeObject({
      services: [
        service({ id: 1, status: { value: 'done', label: 'Виконано' } }),
        service({ id: 2, actual_volume: 100 }),
        service({ id: 3, actual_volume: 40 }),
      ],
    })

    expect(servicesDone(object)).toEqual({ done: 2, total: 3 })
    expect(servicesDone(makeObject({ services: [] }))).toEqual({ done: 0, total: 0 })
  })

  it('завершений обʼєкт — завжди сто відсотків, без робіт — нічого', () => {
    const closed = makeObject({
      services: [],
      status: { value: 'done', label: OBJECT_STATUS_LABELS.done },
    })

    expect(readiness(closed)).toBe(1)
    expect(readiness(makeObject({ services: [] }))).toBeNull()
  })
})

describe('фільтри', () => {
  it('за замовчуванням ховають завершені та призупинені', () => {
    const base = defaultObjectFilters()

    expect(isDefaultFilters(base)).toBe(true)
    expect(base.statuses).toEqual(['planned', 'in_progress'])

    const items = [
      makeObject({ id: 1 }),
      makeObject({ id: 2, status: { value: 'done', label: OBJECT_STATUS_LABELS.done } }),
    ]

    expect(buildObjectRows(items, base, TODAY).map((row) => row.object.id)).toEqual([1])
  })

  it('порожній список статусів показує всі', () => {
    const items = [
      makeObject({ id: 1 }),
      makeObject({ id: 2, status: { value: 'done', label: OBJECT_STATUS_LABELS.done } }),
    ]

    expect(buildObjectRows(items, filters({ statuses: [] }), TODAY)).toHaveLength(2)
  })

  it('архів живе окремо від живих обʼєктів', () => {
    const items = [
      makeObject({ id: 1 }),
      makeObject({ id: 2, archived_at: '2026-09-01T10:00:00Z' }),
    ]

    expect(buildObjectRows(items, filters(), TODAY).map((row) => row.object.id)).toEqual([1])
    expect(
      buildObjectRows(items, filters({ archived: true }), TODAY).map((r) => r.object.id),
    ).toEqual([2])
    expect(isDefaultFilters(filters({ archived: true }))).toBe(false)
    expect(countArchived(items)).toBe(1)
    expect(countByStatus(items).in_progress).toBe(1)
  })

  it('пошук іде по назві, адресі та замовнику одночасно', () => {
    const object = makeObject()

    expect(matchesQuery(object, 'пасаж')).toBe(true)
    expect(matchesQuery(object, 'стеценка')).toBe(true)
    expect(matchesQuery(object, 'мегабуд')).toBe(true)
    expect(matchesQuery(object, 'львів')).toBe(false)
    expect(matchesQuery(object, '  ')).toBe(true)
  })

  it('фільтр замовника й тумблер прострочених звужують список', () => {
    const items = [
      makeObject({ id: 1, finished_at: '2026-08-01' }),
      makeObject({ id: 2, client: null }),
    ]

    expect(buildObjectRows(items, filters({ clientId: 1 }), TODAY).map((r) => r.object.id)).toEqual(
      [1],
    )
    expect(
      buildObjectRows(items, filters({ overdueOnly: true }), TODAY).map((r) => r.object.id),
    ).toEqual([1])
  })
})

describe('сортування', () => {
  const items = [
    makeObject({ id: 1, created_at: '2026-01-01T00:00:00.000Z', finished_at: '2026-12-01' }),
    makeObject({ id: 2, created_at: '2026-05-01T00:00:00.000Z', finished_at: null }),
    makeObject({ id: 3, created_at: '2026-03-01T00:00:00.000Z', finished_at: '2026-09-10' }),
  ]

  it('за замовчуванням — нові зверху', () => {
    expect(buildObjectRows(items, filters(), TODAY).map((row) => row.object.id)).toEqual([2, 3, 1])
  })

  it('за дедлайном — найближчий зверху, без дати в кінці', () => {
    const rows = buildObjectRows(items, filters({ sort: 'deadline' }), TODAY)

    expect(rows.map((row) => row.object.id)).toEqual([3, 1, 2])
  })
})

describe('довідники списку', () => {
  it('рахує обʼєкти по статусах', () => {
    const counts = countByStatus([
      makeObject({ id: 1 }),
      makeObject({ id: 2, status: { value: 'done', label: OBJECT_STATUS_LABELS.done } }),
    ])

    expect(counts).toEqual({ planned: 0, in_progress: 1, paused: 0, done: 1 })
  })

  it('віддає лише тих замовників, у яких є обʼєкти, і рахує ці обʼєкти', () => {
    const items = [
      makeObject({ id: 1 }),
      makeObject({ id: 2 }),
      makeObject({ id: 3, client: null }),
    ]

    expect(clientsOf(items)).toEqual([{ id: 1, name: 'ТОВ «Мегабуд»', count: 2 }])
  })
})

describe('formatDeadline', () => {
  it('говорить про строк людською мовою', () => {
    expect(formatDeadline(null, false)).toBe('Без дедлайну')
    expect(formatDeadline(0, false)).toBe('Сьогодні')
    expect(formatDeadline(3, false)).toBe('Через 3 дні')
    expect(formatDeadline(-5, true)).toBe('Прострочено 5 днів')
    expect(formatDeadline(-2, false)).toBe('Завершено із запізненням 2 дні')
  })
})
