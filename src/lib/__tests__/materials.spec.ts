import { describe, expect, it } from 'vitest'
import {
  buildMaterialPayload,
  emptyMaterial,
  materialProfit,
  materialsTotals,
  validateMaterial,
  validateMaterials,
  type MaterialForm,
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
