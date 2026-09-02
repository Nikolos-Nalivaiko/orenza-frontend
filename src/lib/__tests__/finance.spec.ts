import { describe, expect, it } from 'vitest'
import {
  buildPaymentPayload,
  emptyPayment,
  financeTotals,
  hasFinanceErrors,
  isLate,
  paymentsTotals,
  validateFinance,
  validatePayment,
  type FinanceInput,
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

function makeInput(overrides: Partial<FinanceInput> = {}): FinanceInput {
  return { materials: [makeMaterial()], services: [makeService()], payments: [], ...overrides }
}

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
  it('складає суму для клієнта з матеріалів і робіт', () => {
    const totals = financeTotals(makeInput())

    expect(totals.materials).toBe(100 * 30)
    expect(totals.services).toBe(50 * 400)
    expect(totals.client).toBe(3000 + 20000)
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
