/**
 * Матеріали обʼєкта. Дві принципово різні позиції:
 *
 * • купує підрядник — є ціна закупівлі (наша) і ціна для клієнта (з націнкою),
 *   різниця між ними й дає профіт;
 * • купує клієнт напряму — грошей ми не рухаємо, тож цін немає взагалі,
 *   позиція лише фіксує, що матеріал на обʼєкті.
 *
 * Типи описані так, як їх віддаватиме майбутній
 * GET|POST /api/v1/objects/{id}/materials.
 */

import { multiply, parseAmount } from '@/lib/amount'

export type MaterialStatus = 'needed' | 'ordered' | 'delivered' | 'used'
export type MaterialBuyer = 'contractor' | 'client'

export interface MaterialStatusOption {
  value: MaterialStatus
  label: string
}

/** Порядок — життєвий шлях позиції: потрібно → замовлено → доставлено → використано. */
export const MATERIAL_STATUSES: readonly MaterialStatusOption[] = [
  { value: 'needed', label: 'Потрібно' },
  { value: 'ordered', label: 'Замовлено' },
  { value: 'delivered', label: 'Доставлено' },
  { value: 'used', label: 'Використано' },
]

export const MATERIAL_STATUS_LABELS: Record<MaterialStatus, string> = {
  needed: 'Потрібно',
  ordered: 'Замовлено',
  delivered: 'Доставлено',
  used: 'Використано',
}

export const MATERIAL_BUYER_LABELS: Record<MaterialBuyer, string> = {
  contractor: 'Підрядник',
  client: 'Замовник',
}

export const MATERIAL_UNITS = ['шт', 'м', 'м²', 'м³', 'кг', 'т', 'л', 'меш', 'упак', 'пал'] as const

export type MaterialUnit = (typeof MATERIAL_UNITS)[number]

/* ── Форма ─────────────────────────────────────────────────────── */

/**
 * Числа тримаємо рядками: поле може бути порожнім або недописаним, а
 * перетворення на число — справа розрахунку, не редагування.
 */
export interface MaterialForm {
  /** Локальний ключ рядка — id з бекенду зʼявиться після збереження. */
  id: string
  name: string
  unit: MaterialUnit
  quantity: string
  buyer: MaterialBuyer
  costPrice: string
  clientPrice: string
  status: MaterialStatus
  approved: boolean
}

export type MaterialErrors = Partial<
  Record<'name' | 'quantity' | 'costPrice' | 'clientPrice', string>
>

export const MATERIAL_NAME_MAX = 255

let sequence = 0

export function nextMaterialId(): string {
  sequence += 1

  return `m-${sequence}`
}

export function emptyMaterial(): MaterialForm {
  return {
    id: nextMaterialId(),
    name: '',
    unit: 'шт',
    quantity: '',
    buyer: 'contractor',
    costPrice: '',
    clientPrice: '',
    status: 'needed',
    approved: false,
  }
}

/* ── Гроші ─────────────────────────────────────────────────────── */

export function materialCost(material: MaterialForm): number | null {
  return material.buyer === 'client' ? null : multiply(material.quantity, material.costPrice)
}

export function materialRevenue(material: MaterialForm): number | null {
  return material.buyer === 'client' ? null : multiply(material.quantity, material.clientPrice)
}

/**
 * Профіт із позиції = (ціна для клієнта − ціна для нас) × кількість.
 * У матеріалів клієнта націнки немає за визначенням, тож там завжди null.
 */
export function materialProfit(material: MaterialForm): number | null {
  const cost = materialCost(material)
  const revenue = materialRevenue(material)

  return cost === null || revenue === null ? null : revenue - cost
}

export interface MaterialsTotals {
  /** Позицій, які закуповує підрядник. */
  count: number
  /** Позицій, які замовник купує напряму. */
  clientCount: number
  cost: number
  revenue: number
  profit: number
}

export function materialsTotals(materials: MaterialForm[]): MaterialsTotals {
  const totals: MaterialsTotals = { count: 0, clientCount: 0, cost: 0, revenue: 0, profit: 0 }

  for (const material of materials) {
    if (material.buyer === 'client') {
      totals.clientCount += 1

      continue
    }

    totals.count += 1
    totals.cost += materialCost(material) ?? 0
    totals.revenue += materialRevenue(material) ?? 0
  }

  totals.profit = totals.revenue - totals.cost

  return totals
}

/* ── Валідація ─────────────────────────────────────────────────── */

function priceError(value: string): string | undefined {
  if (value.trim() === '') {
    return undefined
  }

  const parsed = parseAmount(value)

  if (parsed === null) {
    return 'Тільки число'
  }

  return parsed < 0 ? 'Не менше нуля' : undefined
}

export function validateMaterial(material: MaterialForm): MaterialErrors {
  const errors: MaterialErrors = {}
  const name = material.name.trim()

  if (name === '') {
    errors.name = 'Вкажіть матеріал'
  } else if (name.length > MATERIAL_NAME_MAX) {
    errors.name = `Максимум ${MATERIAL_NAME_MAX} символів`
  }

  const quantity = parseAmount(material.quantity)

  if (quantity === null) {
    errors.quantity = 'Вкажіть кількість'
  } else if (quantity <= 0) {
    errors.quantity = 'Більше нуля'
  }

  // Ціни потрібні лише там, де гроші рухаємо ми, і лишаються необовʼязковими:
  // позиція може бути ще в плані закупівель, без узгоджених цін.
  if (material.buyer === 'contractor') {
    const cost = priceError(material.costPrice)
    const client = priceError(material.clientPrice)

    if (cost !== undefined) {
      errors.costPrice = cost
    }

    if (client !== undefined) {
      errors.clientPrice = client
    }
  }

  return errors
}

/** Помилки по рядках, ключ — id позиції. Порожні рядки в мапу не потрапляють. */
export function validateMaterials(materials: MaterialForm[]): Record<string, MaterialErrors> {
  const map: Record<string, MaterialErrors> = {}

  for (const material of materials) {
    const errors = validateMaterial(material)

    if (Object.keys(errors).length > 0) {
      map[material.id] = errors
    }
  }

  return map
}

/* ── Запит ─────────────────────────────────────────────────────── */

export interface MaterialPayload {
  name: string
  unit: string
  quantity: number
  buyer: MaterialBuyer
  cost_price?: number
  client_price?: number
  status: MaterialStatus
  approved_by_client: boolean
}

export function buildMaterialPayload(material: MaterialForm): MaterialPayload {
  const cost = parseAmount(material.costPrice)
  const client = parseAmount(material.clientPrice)
  const contractor = material.buyer === 'contractor'

  return {
    name: material.name.trim(),
    unit: material.unit,
    quantity: parseAmount(material.quantity) ?? 0,
    buyer: material.buyer,
    ...(contractor && cost !== null ? { cost_price: cost } : {}),
    ...(contractor && client !== null ? { client_price: client } : {}),
    status: material.status,
    approved_by_client: material.approved,
  }
}

/** Ресурс позиції у форматі майбутнього MaterialResource. */
export interface Material {
  id: number
  name: string
  unit: string
  quantity: number
  buyer: { value: MaterialBuyer; label: string }
  cost_price: number | null
  client_price: number | null
  status: { value: MaterialStatus; label: string }
  approved_by_client: boolean
}
