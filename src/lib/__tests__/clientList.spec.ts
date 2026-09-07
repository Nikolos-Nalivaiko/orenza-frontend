import { describe, expect, it } from 'vitest'
import {
  applyClientFilters,
  clientRows,
  countClients,
  defaultClientFilters,
  isDefaultClientFilters,
  matchesClientQuery,
  totalDue,
  type ClientFilters,
} from '../clientList'
import { OBJECT_STATUS_LABELS, type Client, type ConstructionObject } from '../objects'
import type { Payment } from '../finance'
import type { Service } from '../services'

const TODAY = '2026-09-02'

function makeClient(overrides: Partial<Client> = {}): Client {
  return {
    id: 1,
    type: { value: 'company', label: 'Компанія' },
    name: 'ТОВ «Мегабуд»',
    contact: 'Ірина Ковальчук',
    phone: '+380 67 214 30 11',
    email: 'i.kovalchuk@megabud.ua',
    notes: '',
    discount: 5,
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
    workers: [],
    ...overrides,
  }
}

function payment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 1,
    name: 'Аванс',
    description: null,
    amount: 40_000,
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
    client: makeClient(),
    status: { value: 'in_progress', label: OBJECT_STATUS_LABELS.in_progress },
    started_at: '2026-06-01',
    finished_at: '2026-10-14',
    actual_started_at: null,
    actual_finished_at: null,
    cover: null,
    materials: [],
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

describe('clientRows', () => {
  it('зводить обʼєкти, гроші й мітку постійного по кожному замовнику', () => {
    const first = makeClient()
    const second = makeClient({ id: 2, name: 'ОСББ «Стеценка»' })

    const rows = clientRows(
      [first, second],
      [makeObject(), makeObject({ id: 2 }), makeObject({ id: 3, client: second })],
      TODAY,
    )

    // 100 м³ × 1000 ₴ на обʼєкт: два обʼєкти — 200 000 ₴, оплачено 80 000 ₴.
    expect(rows[0]?.totals.objects).toBe(2)
    expect(rows[0]?.totals.due).toBe(120_000)
    expect(rows[0]?.regular).toBe(true)

    expect(rows[1]?.totals.objects).toBe(1)
    expect(rows[1]?.regular).toBe(false)
  })

  it('замовник без обʼєктів лишається в списку з нулями', () => {
    const rows = clientRows([makeClient()], [], TODAY)

    expect(rows).toHaveLength(1)
    expect(rows[0]?.totals.objects).toBe(0)
    expect(rows[0]?.totals.due).toBe(0)
    expect(rows[0]?.last).toBeNull()
  })

  it('останньою активністю бере найсвіжішу подію по всіх обʼєктах', () => {
    const rows = clientRows(
      [makeClient()],
      [
        makeObject(),
        makeObject({
          id: 2,
          created_at: '2026-05-01T09:00:00.000Z',
          payments: [payment({ paid_at: '2026-08-20' })],
        }),
      ],
      TODAY,
    )

    expect(rows[0]?.last).toEqual({ at: '2026-08-20', text: 'платіж' })
  })

  it('очікуваний платіж рухом не вважає', () => {
    const rows = clientRows(
      [makeClient()],
      [
        makeObject({
          payments: [
            payment({ status: { value: 'pending', label: 'Очікується' }, paid_at: '2026-08-30' }),
          ],
        }),
      ],
      TODAY,
    )

    expect(rows[0]?.last).toEqual({ at: '2026-06-01T09:00:00.000Z', text: 'новий обʼєкт' })
  })
})

describe('matchesClientQuery', () => {
  const client = makeClient()

  it('шукає за назвою й контактною особою', () => {
    expect(matchesClientQuery(client, 'мегабуд')).toBe(true)
    expect(matchesClientQuery(client, 'ковальчук')).toBe(true)
    expect(matchesClientQuery(client, 'стальпром')).toBe(false)
  })

  it('шукає за номером у будь-якому написанні', () => {
    expect(matchesClientQuery(client, '0672143011')).toBe(true)
    expect(matchesClientQuery(client, '+380 67 214')).toBe(true)
    expect(matchesClientQuery(client, '214-30-11')).toBe(true)
    expect(matchesClientQuery(client, '999')).toBe(false)
  })

  it('порожній запит пропускає всіх', () => {
    expect(matchesClientQuery(client, '   ')).toBe(true)
  })
})

describe('applyClientFilters', () => {
  const debtor = makeClient()
  const regular = makeClient({ id: 2, name: 'Альфа' })
  const clean = makeClient({ id: 3, name: 'Бета', phone: '' })

  const rows = clientRows(
    [debtor, regular, clean],
    [
      makeObject(),
      makeObject({ id: 2, client: regular, created_at: '2026-07-01T09:00:00.000Z' }),
      makeObject({ id: 3, client: regular, created_at: '2026-07-02T09:00:00.000Z' }),
      // Усе оплачено: 100 000 ₴ робіт і рівно стільки ж платежем.
      makeObject({
        id: 4,
        client: clean,
        created_at: '2026-04-01T09:00:00.000Z',
        payments: [payment({ amount: 100_000, paid_at: '2026-04-10' })],
      }),
    ],
    TODAY,
  )

  function filters(overrides: Partial<ClientFilters> = {}): ClientFilters {
    return { ...defaultClientFilters(), ...overrides }
  }

  it('за замовчуванням ставить зверху найсвіжіших', () => {
    const found = applyClientFilters(rows, filters())

    expect(found.map((row) => row.client.id)).toEqual([2, 1, 3])
  })

  it('сортує за боргом і за абеткою', () => {
    expect(applyClientFilters(rows, filters({ sort: 'due' })).map((row) => row.client.id)).toEqual([
      2, 1, 3,
    ])

    expect(
      applyClientFilters(rows, filters({ sort: 'name' })).map((row) => row.client.name),
    ).toEqual(['Альфа', 'Бета', 'ТОВ «Мегабуд»'])
  })

  it('ділить постійних і разових', () => {
    expect(
      applyClientFilters(rows, filters({ kind: 'regular' })).map((row) => row.client.id),
    ).toEqual([2])

    expect(
      applyClientFilters(rows, filters({ kind: 'single' })).map((row) => row.client.id),
    ).toEqual([1, 3])
  })

  it('лишає тільки боржників', () => {
    const found = applyClientFilters(rows, filters({ debtOnly: true }))

    expect(found.map((row) => row.client.id)).toEqual([2, 1])
  })

  it('фільтри складаються між собою', () => {
    const found = applyClientFilters(rows, filters({ debtOnly: true, query: 'мега' }))

    expect(found.map((row) => row.client.id)).toEqual([1])
  })
})

describe('countClients', () => {
  it('рахує постійних, разових і боржників', () => {
    const single = makeClient({ id: 2, name: 'Альфа' })

    const rows = clientRows(
      [makeClient(), single],
      [makeObject(), makeObject({ id: 2 }), makeObject({ id: 3, client: single })],
      TODAY,
    )

    expect(countClients(rows)).toEqual({ all: 2, regular: 1, single: 1, debt: 2 })
    expect(totalDue(rows)).toBe(180_000)
  })
})

describe('isDefaultClientFilters', () => {
  it('бачить будь-яку зміну панелі', () => {
    expect(isDefaultClientFilters(defaultClientFilters())).toBe(true)
    expect(isDefaultClientFilters({ ...defaultClientFilters(), debtOnly: true })).toBe(false)
    expect(isDefaultClientFilters({ ...defaultClientFilters(), query: ' ' })).toBe(true)
    expect(isDefaultClientFilters({ ...defaultClientFilters(), sort: 'name' })).toBe(false)
  })
})
