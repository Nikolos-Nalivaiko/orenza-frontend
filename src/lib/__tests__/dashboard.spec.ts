import { describe, expect, it } from 'vitest'
import {
  crewAccrued,
  dashboardEvents,
  dashboardKpis,
  dashboardTotals,
  formatObjects,
  payableObjects,
  portfolio,
} from '../dashboard'
import { OBJECT_STATUS_LABELS, type ConstructionObject, type ObjectStatus } from '../objects'
import { PAYMENT_STATUS_LABELS, type Payment, type PaymentStatus } from '../finance'
import type { Service } from '../services'

const TODAY = '2026-09-02'

/** Роботи на 100 000 ₴ замовнику й 40 000 ₴ собівартості. */
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
  const status: PaymentStatus = overrides.status?.value ?? 'paid'

  return {
    id: 1,
    name: 'Аванс',
    description: null,
    amount: 30_000,
    paid_at: '2026-08-20',
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
    started_at: '2026-08-01',
    finished_at: '2026-09-20',
    actual_started_at: '2026-08-05',
    actual_finished_at: null,
    cover: null,
    materials: [],
    services: [service()],
    discount_percent: null,
    discount_amount: null,
    payments: [payment()],
    public_token: 'token',
    archived_at: null,
    created_at: '2026-07-20T09:00:00.000Z',
    ...overrides,
    status: { value: status, label: OBJECT_STATUS_LABELS[status] },
  }
}

describe('dashboardTotals', () => {
  it('зводить гроші по обʼєктах', () => {
    const totals = dashboardTotals([object()], TODAY)

    expect(totals).toEqual({
      running: 100_000,
      profit: 60_000,
      paid: 30_000,
      due: 70_000,
      active: 1,
      total: 1,
    })
  })

  it('«в роботі» рахує лише активні обʼєкти, профіт — усі', () => {
    const done = object({ id: 2, status: { value: 'done', label: '' } })
    const totals = dashboardTotals([object(), done], TODAY)

    expect(totals.running).toBe(100_000)
    expect(totals.active).toBe(1)
    expect(totals.total).toBe(2)
    expect(totals.profit).toBe(120_000)
  })

  it('архів у зведення не входить', () => {
    const archived = object({ id: 2, archived_at: '2026-08-30T10:00:00.000Z' })
    const totals = dashboardTotals([object(), archived], TODAY)

    expect(totals.total).toBe(1)
    expect(totals.paid).toBe(30_000)
  })

  it('порожній простір дає нулі, а не порожнечу', () => {
    expect(dashboardTotals([], TODAY)).toEqual({
      running: 0,
      profit: 0,
      paid: 0,
      due: 0,
      active: 0,
      total: 0,
    })
  })
})

describe('crewAccrued', () => {
  it('підсумовує бригади всіх робіт', () => {
    const second = object({
      id: 2,
      services: [service({ workers: [{ employee_id: 2, volume: 50, rate: 300 }] })],
    })

    expect(crewAccrued([object(), second])).toBe(55_000)
  })

  it('архівний обʼєкт більше нікому не винен', () => {
    expect(crewAccrued([object({ archived_at: '2026-08-30T10:00:00.000Z' })])).toBe(0)
  })
})

describe('dashboardKpis', () => {
  const totals = dashboardTotals([object()], TODAY)

  it('в особистому просторі — чотири цифри', () => {
    expect(dashboardKpis(totals, null).map((kpi) => kpi.key)).toEqual([
      'running',
      'profit',
      'paid',
      'due',
    ])
  })

  it('у компанії додається зарплатна', () => {
    const kpis = dashboardKpis(totals, 55_000)

    expect(kpis).toHaveLength(5)
    expect(kpis[4]?.key).toBe('crew')
    expect(kpis[4]?.value).toBe(55_000)
  })

  it('збиток і борг підсвічуються, безборговий залишок — ні', () => {
    const loss = dashboardKpis({ ...totals, profit: -10_000, due: 0 }, null)

    expect(loss[1]?.tone).toBe('danger')
    expect(loss[3]?.tone).toBe('plain')
    expect(dashboardKpis(totals, null)[3]?.tone).toBe('danger')
  })
})

describe('formatObjects', () => {
  it('узгоджує число з іменником', () => {
    expect(formatObjects(1)).toBe('1 обʼєкт')
    expect(formatObjects(3)).toBe('3 обʼєкти')
    expect(formatObjects(11)).toBe('11 обʼєктів')
  })
})

describe('portfolio', () => {
  it('прострочені зверху, далі за близькістю дедлайну', () => {
    const rows = portfolio(
      [
        object({ id: 1, name: 'Далекий', finished_at: '2026-12-01' }),
        object({ id: 2, name: 'Прострочений', finished_at: '2026-08-20' }),
        object({ id: 3, name: 'Близький', finished_at: '2026-09-10' }),
      ],
      TODAY,
    )

    expect(rows.map((row) => row.object.name)).toEqual(['Прострочений', 'Близький', 'Далекий'])
  })

  it('обʼєкт без дедлайну йде в кінець', () => {
    const rows = portfolio(
      [
        object({ id: 1, name: 'Без дати', finished_at: null }),
        object({ id: 2, name: 'З датою', finished_at: '2026-12-01' }),
      ],
      TODAY,
    )

    expect(rows.map((row) => row.object.name)).toEqual(['З датою', 'Без дати'])
  })

  it('за однакового строку попереду більший борг', () => {
    const rows = portfolio(
      [
        object({ id: 1, name: 'Оплачений', payments: [payment({ amount: 100_000 })] }),
        object({ id: 2, name: 'Боржник', payments: [] }),
      ],
      TODAY,
    )

    expect(rows.map((row) => row.object.name)).toEqual(['Боржник', 'Оплачений'])
  })

  it('бере лише активні обʼєкти й не більше за ліміт', () => {
    const items = [
      object({ id: 1, status: { value: 'done', label: '' } }),
      object({ id: 2, status: { value: 'paused', label: '' } }),
      object({ id: 3, archived_at: '2026-08-30T10:00:00.000Z' }),
      object({ id: 4 }),
      object({ id: 5, status: { value: 'planned', label: '' } }),
    ]

    expect(portfolio(items, TODAY).map((row) => row.object.id)).toEqual([4, 5])
    expect(portfolio(items, TODAY, 1)).toHaveLength(1)
  })
})

describe('payableObjects', () => {
  it('спочатку найбільший борг, архів не пропонуємо', () => {
    const rows = payableObjects(
      [
        object({ id: 1, name: 'Оплачений', payments: [payment({ amount: 100_000 })] }),
        object({ id: 2, name: 'Боржник', payments: [] }),
        object({ id: 3, name: 'Архів', archived_at: '2026-08-30T10:00:00.000Z' }),
        object({ id: 4, name: 'Завершений', status: { value: 'done', label: '' } }),
      ],
      TODAY,
    )

    expect(rows.map((row) => row.object.name)).toEqual(['Боржник', 'Завершений', 'Оплачений'])
  })
})

describe('dashboardEvents', () => {
  it('у «горить» ідуть лише прострочені дедлайни та платежі', () => {
    const events = dashboardEvents(
      [
        object({ id: 1, finished_at: '2026-08-20' }),
        object({
          id: 2,
          finished_at: null,
          started_at: '2026-08-10',
          actual_started_at: null,
          payments: [payment({ status: { value: 'pending', label: '' }, paid_at: '2026-08-25' })],
        }),
      ],
      TODAY,
    )

    expect(events.alarm.map((event) => event.kind)).toEqual(['finish', 'payment'])
    expect(events.alarmAmount).toBe(30_000)
  })

  it('найближчі події обрізаються тижнем', () => {
    const events = dashboardEvents(
      [object({ id: 1, finished_at: '2026-09-05' }), object({ id: 2, finished_at: '2026-09-20' })],
      TODAY,
    )

    expect(events.upcoming.map((event) => event.date)).toEqual(['2026-09-05'])
  })
})
