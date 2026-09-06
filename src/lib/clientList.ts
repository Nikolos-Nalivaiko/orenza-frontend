/**
 * Список замовників — довідник людей, а не вітрина обʼєктів.
 *
 * Тут навмисно рівно те, за чим замовника шукають і оцінюють одним поглядом:
 * як звати, куди дзвонити, скільки в нього обʼєктів, скільки він винен разом і
 * коли по ньому востаннє щось рухалось. Профіт, середній чек і розкладка
 * платежів лишаються в картці: у рядку списку вони перетворюються на шум, з
 * якого однаково нічого не вирішиш.
 *
 * Нічого нового тут не рахується: суми бере clientTotals, який уже працює в
 * картці замовника, — інакше та сама людина мала б у списку й у картці різний
 * борг. Коли зʼявиться GET /api/v1/workspaces/{id}/clients, зміниться лише
 * джерело: ClientRow — уже той формат, у якому екран показує рядок.
 */

import { momentTime } from '@/lib/activity'
import { clientObjects, clientTotals, isRegularClient, type ClientTotals } from '@/lib/clients'
import type { Client, ConstructionObject } from '@/lib/objects'

/* ── Остання активність ────────────────────────────────────────── */

/**
 * Останній рух по замовнику. Це не стрічка подій — це відповідь на «коли ми з
 * ним востаннє щось робили»: у довгому списку саме вона відділяє живих людей
 * від тих, з ким усе давно закінчилось.
 *
 * Беремо тільки те, що видно з самих обʼєктів: заведення обʼєкта, фактичний
 * початок і завершення робіт та отримані платежі. Журнал дій (зміна статусу,
 * правка знижки) сюди не йде навмисно: рух по замовнику — це те, що сталось
 * на будові чи з грішми, а не те, що хтось поправив у картці.
 */
export interface ClientEvent {
  /** Момент події: день або повний ISO — той самий формат, що й у стрічці. */
  at: string
  /** Що саме сталося: «платіж», «новий обʼєкт». */
  text: string
}

function lastEvent(objects: ConstructionObject[]): ClientEvent | null {
  let last: ClientEvent | null = null

  function consider(at: string | null, text: string): void {
    if (at === null || at === '') {
      return
    }

    if (last === null || momentTime(at) > momentTime(last.at)) {
      last = { at, text }
    }
  }

  for (const object of objects) {
    consider(object.created_at, 'новий обʼєкт')
    consider(object.actual_started_at, 'роботи почалися')
    consider(object.actual_finished_at, 'обʼєкт завершено')

    for (const payment of object.payments) {
      // Обіцяний платіж рухом не є: у списку він виглядав би як гроші.
      if (payment.status.value === 'paid') {
        consider(payment.paid_at, 'платіж')
      }
    }
  }

  return last
}

/* ── Рядок списку ──────────────────────────────────────────────── */

export interface ClientRow {
  client: Client
  totals: ClientTotals
  /** Другий обʼєкт — уже не випадковість: мітка ставиться сама. */
  regular: boolean
  last: ClientEvent | null
}

/** Усі замовники простору з їхніми цифрами — без фільтрів і сортування. */
export function clientRows(
  clients: Client[],
  objects: ConstructionObject[],
  today: string,
): ClientRow[] {
  return clients.map((client) => {
    const own = clientObjects(objects, client.id)
    const totals = clientTotals(own, today)

    return { client, totals, regular: isRegularClient(totals.objects), last: lastEvent(own) }
  })
}

/* ── Фільтри та сортування ─────────────────────────────────────── */

export type ClientSort = 'activity' | 'due' | 'name'

export interface ClientSortOption {
  value: ClientSort
  label: string
}

export const CLIENT_SORTS: readonly ClientSortOption[] = [
  { value: 'activity', label: 'Остання активність' },
  { value: 'due', label: 'Спочатку боржники' },
  { value: 'name', label: 'За абеткою' },
]

/** Постійний — той, у кого більше одного обʼєкта; разовий — решта. */
export type ClientKind = 'all' | 'regular' | 'single'

export interface ClientFilters {
  query: string
  kind: ClientKind
  /** Тільки ті, хто винен: з ким треба вирішувати питання оплати. */
  debtOnly: boolean
  sort: ClientSort
}

/**
 * За замовчуванням зверху стоять найживіші: у довіднику на сотню людей
 * абетка ховає тих, з ким працюють просто зараз.
 */
export function defaultClientFilters(): ClientFilters {
  return { query: '', kind: 'all', debtOnly: false, sort: 'activity' }
}

export function isDefaultClientFilters(filters: ClientFilters): boolean {
  const base = defaultClientFilters()

  return (
    filters.query.trim() === '' &&
    filters.kind === base.kind &&
    filters.debtOnly === base.debtOnly &&
    filters.sort === base.sort
  )
}

/** Копійки округлень не роблять із людини боржника. */
const DEBT_MIN = 0.01

/** Цифри номера: у довіднику він з плюсом і пробілами, у пошуку — як завгодно. */
function digits(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Один рядок пошуку на імʼя, контактну особу й телефон. Розділяти їх на окремі
 * поля немає сенсу: людина однаково вводить те, що памʼятає, — чи то прізвище,
 * чи то останні цифри номера.
 */
export function matchesClientQuery(client: Client, query: string): boolean {
  const needle = query.trim().toLowerCase()

  if (needle === '') {
    return true
  }

  const number = digits(needle)

  // Дві цифри є в будь-якому номері — за ними шукати нічого.
  if (number.length >= 3 && digits(client.phone).includes(number)) {
    return true
  }

  return [client.name, client.contact].some((field) => field.toLowerCase().includes(needle))
}

function byName(left: ClientRow, right: ClientRow): number {
  return left.client.name.localeCompare(right.client.name, 'uk')
}

function compare(left: ClientRow, right: ClientRow, sort: ClientSort): number {
  if (sort === 'name') {
    return byName(left, right)
  }

  if (sort === 'due') {
    const diff = right.totals.due - left.totals.due

    // Ті, хто нічого не винен, не мають перемішуватись при кожному відкритті.
    return Math.abs(diff) < DEBT_MIN ? byName(left, right) : diff
  }

  const diff =
    (right.last === null ? 0 : momentTime(right.last.at)) -
    (left.last === null ? 0 : momentTime(left.last.at))

  // Замовник без жодного руху опиняється в кінці — і там уже за абеткою.
  return diff === 0 ? byName(left, right) : diff
}

export function applyClientFilters(rows: ClientRow[], filters: ClientFilters): ClientRow[] {
  const found = rows.filter((row) => {
    if (filters.kind === 'regular' && !row.regular) {
      return false
    }

    if (filters.kind === 'single' && row.regular) {
      return false
    }

    if (filters.debtOnly && row.totals.due < DEBT_MIN) {
      return false
    }

    return matchesClientQuery(row.client, filters.query)
  })

  return found.sort((left, right) => compare(left, right, filters.sort))
}

/** Скільки кого — підписи до кнопок фільтра. */
export interface ClientCounts {
  all: number
  regular: number
  single: number
  debt: number
}

export function countClients(rows: ClientRow[]): ClientCounts {
  const counts: ClientCounts = { all: rows.length, regular: 0, single: 0, debt: 0 }

  for (const row of rows) {
    if (row.regular) {
      counts.regular += 1
    } else {
      counts.single += 1
    }

    if (row.totals.due >= DEBT_MIN) {
      counts.debt += 1
    }
  }

  return counts
}

/** Скільки грошей висить на всіх показаних замовниках разом. */
export function totalDue(rows: ClientRow[]): number {
  return rows.reduce((sum, row) => sum + Math.max(0, row.totals.due), 0)
}
