/**
 * Список обʼєктів: рівно те, за чим їх шукають і порівнюють між собою.
 * Профіт, розкладка матеріалів і платежі по одному лишаються всередині
 * картки — сюди йде тільки зведення, яке вміщується в рядок.
 */

import { daysBetween, formatDays, type ConstructionObject, type ObjectStatus } from '@/lib/objects'

/* ── Зведення по обʼєкту ───────────────────────────────────────── */

export interface ObjectSummary {
  /** Готовність за обсягами робіт, 0…1. null — етапів ще немає. */
  readiness: number | null
  /** Сума для клієнта: матеріали + роботи − знижка. */
  client: number
  /** Собівартість: закупівля матеріалів + ЗП виконавців. */
  cost: number
  /** Профіт однією цифрою: сума для клієнта − собівартість. */
  profit: number
  paid: number
  /** Залишок до сплати; відʼємний — переплата. */
  due: number
  /** Частка оплаченого, 0…1. */
  progress: number
  /** Днів до планового завершення; відʼємне — стільки вже прострочено. */
  daysLeft: number | null
  overdue: boolean
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

function materialsRevenue(object: ConstructionObject): number {
  let revenue = 0

  for (const material of object.materials) {
    // Матеріали замовника через нас не проходять — ми їх не виставляємо.
    if (material.buyer.value === 'client') {
      continue
    }

    revenue += (material.client_price ?? 0) * material.quantity
  }

  return revenue
}

function servicesRevenue(object: ConstructionObject): number {
  let revenue = 0

  for (const service of object.services) {
    // Той самий обсяг, що й у картці: факт, щойно він зʼявився, інакше план.
    const fact = service.actual_volume ?? 0
    const volume = fact > 0 ? fact : service.planned_volume

    revenue += (service.client_price ?? 0) * volume
  }

  return revenue
}

/**
 * Собівартість обʼєкта: закупівля матеріалів, які беремо ми, плюс зарплата
 * виконавців за роботами. Матеріали замовника грошей не коштують нам зовсім.
 */
function objectCost(object: ConstructionObject): number {
  let cost = 0

  for (const material of object.materials) {
    if (material.buyer.value === 'client') {
      continue
    }

    cost += (material.cost_price ?? 0) * material.quantity
  }

  for (const service of object.services) {
    for (const worker of service.workers) {
      cost += worker.volume * worker.rate
    }
  }

  return cost
}

function discountOf(object: ConstructionObject, gross: number): number {
  if (object.discount_amount !== null) {
    return Math.min(object.discount_amount, gross)
  }

  if (object.discount_percent === null) {
    return 0
  }

  return Math.round(gross * Math.min(object.discount_percent, 100)) / 100
}

/**
 * Готовність рахуємо за роботами обʼєкта — руками її не виставляють: цифра,
 * яку можна намалювати, нічого не варта.
 */
export function readiness(object: ConstructionObject): number | null {
  if (object.status.value === 'done') {
    return 1
  }

  const planned = object.services.reduce((sum, service) => sum + service.planned_volume, 0)

  if (planned <= 0) {
    return null
  }

  const done = object.services.reduce((sum, service) => {
    const fact =
      service.actual_volume ?? (service.status.value === 'done' ? service.planned_volume : 0)

    return sum + Math.min(fact, service.planned_volume)
  }, 0)

  return clamp01(done / planned)
}

/** Скільки робіт уже закрито — підпис під готовністю: «3 з 7 робіт виконано». */
export function servicesDone(object: ConstructionObject): { done: number; total: number } {
  const done = object.services.filter(
    (service) =>
      service.status.value === 'done' ||
      (service.planned_volume > 0 && (service.actual_volume ?? 0) >= service.planned_volume),
  ).length

  return { done, total: object.services.length }
}

export function objectSummary(object: ConstructionObject, today: string): ObjectSummary {
  const gross = materialsRevenue(object) + servicesRevenue(object)
  const client = gross - discountOf(object, gross)
  const cost = objectCost(object)

  const paid = object.payments.reduce(
    (sum, payment) => sum + (payment.status.value === 'paid' ? payment.amount : 0),
    0,
  )

  const daysLeft = object.finished_at === null ? null : daysBetween(today, object.finished_at)

  return {
    readiness: readiness(object),
    client,
    cost,
    profit: client - cost,
    paid,
    due: client - paid,
    progress: client === 0 ? 0 : clamp01(paid / client),
    daysLeft,
    overdue: daysLeft !== null && daysLeft < 0 && object.status.value !== 'done',
  }
}

/* ── Фільтри та сортування ─────────────────────────────────────── */

export type ObjectSort = 'created' | 'deadline'

export interface SortOption {
  value: ObjectSort
  label: string
}

export const OBJECT_SORTS: readonly SortOption[] = [
  { value: 'created', label: 'Спочатку нові' },
  { value: 'deadline', label: 'Найближчий дедлайн' },
]

/**
 * За замовчуванням показуємо тільки живі обʼєкти: інакше через півроку список
 * складається з давно закритих, і фільтр доводиться ставити щоразу руками.
 */
export const ACTIVE_STATUSES: readonly ObjectStatus[] = ['planned', 'in_progress']

export interface ObjectFilters {
  query: string
  /** Порожній список означає «усі статуси». */
  statuses: ObjectStatus[]
  clientId: number | null
  overdueOnly: boolean
  /** Архів лежить окремо: він не має розбавляти живі обʼєкти. */
  archived: boolean
  sort: ObjectSort
}

export function defaultObjectFilters(): ObjectFilters {
  return {
    query: '',
    statuses: [...ACTIVE_STATUSES],
    clientId: null,
    overdueOnly: false,
    archived: false,
    sort: 'created',
  }
}

export function isDefaultFilters(filters: ObjectFilters): boolean {
  const base = defaultObjectFilters()

  return (
    filters.query.trim() === '' &&
    filters.clientId === null &&
    !filters.overdueOnly &&
    !filters.archived &&
    filters.sort === base.sort &&
    filters.statuses.length === base.statuses.length &&
    base.statuses.every((status) => filters.statuses.includes(status))
  )
}

/** Один пошук по назві, адресі та замовнику — розділяти їх на MVP немає сенсу. */
export function matchesQuery(object: ConstructionObject, query: string): boolean {
  const needle = query.trim().toLowerCase()

  if (needle === '') {
    return true
  }

  return [object.name, object.address, object.client?.name ?? ''].some((field) =>
    field.toLowerCase().includes(needle),
  )
}

export interface ObjectRow {
  object: ConstructionObject
  summary: ObjectSummary
}

function createdAt(object: ConstructionObject): number {
  const time = object.created_at === null ? NaN : Date.parse(object.created_at)

  return Number.isNaN(time) ? object.id : time
}

function compare(left: ObjectRow, right: ObjectRow, sort: ObjectSort): number {
  if (sort === 'deadline') {
    // Обʼєкти без дати завершення не мають витісняти ті, у яких дедлайн горить.
    const a = left.summary.daysLeft
    const b = right.summary.daysLeft

    if (a === null || b === null) {
      return a === b ? 0 : a === null ? 1 : -1
    }

    return a - b
  }

  return createdAt(right.object) - createdAt(left.object)
}

/** Фільтрація й сортування одним проходом — саме в такому вигляді їх показує екран. */
export function buildObjectRows(
  items: ConstructionObject[],
  filters: ObjectFilters,
  today: string,
): ObjectRow[] {
  const rows = items.flatMap<ObjectRow>((object) => {
    // Архів — окремий режим перегляду, а не ще один статус у загальній купі.
    if (filters.archived !== (object.archived_at !== null)) {
      return []
    }

    if (filters.statuses.length > 0 && !filters.statuses.includes(object.status.value)) {
      return []
    }

    if (filters.clientId !== null && object.client?.id !== filters.clientId) {
      return []
    }

    if (!matchesQuery(object, filters.query)) {
      return []
    }

    const summary = objectSummary(object, today)

    return filters.overdueOnly && !summary.overdue ? [] : [{ object, summary }]
  })

  return rows.sort((left, right) => compare(left, right, filters.sort))
}

/** Скільки обʼєктів у кожному статусі — підписи до кнопок фільтра. */
export function countByStatus(items: ConstructionObject[]): Record<ObjectStatus, number> {
  const counts: Record<ObjectStatus, number> = {
    planned: 0,
    in_progress: 0,
    paused: 0,
    done: 0,
  }

  for (const object of items) {
    if (object.archived_at === null) {
      counts[object.status.value] += 1
    }
  }

  return counts
}

export function countArchived(items: ConstructionObject[]): number {
  return items.filter((object) => object.archived_at !== null).length
}

export interface ClientOption {
  id: number
  name: string
  /** Скільки обʼєктів за цим замовником — підпис у фільтрі. */
  count: number
}

/** Замовники, у яких справді є обʼєкти, — фільтрувати за рештою немає сенсу. */
export function clientsOf(items: ConstructionObject[]): ClientOption[] {
  const map = new Map<number, ClientOption>()

  for (const object of items) {
    if (object.client === null) {
      continue
    }

    const known = map.get(object.client.id)

    if (known === undefined) {
      map.set(object.client.id, { id: object.client.id, name: object.client.name, count: 1 })
    } else {
      known.count += 1
    }
  }

  return [...map.values()].sort((left, right) => left.name.localeCompare(right.name))
}

/* ── Підписи ───────────────────────────────────────────────────── */

/** «Прострочено 3 дні», «Сьогодні», «Через 12 днів». */
export function formatDeadline(daysLeft: number | null, overdue: boolean): string {
  if (daysLeft === null) {
    return 'Без дедлайну'
  }

  if (daysLeft === 0) {
    return 'Сьогодні'
  }

  if (daysLeft > 0) {
    return `Через ${formatDays(daysLeft)}`
  }

  return overdue
    ? `Прострочено ${formatDays(daysLeft)}`
    : `Завершено із запізненням ${formatDays(daysLeft)}`
}
