import { describe, expect, it } from 'vitest'
import {
  derivedActivity,
  formatMomentDay,
  formatMomentTime,
  momentTime,
  objectActivity,
  photoActivity,
  transition,
  type ActivityRecord,
} from '../activity'
import { formatAmount } from '../amount'
import { OBJECT_STATUS_LABELS, type ConstructionObject } from '../objects'
import type { ObjectPhoto } from '../photos'
import type { Material } from '../materials'
import type { Service } from '../services'
import type { Payment } from '../finance'

const TODAY = '2026-09-02'

function material(overrides: Partial<Material> = {}): Material {
  return {
    id: 1,
    name: 'Цемент М-500',
    unit: 'меш',
    quantity: 50,
    buyer: { value: 'contractor', label: 'Підрядник' },
    cost_price: 200,
    client_price: 240,
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
    planned_volume: 320,
    actual_volume: null,
    client_price: 1450,
    status: { value: 'in_progress', label: 'В роботі' },
    workers: [],
    ...overrides,
  }
}

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 1,
    name: 'Аванс',
    description: null,
    amount: 50_000,
    status: { value: 'paid', label: 'Оплачено' },
    paid_at: '2026-06-12',
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
    client: null,
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

function photo(overrides: Partial<ObjectPhoto> = {}): ObjectPhoto {
  return {
    id: 1,
    object_id: 1,
    src: 'data:image/jpeg;base64,aa',
    name: 'IMG_1.jpg',
    at: '2026-08-20T10:15:00.000Z',
    ...overrides,
  }
}

describe('час події', () => {
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

  it('час показуємо лише там, де його фіксували', () => {
    expect(formatMomentTime('2026-09-15')).toBe('')
    expect(formatMomentTime('2026-09-15T14:20:00')).toBe('14:20')
  })

  it('порожнє значення в переході показуємо прочерком', () => {
    expect(transition('', '15.09')).toBe('— → 15.09')
    expect(transition('В роботі', 'Завершено')).toBe('В роботі → Завершено')
  })
})

describe('derivedActivity', () => {
  it('матеріали й роботи стають подіями дня створення', () => {
    const entries = derivedActivity(makeObject())

    const materialEntry = entries.find((entry) => entry.kind === 'material')
    const serviceEntry = entries.find((entry) => entry.kind === 'service')

    expect(materialEntry?.detail).toBe('Цемент М-500, 50 меш')
    expect(materialEntry?.at).toBe('2026-06-01T09:00:00.000Z')
    expect(serviceEntry?.detail).toBe('Монолітні роботи, 320 м³')
  })

  it('у стрічку йдуть тільки проведені платежі', () => {
    const entries = derivedActivity(
      makeObject({
        payments: [
          payment(),
          payment({ id: 2, status: { value: 'pending', label: 'В очікуванні' } }),
        ],
      }),
    )

    const payments = entries.filter((entry) => entry.kind === 'payment')

    expect(payments).toHaveLength(1)
    expect(payments[0]?.detail).toBe(`Аванс — ${formatAmount(50_000)} ₴`)
  })

  it('фактичні дати самі стають подіями', () => {
    const entries = derivedActivity(makeObject({ actual_finished_at: '2026-08-21' }))
    const stages = entries.filter((entry) => entry.kind === 'stage').map((entry) => entry.at)

    expect(stages).toContain('2026-06-08')
    expect(stages).toContain('2026-08-21')
  })

  it('обʼєкт без дати створення не вигадує собі історію', () => {
    const entries = derivedActivity(makeObject({ created_at: null }))

    expect(entries.some((entry) => entry.kind === 'material')).toBe(false)
    expect(entries.some((entry) => entry.id === 'created')).toBe(false)
  })
})

describe('photoActivity', () => {
  it('знімки одного заходу склеюються в один запис', () => {
    const entries = photoActivity([
      photo(),
      photo({ id: 2, name: 'IMG_2.jpg' }),
      photo({ id: 3, name: 'IMG_3.jpg', at: '2026-08-22T08:00:00.000Z' }),
    ])

    expect(entries).toHaveLength(2)
    expect(entries[0]?.detail).toBe('2 знімки')
    expect(entries[1]?.detail).toBe('IMG_3.jpg')
  })
})

describe('objectActivity', () => {
  const record: ActivityRecord = {
    id: 7,
    object_id: 1,
    kind: 'status',
    text: 'Змінено статус',
    detail: 'Планується → В роботі',
    at: '2026-09-01T10:00:00.000Z',
  }

  it('складає всі джерела в одну хронологію, свіже спочатку', () => {
    const entries = objectActivity(makeObject(), [record], [photo()])
    const times = entries.map((entry) => momentTime(entry.at))

    expect(entries[0]?.text).toBe('Змінено статус')
    expect(entries[entries.length - 1]?.text).toBe('Обʼєкт створено')
    expect([...times].sort((left, right) => right - left)).toEqual(times)
  })

  it('прибрати можна лише ручну нотатку', () => {
    const note: ActivityRecord = { ...record, id: 8, kind: 'note', text: 'Замовник просив паузу' }
    const entries = objectActivity(makeObject(), [record, note], [])

    expect(entries.find((entry) => entry.text === 'Замовник просив паузу')?.recordId).toBe(8)
    expect(entries.find((entry) => entry.text === 'Змінено статус')?.recordId).toBeNull()
  })
})
