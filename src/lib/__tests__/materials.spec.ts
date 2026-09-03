import { describe, expect, it } from 'vitest'
import {
  buildMaterialPayload,
  defaultMaterialFilters,
  emptyMaterial,
  filterMaterials,
  formatPositions,
  isDefaultMaterialFilters,
  materialClientTotal,
  materialCostTotal,
  materialLineProfit,
  materialProfit,
  materialsSummary,
  materialsTotals,
  MATERIAL_BUYER_LABELS,
  MATERIAL_STATUS_LABELS,
  validateMaterial,
  validateMaterials,
  type Material,
  type MaterialBuyer,
  type MaterialForm,
  type MaterialStatus,
} from '../materials'

function makeMaterial(overrides: Partial<MaterialForm> = {}): MaterialForm {
  return {
    ...emptyMaterial(),
    name: 'Цегла керамічна М150',
    quantity: '1200',
    costPrice: '12',
    clientPrice: '15',
    ...overrides,
  }
}

/** Позиція у тому вигляді, у якому її віддає бекенд — не форма. */
function makeItem(
  id: number,
  overrides: Partial<Omit<Material, 'buyer' | 'status'>> & {
    buyer?: MaterialBuyer
    status?: MaterialStatus
  } = {},
): Material {
  const { buyer = 'contractor', status = 'needed', ...rest } = overrides

  return {
    id,
    name: `Матеріал ${id}`,
    unit: 'шт',
    quantity: 10,
    cost_price: 100,
    client_price: 150,
    approved_by_client: false,
    ...rest,
    buyer: { value: buyer, label: MATERIAL_BUYER_LABELS[buyer] },
    status: { value: status, label: MATERIAL_STATUS_LABELS[status] },
  }
}

describe('materialProfit', () => {
  it('рахує (ціна клієнта − наша ціна) × кількість', () => {
    expect(materialProfit(makeMaterial())).toBe(3600)
  })

  it('дає мінус, коли клієнту продано дешевше за закупівлю', () => {
    expect(materialProfit(makeMaterial({ costPrice: '15', clientPrice: '12' }))).toBe(-3600)
  })

  it('у матеріалів клієнта націнки немає взагалі', () => {
    expect(materialProfit(makeMaterial({ buyer: 'client' }))).toBeNull()
  })

  it('без однієї з цін профіт не рахується', () => {
    expect(materialProfit(makeMaterial({ clientPrice: '' }))).toBeNull()
  })
})

describe('materialsTotals', () => {
  it('підсумовує лише наші закупівлі, позиції клієнта рахує окремо', () => {
    const totals = materialsTotals([
      makeMaterial(),
      makeMaterial({ quantity: '10', costPrice: '400', clientPrice: '500' }),
      makeMaterial({ buyer: 'client', quantity: '30', costPrice: '999', clientPrice: '999' }),
    ])

    expect(totals).toEqual({
      count: 2,
      clientCount: 1,
      cost: 1200 * 12 + 10 * 400,
      revenue: 1200 * 15 + 10 * 500,
      profit: 3600 + 1000,
    })
  })

  it('порожній список дає нулі', () => {
    expect(materialsTotals([])).toEqual({
      count: 0,
      clientCount: 0,
      cost: 0,
      revenue: 0,
      profit: 0,
    })
  })
})

describe('validateMaterial', () => {
  it('вимагає назву та кількість більшу за нуль', () => {
    expect(validateMaterial(makeMaterial())).toEqual({})
    expect(validateMaterial(makeMaterial({ name: '  ' })).name).toBeDefined()
    expect(validateMaterial(makeMaterial({ quantity: '' })).quantity).toBeDefined()
    expect(validateMaterial(makeMaterial({ quantity: '0' })).quantity).toBeDefined()
    expect(validateMaterial(makeMaterial({ quantity: '-5' })).quantity).toBeDefined()
  })

  it('перевіряє ціни лише там, де купуємо ми', () => {
    expect(validateMaterial(makeMaterial({ costPrice: 'дорого' })).costPrice).toBeDefined()
    expect(validateMaterial(makeMaterial({ clientPrice: '-3' })).clientPrice).toBeDefined()

    // Порожні ціни — нормально: позиція може бути ще в плані закупівель.
    expect(validateMaterial(makeMaterial({ costPrice: '', clientPrice: '' }))).toEqual({})

    expect(
      validateMaterial(makeMaterial({ buyer: 'client', costPrice: 'хтозна', clientPrice: '-3' })),
    ).toEqual({})
  })

  it('збирає помилки по рядках і пропускає справні', () => {
    const good = makeMaterial()
    const bad = makeMaterial({ name: '' })

    expect(validateMaterials([good, bad])).toEqual({ [bad.id]: { name: 'Вкажіть матеріал' } })
  })
})

describe('суми позиції обʼєкта', () => {
  it('рахує рядок цілком: кількість × ціну', () => {
    const item = makeItem(1, { quantity: 10, cost_price: 100, client_price: 150 })

    expect(materialCostTotal(item)).toBe(1000)
    expect(materialClientTotal(item)).toBe(1500)
    expect(materialLineProfit(item)).toBe(500)
  })

  it('у матеріалів замовника грошей немає взагалі — не нуль, а прочерк', () => {
    const item = makeItem(1, { buyer: 'client' })

    expect(materialCostTotal(item)).toBeNull()
    expect(materialClientTotal(item)).toBeNull()
    expect(materialLineProfit(item)).toBeNull()
  })

  it('незаповнена ціна рахується як нуль — позиція ще в плані закупівель', () => {
    expect(materialCostTotal(makeItem(1, { cost_price: null }))).toBe(0)
  })
})

describe('materialsSummary', () => {
  it('рахує гроші лише з наших закупівель, а позиції — усі', () => {
    const summary = materialsSummary([
      makeItem(1, { status: 'needed' }),
      makeItem(2, { quantity: 2, cost_price: 500, client_price: 600, status: 'delivered' }),
      makeItem(3, { buyer: 'client', quantity: 99, status: 'delivered' }),
    ])

    expect(summary.total).toBe(3)
    expect(summary.clientCount).toBe(1)
    expect(summary.cost).toBe(1000 + 1000)
    expect(summary.revenue).toBe(1500 + 1200)
    expect(summary.profit).toBe(700)
    expect(summary.byStatus).toEqual({ needed: 1, ordered: 0, delivered: 2, used: 0 })
  })

  it('порожній список дає нулі по всіх стадіях', () => {
    const summary = materialsSummary([])

    expect(summary).toEqual({
      total: 0,
      clientCount: 0,
      cost: 0,
      revenue: 0,
      profit: 0,
      byStatus: { needed: 0, ordered: 0, delivered: 0, used: 0 },
    })
  })
})

describe('filterMaterials', () => {
  const items = [
    makeItem(1, { name: 'Цегла', status: 'needed' }),
    makeItem(2, { name: 'Бетон В25', status: 'delivered', client_price: 900 }),
    makeItem(3, { name: 'Цемент', status: 'delivered', buyer: 'client' }),
  ]

  function ids(filters: Partial<ReturnType<typeof defaultMaterialFilters>>): number[] {
    return filterMaterials(items, { ...defaultMaterialFilters(), ...filters }).map((row) => row.id)
  }

  it('без фільтрів лишає порядок, у якому позиції завели', () => {
    expect(ids({})).toEqual([1, 2, 3])
  })

  it('порожній список стадій означає «усі»', () => {
    expect(ids({ statuses: [] })).toEqual([1, 2, 3])
    expect(ids({ statuses: ['delivered'] })).toEqual([2, 3])
    expect(ids({ statuses: ['needed', 'delivered'] })).toEqual([1, 2, 3])
  })

  it('фільтрує за тим, хто купує', () => {
    expect(ids({ buyer: 'client' })).toEqual([3])
    expect(ids({ buyer: 'contractor' })).toEqual([1, 2])
  })

  it('шукає за назвою без огляду на регістр', () => {
    expect(ids({ query: 'цем' })).toEqual([3])
    expect(ids({ query: '  БЕТОН ' })).toEqual([2])
    expect(ids({ query: 'нічого' })).toEqual([])
  })

  it('сортує за стадією, назвою й сумою для клієнта', () => {
    expect(ids({ sort: 'status' })).toEqual([1, 2, 3])
    expect(ids({ sort: 'name' })).toEqual([2, 1, 3])

    // Позиція замовника суми не має — вона й опиняється в кінці.
    expect(ids({ sort: 'amount' })).toEqual([2, 1, 3])
  })

  it('фільтри складаються', () => {
    expect(ids({ statuses: ['delivered'], buyer: 'contractor' })).toEqual([2])
  })
})

describe('isDefaultMaterialFilters', () => {
  it('відрізняє чистий стан від будь-якої правки', () => {
    expect(isDefaultMaterialFilters(defaultMaterialFilters())).toBe(true)
    expect(isDefaultMaterialFilters({ ...defaultMaterialFilters(), query: '  ' })).toBe(true)

    expect(isDefaultMaterialFilters({ ...defaultMaterialFilters(), query: 'цегла' })).toBe(false)
    expect(isDefaultMaterialFilters({ ...defaultMaterialFilters(), statuses: ['used'] })).toBe(
      false,
    )
    expect(isDefaultMaterialFilters({ ...defaultMaterialFilters(), buyer: 'client' })).toBe(false)
    expect(isDefaultMaterialFilters({ ...defaultMaterialFilters(), sort: 'name' })).toBe(false)
  })
})

describe('formatPositions', () => {
  it('узгоджує число з формою слова', () => {
    expect(formatPositions(1)).toBe('1 позиція')
    expect(formatPositions(3)).toBe('3 позиції')
    expect(formatPositions(7)).toBe('7 позицій')
    expect(formatPositions(11)).toBe('11 позицій')
    expect(formatPositions(21)).toBe('21 позиція')
  })
})

describe('buildMaterialPayload', () => {
  it('надсилає ціни лише для наших закупівель', () => {
    expect(buildMaterialPayload(makeMaterial({ unit: 'шт', approved: true }))).toEqual({
      name: 'Цегла керамічна М150',
      unit: 'шт',
      quantity: 1200,
      buyer: 'contractor',
      cost_price: 12,
      client_price: 15,
      status: 'needed',
      approved_by_client: true,
    })

    expect(buildMaterialPayload(makeMaterial({ buyer: 'client', status: 'delivered' }))).toEqual({
      name: 'Цегла керамічна М150',
      unit: 'шт',
      quantity: 1200,
      buyer: 'client',
      status: 'delivered',
      approved_by_client: false,
    })
  })
})
