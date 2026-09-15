import { describe, expect, it } from 'vitest'
import {
  buildObjectCorePayload,
  daysBetween,
  emptyObjectForm,
  formatDay,
  formatDrift,
  formatDayBrief,
  formatPeriodBrief,
  formatSpan,
  periodDays,
  validateObjectForm,
  type ObjectForm,
} from '../objects'
import { emptyPayment } from '../finance'
import { emptyMaterial } from '../materials'

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

  it('не приймає фактичні дати з майбутнього', () => {
    const errors = validateObjectForm(
      makeForm({ factStartDate: '2026-09-15', factEndDate: '2026-09-20' }),
      '2026-09-14',
    )

    expect(errors.factStartDate).toBe('Фактична дата не може бути пізніше за сьогодні')
    expect(errors.factEndDate).toBe('Фактична дата не може бути пізніше за сьогодні')
    expect(
      validateObjectForm(makeForm({ factStartDate: '2026-09-14' }), '2026-09-14').factStartDate,
    ).toBeUndefined()
  })

  it('звіряє статус із фактичними датами', () => {
    expect(validateObjectForm(makeForm({ status: 'in_progress' })).factStartDate).toBeDefined()
    expect(
      validateObjectForm(
        makeForm({ status: 'in_progress', factStartDate: '2026-09-01' }),
        '2026-09-30',
      ),
    ).toEqual({})

    expect(validateObjectForm(makeForm({ status: 'done' })).factEndDate).toBeDefined()
    expect(
      validateObjectForm(
        makeForm({ status: 'done', factStartDate: '2026-09-01', factEndDate: '2026-09-20' }),
        '2026-09-30',
      ),
    ).toEqual({})
  })
})

describe('buildObjectCorePayload', () => {
  it('порожнє поле шле як null: тим самим ключем його й стирають', () => {
    expect(buildObjectCorePayload(makeForm())).toEqual({
      name: 'ЖК «Пасаж», 3 черга',
      description: null,
      address: 'вул. Стеценка, 12 · Київ',
      client_id: null,
      status: 'planned',
      started_at: null,
      finished_at: null,
      actual_started_at: null,
      actual_finished_at: null,
    })
  })

  it('позиції їдуть разом з обʼєктом — вони зібрані ще до того, як він зʼявився', () => {
    const payload = buildObjectCorePayload(
      makeForm({
        materials: [
          {
            ...emptyMaterial(),
            name: '  Бетон М300  ',
            unit: 'м³',
            quantity: '12,5',
            costPrice: '3000',
            clientPrice: '3600',
          },
        ],
      }),
    )

    expect(payload.materials).toEqual([
      {
        name: 'Бетон М300',
        unit: 'м³',
        quantity: 12.5,
        buyer: 'contractor',
        cost_price: 3000,
        client_price: 3600,
        status: 'needed',
        approved_by_client: false,
      },
    ])
  })

  it('матеріал замовника йде без цін: наших грошей у ньому немає', () => {
    const payload = buildObjectCorePayload(
      makeForm({
        materials: [
          { ...emptyMaterial(), name: 'Цегла', quantity: '2000', buyer: 'client', costPrice: '9' },
        ],
      }),
    )

    expect(payload.materials?.[0]).not.toHaveProperty('cost_price')
    expect(payload.materials?.[0]).not.toHaveProperty('client_price')
  })
})

describe('buildObjectCorePayload: поля обʼєкта', () => {
  it('обрізає значення, а порожні шле як null', () => {
    expect(
      buildObjectCorePayload(makeForm({ name: '  Склад №4  ', description: '  ', clientId: 3 })),
    ).toEqual({
      name: 'Склад №4',
      description: null,
      address: 'вул. Стеценка, 12 · Київ',
      client_id: 3,
      status: 'planned',
      started_at: null,
      finished_at: null,
      actual_started_at: null,
      actual_finished_at: null,
    })
  })

  it('перекладає дати в snake_case ключі ресурсу', () => {
    const payload = buildObjectCorePayload(
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
      buildObjectCorePayload(
        makeForm({ discount: { kind: 'percent', value: '5', fromClient: true } }),
      ),
    ).toMatchObject({ discount_percent: 5 })

    const fixed = buildObjectCorePayload(
      makeForm({ discount: { kind: 'amount', value: '1500', fromClient: false } }),
    )

    expect(fixed.discount_amount).toBe(1500)
    expect(fixed.discount_percent).toBeUndefined()
    expect(buildObjectCorePayload(makeForm()).discount_percent).toBeUndefined()
  })

  it('додає платежі замовника, коли вони є', () => {
    const payload = buildObjectCorePayload(
      makeForm({ payments: [{ ...emptyPayment(), name: 'Аванс', amount: '20000' }] }),
    )

    expect(payload).toMatchObject({
      payments: [{ name: 'Аванс', amount: 20000, status: 'pending' }],
    })
  })

  it('порожній список платежів на бекенд не їде', () => {
    expect(buildObjectCorePayload(makeForm()).payments).toBeUndefined()
  })
})

describe('дати', () => {
  it('рахує різницю в днях і форматує підпис', () => {
    expect(daysBetween('2026-09-01', '2026-09-10')).toBe(9)
    expect(daysBetween('2026-09-01', '')).toBeNull()
    expect(daysBetween('не дата', '2026-09-01')).toBeNull()

    expect(periodDays('2026-09-01', '2026-09-30')).toBe(30)
    expect(periodDays('2026-09-01', '2026-09-01')).toBe(1)
    expect(periodDays('2026-09-10', '2026-09-01')).toBeNull()
  })

  it('коротко пише дати й періоди, рік — лише не поточний', () => {
    const today = '2026-09-14'

    expect(formatDayBrief('2026-09-30', today)).toBe('30 вер.')
    expect(formatDayBrief('2027-01-05', today)).toBe('5 січ. 2027')
    expect(formatPeriodBrief('2026-09-01', '2026-09-30', today)).toBe('1–30 вер.')
    expect(formatPeriodBrief('2026-07-03', '2026-08-26', today)).toBe('3 лип. — 26 серп.')
    expect(formatPeriodBrief('2026-12-01', '2027-02-10', today)).toBe('1 груд. — 10 лют. 2027')
    expect(formatPeriodBrief('2026-09-10', '2026-09-10', today)).toBe('10 вер.')

    expect(formatSpan('2026-09-01', '2026-09-02')).toBe('Триває 2 дні')
    expect(formatSpan('2026-09-01', '2026-09-04')).toBe('Триває 4 дні')
    expect(formatSpan('2026-09-01', '2026-09-30')).toBe('Триває 30 днів')
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
