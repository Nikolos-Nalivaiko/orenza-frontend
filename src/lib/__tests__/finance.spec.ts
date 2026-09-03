import { describe, expect, it } from 'vitest'
import {
  buildPaymentPayload,
  clientDiscount,
  discountAmount,
  dueState,
  emptyDiscount,
  emptyPayment,
  financeTotals,
  formatPayments,
  normalizeDiscount,
  hasFinanceErrors,
  isLate,
  objectFinance,
  paymentsTotals,
  recordDiscount,
  sortPayments,
  validateFinance,
  validatePayment,
  PAYMENT_STATUS_LABELS,
  type DiscountForm,
  type FinanceInput,
  type FinanceRecords,
  type Payment,
  type PaymentForm,
} from '../finance'
import { emptyMaterial, type MaterialForm } from '../materials'
import { emptyService, type ServiceForm } from '../services'

function makePayment(overrides: Partial<PaymentForm> = {}): PaymentForm {
  return { ...emptyPayment(), name: 'Аванс', amount: '20000', ...overrides }
}

function makeMaterial(overrides: Partial<MaterialForm> = {}): MaterialForm {
  return {
    ...emptyMaterial(),
    name: 'Цегла',
    quantity: '100',
    costPrice: '20',
    clientPrice: '30',
    ...overrides,
  }
}

function makeService(overrides: Partial<ServiceForm> = {}): ServiceForm {
  return { ...emptyService(), name: 'Мурування', planVolume: '50', price: '400', ...overrides }
}

function makeDiscount(overrides: Partial<DiscountForm> = {}): DiscountForm {
  return { ...emptyDiscount(), ...overrides }
}

function makeInput(overrides: Partial<FinanceInput> = {}): FinanceInput {
  return {
    materials: [makeMaterial()],
    services: [makeService()],
    discount: makeDiscount(),
    payments: [],
    ...overrides,
  }
}

describe('знижка', () => {
  it('відсоток рахується від суми матеріалів і робіт', () => {
    expect(discountAmount(makeDiscount({ value: '5' }), 23000)).toBe(1150)
    expect(discountAmount(makeDiscount({ value: '0' }), 23000)).toBe(0)
    expect(discountAmount(makeDiscount({ value: '' }), 23000)).toBe(0)
  })

  it('сума береться як є, але не більша за саму суму обʼєкта', () => {
    expect(discountAmount(makeDiscount({ kind: 'amount', value: '1 500' }), 23000)).toBe(1500)
    expect(discountAmount(makeDiscount({ kind: 'amount', value: '99000' }), 23000)).toBe(23000)
    expect(discountAmount(makeDiscount({ value: '150' }), 23000)).toBe(23000)
  })

  it('знижка замовника приходить відсотком і лишається привʼязаною до нього', () => {
    expect(clientDiscount(5)).toEqual({ kind: 'percent', value: '5', fromClient: true })
    expect(clientDiscount(0)).toEqual({ kind: 'percent', value: '', fromClient: true })
  })

  it('чернетка без знижки дає порожню знижку обʼєкта', () => {
    expect(normalizeDiscount(undefined)).toEqual(emptyDiscount())
    expect(normalizeDiscount({ value: '7', fromClient: false })).toEqual({
      kind: 'percent',
      value: '7',
      fromClient: false,
    })
  })
})

describe('paymentsTotals', () => {
  it('розкладає платежі за статусами', () => {
    const totals = paymentsTotals([
      makePayment({ status: 'paid' }),
      makePayment({ status: 'paid', amount: '5 000' }),
      makePayment({ status: 'pending', amount: '3000' }),
      makePayment({ status: 'overdue', amount: '1000' }),
    ])

    expect(totals).toEqual({ count: 4, paid: 25000, pending: 3000, overdue: 1000 })
  })

  it('скасований платіж не входить у жодну суму', () => {
    const totals = paymentsTotals([makePayment({ status: 'cancelled' })])

    expect(totals).toEqual({ count: 1, paid: 0, pending: 0, overdue: 0 })
  })
})

describe('isLate', () => {
  it('строк минув лише для платежа, якого досі чекають', () => {
    expect(isLate(makePayment({ date: '2026-08-01' }), '2026-09-02')).toBe(true)
    expect(isLate(makePayment({ date: '2026-09-20' }), '2026-09-02')).toBe(false)
    expect(isLate(makePayment({ date: '' }), '2026-09-02')).toBe(false)
    expect(isLate(makePayment({ date: '2026-08-01', status: 'paid' }), '2026-09-02')).toBe(false)
  })
})

describe('financeTotals', () => {
  it('складає суму для клієнта з матеріалів і робіт, мінус знижка', () => {
    const totals = financeTotals(makeInput())

    expect(totals.materials).toBe(100 * 30)
    expect(totals.services).toBe(50 * 400)
    expect(totals.gross).toBe(3000 + 20000)
    expect(totals.client).toBe(23000)

    const withDiscount = financeTotals(makeInput({ discount: makeDiscount({ value: '5' }) }))

    expect(withDiscount.discount).toBe(1150)
    expect(withDiscount.client).toBe(23000 - 1150)
  })

  it('знижка зменшує профіт, бо собівартість від неї не змінюється', () => {
    const plain = financeTotals(makeInput())
    const discounted = financeTotals(makeInput({ discount: makeDiscount({ value: '10' }) }))

    expect(discounted.cost).toBe(plain.cost)
    expect(discounted.profit).toBe(plain.profit - 2300)
  })

  it('профіт — одна цифра: сума для клієнта мінус собівартість', () => {
    const service = makeService({
      workers: [{ id: 'w', employeeId: 1, volume: '50', rate: '150' }],
    })
    const totals = financeTotals(makeInput({ services: [service] }))

    expect(totals.cost).toBe(100 * 20 + 50 * 150)
    expect(totals.profit).toBe(totals.client - totals.cost)
  })

  it('матеріали замовника в суму для клієнта не входять', () => {
    const totals = financeTotals(
      makeInput({ materials: [makeMaterial({ buyer: 'client' })], services: [] }),
    )

    expect(totals.client).toBe(0)
    expect(totals.cost).toBe(0)
  })

  it('рахує оплачене, залишок і частку оплати', () => {
    const totals = financeTotals(
      makeInput({
        payments: [
          makePayment({ status: 'paid', amount: '11500' }),
          makePayment({ status: 'overdue', amount: '4000' }),
        ],
      }),
    )

    expect(totals.paid).toBe(11500)
    expect(totals.due).toBe(23000 - 11500)
    expect(totals.overdue).toBe(4000)
    expect(totals.progress).toBe(0.5)
  })

  it('переплата дає відʼємний залишок, але прогрес не перевалює за сто відсотків', () => {
    const totals = financeTotals(
      makeInput({ payments: [makePayment({ status: 'paid', amount: '30000' })] }),
    )

    expect(totals.due).toBe(23000 - 30000)
    expect(totals.progress).toBe(1)
  })
})

describe('validatePayment', () => {
  it('вимагає назву й суму більшу за нуль', () => {
    expect(validatePayment(makePayment())).toEqual({})
    expect(validatePayment(makePayment({ name: ' ' })).name).toBeDefined()
    expect(validatePayment(makePayment({ amount: '' })).amount).toBeDefined()
    expect(validatePayment(makePayment({ amount: '0' })).amount).toBeDefined()
    expect(validatePayment(makePayment({ amount: 'багато' })).amount).toBeDefined()
  })

  it('оплачений платіж має знати свою дату', () => {
    expect(validatePayment(makePayment({ status: 'paid' })).date).toBeDefined()
    expect(validatePayment(makePayment({ status: 'paid', date: '2026-09-01' }))).toEqual({})
    expect(validatePayment(makePayment({ status: 'pending' })).date).toBeUndefined()
  })
})

describe('validateFinance', () => {
  it('порожні фінанси помилок не мають', () => {
    const errors = validateFinance(makeInput())

    expect(errors).toEqual({})
    expect(hasFinanceErrors(errors)).toBe(false)
  })

  it('стереже межі знижки: сто відсотків і сума обʼєкта', () => {
    expect(
      validateFinance(makeInput({ discount: makeDiscount({ value: '100' }) })).discount,
    ).toBeUndefined()
    expect(
      validateFinance(makeInput({ discount: makeDiscount({ value: '101' }) })).discount,
    ).toBeDefined()
    expect(
      validateFinance(makeInput({ discount: makeDiscount({ kind: 'amount', value: '23001' }) }))
        .discount,
    ).toBeDefined()
    expect(
      validateFinance(makeInput({ discount: makeDiscount({ value: '-1' }) })).discount,
    ).toBeDefined()
    expect(
      validateFinance(makeInput({ discount: makeDiscount({ value: 'трохи' }) })).discount,
    ).toBeDefined()
  })

  it('збирає помилки по платежах і пропускає справні', () => {
    const good = makePayment()
    const bad = makePayment({ name: '' })
    const errors = validateFinance(makeInput({ payments: [good, bad] }))

    expect(Object.keys(errors.payments ?? {})).toEqual([bad.id])
    expect(hasFinanceErrors(errors)).toBe(true)
  })
})

describe('buildPaymentPayload', () => {
  it('надсилає лише заповнені поля у форматі бекенду', () => {
    expect(buildPaymentPayload(makePayment({ description: '  ' }))).toEqual({
      name: 'Аванс',
      amount: 20000,
      status: 'pending',
    })
  })

  it('віддає дату й опис, коли вони є', () => {
    expect(
      buildPaymentPayload(
        makePayment({ description: 'Готівкою', status: 'paid', date: '2026-09-01' }),
      ),
    ).toEqual({
      name: 'Аванс',
      description: 'Готівкою',
      amount: 20000,
      status: 'paid',
      paid_at: '2026-09-01',
    })
  })
})

/* ── Гроші обʼєкта ─────────────────────────────────────────────── */

function makeRecordPayment(id: number, overrides: Partial<Payment> = {}): Payment {
  return {
    id,
    name: 'Аванс',
    description: null,
    amount: 20000,
    status: { value: 'paid', label: PAYMENT_STATUS_LABELS.paid },
    paid_at: '2026-06-10',
    client_visible: false,
    ...overrides,
  }
}

function makeRecords(overrides: Partial<FinanceRecords> = {}): FinanceRecords {
  return {
    materials: [
      {
        id: 1,
        name: 'Бетон',
        unit: 'м³',
        quantity: 10,
        buyer: { value: 'contractor', label: 'Підрядник' },
        cost_price: 3000,
        client_price: 3600,
        status: { value: 'delivered', label: 'Доставлено' },
        approved_by_client: true,
      },
      {
        id: 2,
        name: 'Цемент замовника',
        unit: 'шт',
        quantity: 40,
        buyer: { value: 'client', label: 'Замовник' },
        cost_price: null,
        client_price: null,
        status: { value: 'delivered', label: 'Доставлено' },
        approved_by_client: true,
      },
    ],
    services: [
      {
        id: 1,
        name: 'Монолітні роботи',
        description: null,
        unit: 'м³',
        planned_volume: 100,
        actual_volume: null,
        client_price: 1000,
        status: { value: 'in_progress', label: 'В роботі' },
        workers: [{ employee_id: 2, volume: 100, rate: 600 }],
      },
    ],
    discount_percent: 10,
    discount_amount: null,
    payments: [makeRecordPayment(1)],
    ...overrides,
  }
}

describe('recordDiscount', () => {
  it('знімає відсоток від суми, а сумою — не більше, ніж є', () => {
    expect(recordDiscount(10, null, 1000)).toBe(100)
    expect(recordDiscount(null, 300, 1000)).toBe(300)
    expect(recordDiscount(null, 5000, 1000)).toBe(1000)
    expect(recordDiscount(null, null, 1000)).toBe(0)
  })
})

describe('objectFinance', () => {
  it('складає гроші з матеріалів і робіт, знижка йде лише з боку клієнта', () => {
    const finance = objectFinance(makeRecords(), '2026-06-20')

    // Матеріали замовника через нас не проходять — у сумах їх немає.
    expect(finance.materials).toEqual({ revenue: 36000, cost: 30000 })
    expect(finance.services).toEqual({ revenue: 100000, cost: 60000 })
    expect(finance.gross).toBe(136000)
    expect(finance.discount).toBe(13600)
    expect(finance.client).toBe(122400)
    expect(finance.cost).toBe(90000)
    expect(finance.profit).toBe(32400)
  })

  it('ділить платежі на отримані, очікувані та прострочені', () => {
    const finance = objectFinance(
      makeRecords({
        payments: [
          makeRecordPayment(1),
          makeRecordPayment(2, {
            amount: 50000,
            status: { value: 'pending', label: PAYMENT_STATUS_LABELS.pending },
            paid_at: '2026-06-15',
          }),
          makeRecordPayment(3, {
            amount: 30000,
            status: { value: 'pending', label: PAYMENT_STATUS_LABELS.pending },
            paid_at: '2026-07-15',
          }),
          makeRecordPayment(4, {
            amount: 99999,
            status: { value: 'cancelled', label: PAYMENT_STATUS_LABELS.cancelled },
          }),
        ],
      }),
      '2026-06-20',
    )

    expect(finance.paid).toBe(20000)
    expect(finance.pending).toBe(80000)
    expect(finance.overdue).toBe(50000)
    expect(finance.due).toBe(122400 - 20000)
  })
})

describe('dueState', () => {
  it('читається як світлофор: нічого, частково, повністю, переплата', () => {
    expect(dueState(1000, 0)).toBe('none')
    expect(dueState(1000, 400)).toBe('partial')
    expect(dueState(1000, 1000)).toBe('paid')
    expect(dueState(1000, 1200)).toBe('over')
    expect(dueState(0, 0)).toBe('none')
  })
})

describe('sortPayments', () => {
  it('спочатку отримане — свіже зверху, далі очікуване — найближче зверху', () => {
    const rows = sortPayments(
      [
        makeRecordPayment(1, { paid_at: '2026-06-01' }),
        makeRecordPayment(2, {
          status: { value: 'pending', label: PAYMENT_STATUS_LABELS.pending },
          paid_at: '2026-09-01',
        }),
        makeRecordPayment(3, { paid_at: '2026-07-01' }),
        makeRecordPayment(4, {
          status: { value: 'pending', label: PAYMENT_STATUS_LABELS.pending },
          paid_at: '2026-08-01',
        }),
        makeRecordPayment(5, {
          status: { value: 'cancelled', label: PAYMENT_STATUS_LABELS.cancelled },
        }),
      ],
      '2026-06-20',
    )

    expect(rows.map((row) => row.id)).toEqual([3, 1, 4, 2, 5])
  })
})

describe('formatPayments', () => {
  it('узгоджує число з формою слова', () => {
    expect(formatPayments(1)).toBe('1 платіж')
    expect(formatPayments(3)).toBe('3 платежі')
    expect(formatPayments(11)).toBe('11 платежів')
  })
})
