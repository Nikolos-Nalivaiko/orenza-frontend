import { describe, expect, it } from 'vitest'
import {
  buildObjectPayload,
  daysBetween,
  emptyObjectForm,
  formatDay,
  formatDrift,
  formatSpan,
  validateObjectForm,
  type ObjectForm,
} from '../objects'
import { emptyPayment } from '../finance'

function makeForm(overrides: Partial<ObjectForm> = {}): ObjectForm {
  return {
    ...emptyObjectForm(),
    name: 'ЖК «Пасаж», 3 черга',
    address: 'вул. Стеценка, 12 · Київ',
    ...overrides,
  }
}

describe('validateObjectForm', () => {
  it('вимагає назву та адресу', () => {
    expect(validateObjectForm(makeForm())).toEqual({})
    expect(validateObjectForm(makeForm({ name: '' })).name).toBeDefined()
    expect(validateObjectForm(makeForm({ name: 'ЖК' })).name).toBeDefined()
    expect(validateObjectForm(makeForm({ address: '' })).address).toBeDefined()
    expect(validateObjectForm(makeForm({ address: 'вул.' })).address).toBeDefined()
  })

  it('не пускає завершення раніше за початок', () => {
    const errors = validateObjectForm(makeForm({ startDate: '2026-09-10', endDate: '2026-09-01' }))

    expect(errors.endDate).toBeDefined()
    expect(
      validateObjectForm(makeForm({ startDate: '2026-09-01', endDate: '2026-09-10' })),
    ).toEqual({})
  })

  it('вимагає фактичний початок, якщо є фактичне завершення', () => {
    expect(validateObjectForm(makeForm({ factEndDate: '2026-09-10' })).factStartDate).toBeDefined()
  })

  it('звіряє статус із фактичними датами', () => {
    expect(validateObjectForm(makeForm({ status: 'in_progress' })).factStartDate).toBeDefined()
    expect(
      validateObjectForm(makeForm({ status: 'in_progress', factStartDate: '2026-09-01' })),
    ).toEqual({})

    expect(validateObjectForm(makeForm({ status: 'done' })).factEndDate).toBeDefined()
    expect(
      validateObjectForm(
        makeForm({ status: 'done', factStartDate: '2026-09-01', factEndDate: '2026-09-20' }),
      ),
    ).toEqual({})
  })
})

describe('buildObjectPayload', () => {
  it('надсилає лише заповнені поля у форматі бекенду', () => {
    expect(
      buildObjectPayload(makeForm({ name: '  Склад №4  ', description: '  ', clientId: 3 })),
    ).toEqual({
      name: 'Склад №4',
      address: 'вул. Стеценка, 12 · Київ',
      client_id: 3,
      status: 'planned',
    })
  })

  it('перекладає дати в snake_case ключі ресурсу', () => {
    const payload = buildObjectPayload(
      makeForm({
        startDate: '2026-09-01',
        endDate: '2026-12-20',
        factStartDate: '2026-09-04',
        factEndDate: '2026-12-28',
        status: 'done',
      }),
    )

    expect(payload).toMatchObject({
      started_at: '2026-09-01',
      finished_at: '2026-12-20',
      actual_started_at: '2026-09-04',
      actual_finished_at: '2026-12-28',
      status: 'done',
    })
  })

  it('шле знижку так, як її ввели: відсотком або сумою', () => {
    expect(
      buildObjectPayload(makeForm({ discount: { kind: 'percent', value: '5', fromClient: true } })),
    ).toMatchObject({ discount_percent: 5 })

    const fixed = buildObjectPayload(
      makeForm({ discount: { kind: 'amount', value: '1500', fromClient: false } }),
    )

    expect(fixed.discount_amount).toBe(1500)
    expect(fixed.discount_percent).toBeUndefined()
    expect(buildObjectPayload(makeForm()).discount_percent).toBeUndefined()
  })

  it('додає платежі замовника, коли вони є', () => {
    const payload = buildObjectPayload(
      makeForm({ payments: [{ ...emptyPayment(), name: 'Аванс', amount: '20000' }] }),
    )

    expect(payload).toMatchObject({
      payments: [{ name: 'Аванс', amount: 20000, status: 'pending' }],
    })
  })

  it('порожній список платежів на бекенд не їде', () => {
    expect(buildObjectPayload(makeForm()).payments).toBeUndefined()
  })
})

describe('дати', () => {
  it('рахує різницю в днях і форматує підпис', () => {
    expect(daysBetween('2026-09-01', '2026-09-10')).toBe(9)
    expect(daysBetween('2026-09-01', '')).toBeNull()
    expect(daysBetween('не дата', '2026-09-01')).toBeNull()

    expect(formatSpan('2026-09-01', '2026-09-02')).toBe('Триває 1 день')
    expect(formatSpan('2026-09-01', '2026-09-04')).toBe('Триває 3 дні')
    expect(formatSpan('2026-09-01', '2026-09-10')).toBe('Триває 9 днів')
    expect(formatSpan('2026-09-01', '2026-09-01')).toBe('Один день')
    expect(formatSpan('2026-09-10', '2026-09-01')).toBe('')
  })

  it('форматує дату українською без хвоста «р.»', () => {
    expect(formatDay('2026-08-21')).toBe('21 серп. 2026')
    expect(formatDay('')).toBe('')
  })

  it('показує відхилення факту від плану', () => {
    expect(formatDrift(makeForm({ endDate: '2026-12-20', factEndDate: '2026-12-28' }))).toBe(
      'Пізніше плану на 8 днів',
    )
    expect(formatDrift(makeForm({ endDate: '2026-12-20', factEndDate: '2026-12-20' }))).toBe(
      'Точно в строк',
    )
    expect(formatDrift(makeForm({ endDate: '2026-12-20', factEndDate: '2026-12-18' }))).toBe(
      'Раніше плану на 2 дні',
    )
    expect(formatDrift(makeForm())).toBe('')
  })
})
