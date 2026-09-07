import { describe, expect, it } from 'vitest'
import {
  clientObjects,
  clientPayments,
  clientProfile,
  clientTotals,
  formatObjects,
  formatSpell,
  isRegularClient,
  validateClientDiscount,
  validateClientForm,
} from '../clients'
import { OBJECT_STATUS_LABELS, type Client, type ConstructionObject } from '../objects'
import type { Material } from '../materials'
import type { Service } from '../services'
import type { Payment } from '../finance'

const TODAY = '2026-09-02'

const CLIENT: Client = {
  id: 1,
  type: { value: 'company', label: 'Компанія' },
  name: 'ТОВ «Мегабуд»',
  contact: 'Ірина Ковальчук',
  phone: '+380 67 214 30 11',
  email: 'i.kovalchuk@megabud.ua',
  notes: '',
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
    paid_at: '2026-06-12',
    client_visible: false,
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
    public_token: 'token-1',
    archived_at: null,
    created_at: '2026-06-01T09:00:00.000Z',
    ...overrides,
  }
}

describe('clientObjects', () => {
  it('бере лише обʼєкти цього замовника', () => {
    const mine = makeObject()
    const other = makeObject({ id: 2, client: { ...CLIENT, id: 2 } })
    const none = makeObject({ id: 3, client: null })

    expect(clientObjects([mine, other, none], 1)).toEqual([mine])
  })
})

describe('clientTotals', () => {
  it('зводить гроші по всіх обʼєктах замовника', () => {
    // Обʼєкт: 360 000 матеріалів + 100 000 робіт, собівартість 300 000 + 40 000.
    const totals = clientTotals([makeObject(), makeObject({ id: 2 })], TODAY)

    expect(totals.objects).toBe(2)
    expect(totals.client).toBe(920_000)
    expect(totals.cost).toBe(680_000)
    expect(totals.profit).toBe(240_000)
    expect(totals.paid).toBe(200_000)
    expect(totals.due).toBe(720_000)
  })

  it('архівний обʼєкт рахується в кількості, але не в грошах', () => {
    const totals = clientTotals(
      [makeObject(), makeObject({ id: 2, archived_at: '2026-08-01T10:00:00.000Z' })],
      TODAY,
    )

    expect(totals.objects).toBe(2)
    expect(totals.archived).toBe(1)
    expect(totals.client).toBe(460_000)
    expect(totals.paid).toBe(100_000)
  })

  it('активними вважає лише заплановані й ті, що в роботі', () => {
    const totals = clientTotals(
      [
        makeObject(),
        makeObject({ id: 2, status: { value: 'planned', label: OBJECT_STATUS_LABELS.planned } }),
        makeObject({ id: 3, status: { value: 'paused', label: OBJECT_STATUS_LABELS.paused } }),
        makeObject({ id: 4, status: { value: 'done', label: OBJECT_STATUS_LABELS.done } }),
      ],
      TODAY,
    )

    expect(totals.active).toBe(2)
    expect(totals.done).toBe(1)
  })

  it('замовник без обʼєктів не ділить на нуль', () => {
    const totals = clientTotals([], TODAY)

    expect(totals.progress).toBe(0)
    expect(totals.due).toBe(0)
  })
})

describe('мітка постійного замовника', () => {
  it('зʼявляється з другого обʼєкта', () => {
    expect(isRegularClient(1)).toBe(false)
    expect(isRegularClient(2)).toBe(true)
  })

  it('рахує обʼєкти українською', () => {
    expect(formatObjects(1)).toBe('1 обʼєкт')
    expect(formatObjects(3)).toBe('3 обʼєкти')
    expect(formatObjects(11)).toBe('11 обʼєктів')
  })
})

describe('clientPayments', () => {
  it('складає платежі всіх обʼєктів і памʼятає, за який саме кожен', () => {
    const rows = clientPayments([
      makeObject(),
      makeObject({
        id: 2,
        name: 'Котеджі «Липки»',
        payments: [
          payment({ id: 1, amount: 50_000, status: { value: 'pending', label: 'В очікуванні' } }),
          payment({ id: 2, amount: 70_000, paid_at: '2026-07-01' }),
        ],
      }),
    ])

    // Отримані спочатку, свіже зверху; очікуване йде після них.
    expect(rows.map((row) => row.payment.amount)).toEqual([70_000, 100_000, 50_000])
    expect(rows[0]?.object).toEqual({ id: 2, name: 'Котеджі «Липки»' })
  })
})

describe('clientProfile', () => {
  function profileOf(objects: ConstructionObject[]) {
    return clientProfile(objects, clientTotals(objects, TODAY), TODAY)
  }

  it('бере найперший обʼєкт як початок співпраці, а найсвіжіший — як останній', () => {
    const profile = profileOf([
      makeObject({ id: 1, name: 'ЖК «Пасаж»', created_at: '2026-06-01T09:00:00.000Z' }),
      makeObject({ id: 2, name: 'Котеджі «Липки»', created_at: '2026-08-20T09:00:00.000Z' }),
      makeObject({ id: 3, name: 'Офіс «Кварц»', created_at: '2026-03-04T09:00:00.000Z' }),
    ])

    expect(profile.since).toBe('2026-03-04')
    expect(profile.days).toBe(182)
    expect(profile.last?.name).toBe('Котеджі «Липки»')
  })

  it('обʼєкт без дати створення падає на плановий початок', () => {
    const profile = profileOf([makeObject({ created_at: null, started_at: '2026-05-12' })])

    expect(profile.since).toBe('2026-05-12')
  })

  it('середній чек рахується по живих обʼєктах', () => {
    // 460 000 на обʼєкт; архівний у розрахунок не входить.
    const profile = profileOf([
      makeObject(),
      makeObject({ id: 2 }),
      makeObject({ id: 3, archived_at: '2026-08-01T10:00:00.000Z' }),
    ])

    expect(profile.average).toBe(460_000)
  })

  it('рахує платежі й відділяє отримані від очікуваних', () => {
    const profile = profileOf([
      makeObject({
        payments: [
          payment(),
          payment({ id: 2, status: { value: 'pending', label: 'В очікуванні' } }),
          payment({ id: 3, status: { value: 'cancelled', label: 'Скасовано' } }),
        ],
      }),
    ])

    // Скасований платіж не рухав грошей — у портреті його немає.
    expect(profile.payments).toBe(2)
    expect(profile.received).toBe(1)
  })

  it('замовник без обʼєктів не вигадує собі історію', () => {
    const profile = profileOf([])

    expect(profile.since).toBeNull()
    expect(profile.last).toBeNull()
    expect(profile.average).toBe(0)
  })

  it('строк співпраці називає найбільшою зрозумілою одиницею', () => {
    expect(formatSpell(11)).toBe('11 днів')
    expect(formatSpell(90)).toBe('3 місяці')
    expect(formatSpell(730)).toBe('2 роки')
  })
})

describe('валідація', () => {
  it('знижка — число від нуля до ста', () => {
    expect(validateClientDiscount('')).toBe('Вкажіть відсоток — 0, якщо знижки немає')
    expect(validateClientDiscount('abc')).toBe('Тільки число')
    expect(validateClientDiscount('-1')).toBe('Не менше нуля')
    expect(validateClientDiscount('120')).toBe('Максимум 100%')
    expect(validateClientDiscount('7,5')).toBeUndefined()
  })

  it('обовʼязкова лише назва, пошта — тільки якщо її ввели', () => {
    expect(
      validateClientForm({
        type: 'person',
        name: '',
        contact: '',
        phone: '',
        email: '',
      }).name,
    ).toBe('Вкажіть імʼя та прізвище')

    expect(
      validateClientForm({
        type: 'company',
        name: 'ТОВ «Мегабуд»',
        contact: '',
        phone: '',
        email: '',
      }),
    ).toEqual({})

    expect(
      validateClientForm({
        type: 'company',
        name: 'ТОВ «Мегабуд»',
        contact: '',
        phone: '',
        email: 'не пошта',
      }).email,
    ).toBe('Схоже на помилку в адресі')
  })
})
