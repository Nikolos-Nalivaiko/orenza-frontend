import { describe, expect, it } from 'vitest'
import { PAYMENT_STATUS_LABELS, type Payment, type PaymentStatus } from '../finance'
import { OBJECT_STATUS_LABELS, type ConstructionObject, type ObjectStatus } from '../objects'
import type { Service } from '../services'
import {
  agingBucket,
  countTabs,
  filterPayments,
  incomeByMonth,
  moneyTotals,
  niceScale,
  objectMargins,
  paymentRows,
  receivables,
} from '../workspaceFinance'

const TODAY = '2026-09-18'

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

let sequence = 0

function payment(overrides: Partial<Payment> = {}): Payment {
  const status: PaymentStatus = overrides.status?.value ?? 'paid'

  sequence += 1

  return {
    id: sequence,
    name: 'Аванс',
    description: null,
    amount: 30_000,
    paid_at: '2026-09-05',
    client_visible: false,
    ...overrides,
    status: { value: status, label: PAYMENT_STATUS_LABELS[status] },
  }
}

function pending(amount: number, paidAt: string | null, name = 'Етап'): Payment {
  return payment({
    amount,
    paid_at: paidAt,
    name,
    status: { value: 'pending', label: '' },
  })
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
    finished_at: '2026-10-20',
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

describe('moneyTotals', () => {
  it('зводить суму, собівартість, оплати й прострочене', () => {
    const totals = moneyTotals(
      [
        object({
          payments: [payment(), pending(20_000, '2026-09-01'), pending(10_000, '2026-10-01')],
        }),
      ],
      TODAY,
    )

    expect(totals).toEqual({
      contracted: 100_000,
      cost: 40_000,
      profit: 60_000,
      margin: 0.6,
      paid: 30_000,
      paidThisMonth: 30_000,
      due: 70_000,
      overdue: 20_000,
      objects: 1,
    })
  })

  it('архів не входить у борги, але його оплати цього місяця — входять', () => {
    const totals = moneyTotals([object({ archived_at: '2026-09-10T00:00:00Z' })], TODAY)

    expect(totals.objects).toBe(0)
    expect(totals.due).toBe(0)
    expect(totals.paidThisMonth).toBe(30_000)
  })

  it('без суми маржі немає', () => {
    expect(moneyTotals([], TODAY).margin).toBeNull()
  })
})

describe('incomeByMonth', () => {
  it('розкладає отримане, очікуване й прострочене по місяцях', () => {
    const months = incomeByMonth(
      [
        object({
          payments: [
            payment({ paid_at: '2026-08-10' }),
            pending(20_000, '2026-09-01'),
            pending(10_000, '2026-10-01'),
            pending(5_000, null),
            payment({ paid_at: '2026-09-02', status: { value: 'cancelled', label: '' } }),
          ],
        }),
      ],
      TODAY,
      1,
      1,
    )

    expect(months).toEqual([
      { month: '2026-08', paid: 30_000, expected: 0, late: 0, current: false },
      { month: '2026-09', paid: 0, expected: 0, late: 20_000, current: true },
      { month: '2026-10', paid: 0, expected: 10_000, late: 0, current: false },
    ])
  })
})

describe('receivables', () => {
  it('ділить заплановані платежі за давністю й рахує залишок без графіка', () => {
    expect([0, 1, 30, 31, 60, 61].map(agingBucket)).toEqual([
      'current',
      'late30',
      'late30',
      'late60',
      'late60',
      'late90',
    ])

    const result = receivables(
      [
        object({
          payments: [
            payment(),
            pending(10_000, '2026-09-10', 'Етап 1'),
            pending(15_000, '2026-07-01', 'Етап 2'),
            pending(20_000, '2026-10-01', 'Етап 3'),
          ],
        }),
      ],
      TODAY,
    )

    expect(result.scheduled).toBe(45_000)
    expect(result.overdue).toBe(25_000)
    expect(result.unscheduled).toBe(25_000)
    expect(result.debtors.map((row) => row.payment.name)).toEqual(['Етап 2', 'Етап 1'])
    expect(result.groups.map((group) => group.amount)).toEqual([20_000, 10_000, 0, 15_000])
  })

  it('статус «прострочено» без дати теж борг', () => {
    const result = receivables(
      [object({ payments: [payment({ paid_at: null, status: { value: 'overdue', label: '' } })] })],
      TODAY,
    )

    expect(result.overdue).toBe(30_000)
    expect(result.debtors[0]?.daysLate).toBe(1)
  })
})

describe('objectMargins', () => {
  it('пропускає архів і порожні обʼєкти', () => {
    const rows = objectMargins(
      [
        object(),
        object({ id: 2, archived_at: '2026-09-01T00:00:00Z' }),
        object({ id: 3, services: [], payments: [] }),
      ],
      TODAY,
    )

    expect(rows.map((row) => [row.object.id, row.margin])).toEqual([[1, 0.6]])
  })
})

describe('paymentRows', () => {
  const rows = paymentRows(
    [
      object({
        payments: [
          payment({ name: 'Аванс', paid_at: '2026-08-01' }),
          payment({ name: 'Етап 1', paid_at: '2026-09-01' }),
          pending(10_000, '2026-10-01', 'Етап 3'),
          pending(10_000, '2026-09-01', 'Етап 2'),
          payment({ name: 'Скасований', status: { value: 'cancelled', label: '' } }),
        ],
      }),
    ],
    TODAY,
  )

  it('рахує вкладки без скасованих', () => {
    expect(countTabs(rows)).toEqual({ all: 4, paid: 2, expected: 1, late: 1 })
  })

  it('прострочене зверху, далі очікуване, далі свіжі оплати', () => {
    expect(filterPayments(rows, 'all', '').map((row) => row.payment.name)).toEqual([
      'Етап 2',
      'Етап 3',
      'Етап 1',
      'Аванс',
    ])
  })

  it('шукає й за назвою обʼєкта', () => {
    expect(filterPayments(rows, 'paid', 'пасаж')).toHaveLength(2)
    expect(filterPayments(rows, 'all', 'етап 3')).toHaveLength(1)
  })
})

describe('niceScale', () => {
  it('округлює верх до кроку', () => {
    expect(niceScale(870_000, 4)).toEqual({
      min: 0,
      max: 1_000_000,
      ticks: [0, 250_000, 500_000, 750_000, 1_000_000],
    })
    expect(niceScale(0).ticks).toEqual([0])
  })
})
