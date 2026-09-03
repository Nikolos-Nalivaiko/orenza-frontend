import { describe, expect, it } from 'vitest'
import { trackObject } from '../track'
import { OBJECT_STATUS_LABELS, type ConstructionObject } from '../objects'
import type { Material } from '../materials'
import type { Service } from '../services'
import type { Payment } from '../finance'

const TODAY = '2026-09-02'

function material(overrides: Partial<Material> = {}): Material {
  return {
    id: 1,
    name: 'Бетон В25',
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
    workers: [{ employee_id: 7, volume: 100, rate: 400 }],
    ...overrides,
  }
}

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 1,
    name: 'Аванс за етап',
    description: null,
    amount: 100_000,
    status: { value: 'paid', label: 'Оплачено' },
    paid_at: '2026-08-01',
    client_visible: true,
    ...overrides,
  }
}

function makeObject(overrides: Partial<ConstructionObject> = {}): ConstructionObject {
  return {
    id: 1,
    workspace_id: 1,
    name: 'ЖК «Пасаж»',
    description: 'Монолітний каркас',
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
    public_token: 'test-token',
    archived_at: null,
    created_at: '2026-06-01T09:00:00.000Z',
    ...overrides,
  }
}

describe('trackObject', () => {
  it('віддає матеріали без грошей і без того, хто їх купує', () => {
    const [row] = trackObject(makeObject(), TODAY).materials

    expect(row).toEqual({
      id: 1,
      name: 'Бетон В25',
      quantity: 100,
      unit: 'м³',
      status: { value: 'delivered', label: 'Доставлено' },
    })
  })

  it('віддає роботи із сумою для клієнта, але без виконавців і ЗП', () => {
    const [row] = trackObject(makeObject(), TODAY).services

    expect(row?.total).toBe(100 * 1000)
    expect(JSON.stringify(row)).not.toContain('employee')
    expect(JSON.stringify(row)).not.toContain('400')
  })

  it('сума за договором іде за мінусом знижки, собівартості й профіту немає', () => {
    const money = trackObject(makeObject({ discount_percent: 10 }), TODAY).money

    // 100 × 3600 + 100 × 1000 = 460 000, мінус 10%
    expect(money.client).toBe(414_000)
    expect(money.paid).toBe(100_000)
    expect(money.due).toBe(314_000)
    expect(money.state).toBe('partial')
    expect(Object.keys(money)).toEqual(['client', 'paid', 'due', 'progress', 'state'])
  })

  it('коментар платежу показуємо лише той, який дозволили показати', () => {
    const rows = trackObject(
      makeObject({
        payments: [
          payment(),
          payment({ id: 2, name: 'Спитати бухгалтера', client_visible: false }),
        ],
      }),
      TODAY,
    ).payments

    expect(rows.map((row) => row.note)).toEqual(['Аванс за етап', null])
  })

  it('скасований платіж на сторінку не потрапляє', () => {
    const rows = trackObject(
      makeObject({
        payments: [
          payment(),
          payment({
            id: 2,
            status: { value: 'cancelled', label: 'Скасовано' },
          }),
        ],
      }),
      TODAY,
    ).payments

    expect(rows).toHaveLength(1)
  })

  it('фактичні дати ховає, поки обʼєкт не завершено', () => {
    const going = trackObject(makeObject(), TODAY)

    expect(going.finished).toBe(false)
    expect(going.actualStart).toBeNull()
    expect(going.actualFinish).toBeNull()
    expect(going.plannedStart).toBe('2026-06-01')

    const done = trackObject(
      makeObject({
        status: { value: 'done', label: OBJECT_STATUS_LABELS.done },
        actual_finished_at: '2026-10-02',
      }),
      TODAY,
    )

    expect(done.finished).toBe(true)
    expect(done.actualStart).toBe('2026-06-08')
    expect(done.actualFinish).toBe('2026-10-02')
  })

  it('готовність рахується з робіт, як і в картці', () => {
    const view = trackObject(
      makeObject({
        services: [
          service({ actual_volume: 100, status: { value: 'done', label: 'Виконано' } }),
          service({ id: 2, planned_volume: 100 }),
        ],
      }),
      TODAY,
    )

    expect(view.readiness).toBe(0.5)
    expect(view.works).toEqual({ done: 1, total: 2 })
  })
})
