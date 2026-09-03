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

import type { IconName } from '@/components/ui/icons'
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

/** Значок стадії: список → очікування → ящик на майданчику → зроблено. */
export const MATERIAL_STATUS_ICONS: Record<MaterialStatus, IconName> = {
  needed: 'estimate',
  ordered: 'clock',
  delivered: 'box',
  used: 'check',
}

/** Місце статусу в життєвому шляху позиції — за ним же їх і сортуємо. */
export function materialStatusIndex(status: MaterialStatus): number {
  return MATERIAL_STATUSES.findIndex((option) => option.value === status)
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

/* ── Закупівлі обʼєкта ─────────────────────────────────────────── */

/**
 * Далі — те, чим живе вкладка «Матеріали» в картці обʼєкта: там позиції вже
 * не форма, а збережені записи, і рахуються вони рядком цілком, а не за
 * одиницю. Правило те саме, що й у формі: у матеріалів замовника грошей
 * немає взагалі, тож обидві суми там null, а не нуль.
 */

export function materialCostTotal(material: Material): number | null {
  return material.buyer.value === 'client' ? null : (material.cost_price ?? 0) * material.quantity
}

export function materialClientTotal(material: Material): number | null {
  return material.buyer.value === 'client' ? null : (material.client_price ?? 0) * material.quantity
}

export function materialLineProfit(material: Material): number | null {
  const cost = materialCostTotal(material)
  const revenue = materialClientTotal(material)

  return cost === null || revenue === null ? null : revenue - cost
}

export interface MaterialsSummary {
  /** Позицій усього — саме стільки рядків у таблиці. */
  total: number
  /** З них купує замовник напряму: у грошах обʼєкта їх немає. */
  clientCount: number
  cost: number
  revenue: number
  profit: number
  /** Скільки позицій на кожній стадії закупівлі. */
  byStatus: Record<MaterialStatus, number>
}

export function materialsSummary(materials: Material[]): MaterialsSummary {
  const summary: MaterialsSummary = {
    total: materials.length,
    clientCount: 0,
    cost: 0,
    revenue: 0,
    profit: 0,
    byStatus: { needed: 0, ordered: 0, delivered: 0, used: 0 },
  }

  for (const material of materials) {
    summary.byStatus[material.status.value] += 1

    if (material.buyer.value === 'client') {
      summary.clientCount += 1

      continue
    }

    summary.cost += materialCostTotal(material) ?? 0
    summary.revenue += materialClientTotal(material) ?? 0
  }

  summary.profit = summary.revenue - summary.cost

  return summary
}

/** 1 позиція, 2–4 позиції, 5+ позицій. */
export function formatPositions(count: number): string {
  const tail = count % 100 >= 11 && count % 100 <= 14 ? 0 : count % 10

  if (tail === 1) {
    return `${count} позиція`
  }

  return tail >= 2 && tail <= 4 ? `${count} позиції` : `${count} позицій`
}

/* ── Фільтри та сортування ─────────────────────────────────────── */

export type MaterialSort = 'added' | 'status' | 'name' | 'amount'

export interface MaterialSortOption {
  value: MaterialSort
  label: string
}

export const MATERIAL_SORTS: readonly MaterialSortOption[] = [
  { value: 'added', label: 'Як додано' },
  { value: 'status', label: 'За стадією' },
  { value: 'name', label: 'За назвою' },
  { value: 'amount', label: 'Найдорожчі' },
]

export interface MaterialFilters {
  query: string
  /** Порожній список означає «усі стадії». */
  statuses: MaterialStatus[]
  /** null — не важливо, хто купує. */
  buyer: MaterialBuyer | null
  sort: MaterialSort
}

export function defaultMaterialFilters(): MaterialFilters {
  return { query: '', statuses: [], buyer: null, sort: 'added' }
}

export function isDefaultMaterialFilters(filters: MaterialFilters): boolean {
  return (
    filters.query.trim() === '' &&
    filters.statuses.length === 0 &&
    filters.buyer === null &&
    filters.sort === 'added'
  )
}

function compareMaterials(left: Material, right: Material, sort: MaterialSort): number {
  if (sort === 'status') {
    return materialStatusIndex(left.status.value) - materialStatusIndex(right.status.value)
  }

  if (sort === 'name') {
    return left.name.localeCompare(right.name, 'uk')
  }

  if (sort === 'amount') {
    return (materialClientTotal(right) ?? 0) - (materialClientTotal(left) ?? 0)
  }

  return 0
}

/** Фільтрація й сортування одним проходом — рівно те, що показує таблиця. */
export function filterMaterials(materials: Material[], filters: MaterialFilters): Material[] {
  const needle = filters.query.trim().toLowerCase()

  const rows = materials.filter((material) => {
    if (filters.statuses.length > 0 && !filters.statuses.includes(material.status.value)) {
      return false
    }

    if (filters.buyer !== null && material.buyer.value !== filters.buyer) {
      return false
    }

    return needle === '' || material.name.toLowerCase().includes(needle)
  })

  // Сортування стабільне, тож «Як додано» лишає позиції в порядку введення.
  return rows.sort((left, right) => compareMaterials(left, right, filters.sort))
}
