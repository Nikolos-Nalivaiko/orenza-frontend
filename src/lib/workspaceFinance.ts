import { isPaymentLate, objectFinance, type ObjectFinance, type Payment } from '@/lib/finance'
import { daysBetween, type ConstructionObject } from '@/lib/objects'
import { monthOf, shiftMonth } from '@/lib/schedule'

export function isLive(object: ConstructionObject): boolean {
  return object.archived_at === null
}

export function isOverdue(payment: Payment, today: string): boolean {
  return payment.status.value === 'overdue' || isPaymentLate(payment, today)
}

function isOpen(payment: Payment): boolean {
  return payment.status.value === 'pending' || payment.status.value === 'overdue'
}

export interface MoneyTotals {
  contracted: number
  cost: number
  profit: number
  margin: number | null
  paid: number
  paidThisMonth: number
  due: number
  overdue: number
  objects: number
}

export function moneyTotals(objects: ConstructionObject[], today: string): MoneyTotals {
  const month = monthOf(today)
  const totals: MoneyTotals = {
    contracted: 0,
    cost: 0,
    profit: 0,
    margin: null,
    paid: 0,
    paidThisMonth: 0,
    due: 0,
    overdue: 0,
    objects: 0,
  }

  for (const object of objects) {
    for (const payment of object.payments) {
      if (payment.status.value === 'paid' && payment.paid_at?.startsWith(month) === true) {
        totals.paidThisMonth += payment.amount
      }
    }

    if (!isLive(object)) {
      continue
    }

    const finance = objectFinance(object, today)

    totals.objects += 1
    totals.contracted += finance.client
    totals.cost += finance.cost
    totals.profit += finance.profit
    totals.paid += finance.paid
    totals.due += finance.due

    for (const payment of object.payments) {
      if (isOverdue(payment, today)) {
        totals.overdue += payment.amount
      }
    }
  }

  totals.margin = totals.contracted === 0 ? null : totals.profit / totals.contracted

  return totals
}

export const INCOME_BACK = 9
export const INCOME_AHEAD = 2

export interface MonthIncome {
  month: string
  paid: number
  expected: number
  late: number
  current: boolean
}

export function incomeByMonth(
  objects: ConstructionObject[],
  today: string,
  back: number = INCOME_BACK,
  ahead: number = INCOME_AHEAD,
): MonthIncome[] {
  const now = monthOf(today)
  const months: MonthIncome[] = Array.from({ length: back + ahead + 1 }, (_, index) => {
    const month = shiftMonth(now, index - back)

    return { month, paid: 0, expected: 0, late: 0, current: month === now }
  })

  const byMonth = new Map(months.map((item) => [item.month, item]))

  for (const object of objects) {
    for (const payment of object.payments) {
      if (payment.paid_at === null) {
        continue
      }

      const bucket = byMonth.get(monthOf(payment.paid_at))

      if (bucket === undefined) {
        continue
      }

      if (payment.status.value === 'paid') {
        bucket.paid += payment.amount
      } else if (isOpen(payment) && isLive(object)) {
        if (isOverdue(payment, today)) {
          bucket.late += payment.amount
        } else {
          bucket.expected += payment.amount
        }
      }
    }
  }

  return months
}

export interface PaymentRow {
  payment: Payment
  object: { id: number; name: string; client: string | null }
  late: boolean
  daysLate: number
}

function rowOf(object: ConstructionObject, payment: Payment, today: string): PaymentRow {
  const late = isOverdue(payment, today)
  const days = payment.paid_at === null ? 0 : (daysBetween(payment.paid_at, today) ?? 0)

  return {
    payment,
    object: { id: object.id, name: object.name, client: object.client?.name ?? null },
    late,
    daysLate: late ? Math.max(days, 1) : 0,
  }
}

export type AgingBucket = 'current' | 'late30' | 'late60' | 'late90'

export const AGING_LABELS: Record<AgingBucket, string> = {
  current: 'Строк не настав',
  late30: '1–30 днів',
  late60: '31–60 днів',
  late90: 'Понад 60 днів',
}

export function agingBucket(daysLate: number): AgingBucket {
  if (daysLate <= 0) {
    return 'current'
  }

  if (daysLate <= 30) {
    return 'late30'
  }

  return daysLate <= 60 ? 'late60' : 'late90'
}

export interface AgingGroup {
  bucket: AgingBucket
  label: string
  amount: number
  count: number
}

export interface Receivables {
  groups: AgingGroup[]
  debtors: PaymentRow[]
  scheduled: number
  overdue: number
  unscheduled: number
}

export function receivables(objects: ConstructionObject[], today: string): Receivables {
  const groups = new Map<AgingBucket, AgingGroup>(
    (Object.keys(AGING_LABELS) as AgingBucket[]).map((bucket) => [
      bucket,
      { bucket, label: AGING_LABELS[bucket], amount: 0, count: 0 },
    ]),
  )

  const debtors: PaymentRow[] = []
  let scheduled = 0
  let overdue = 0
  let unscheduled = 0

  for (const object of objects) {
    if (!isLive(object)) {
      continue
    }

    let open = 0

    for (const payment of object.payments) {
      if (!isOpen(payment)) {
        continue
      }

      const row = rowOf(object, payment, today)
      const group = groups.get(agingBucket(row.daysLate))

      open += payment.amount
      scheduled += payment.amount

      if (group !== undefined) {
        group.amount += payment.amount
        group.count += 1
      }

      if (row.late) {
        overdue += payment.amount
        debtors.push(row)
      }
    }

    unscheduled += Math.max(objectFinance(object, today).due - open, 0)
  }

  debtors.sort((left, right) => right.daysLate - left.daysLate)

  return { groups: [...groups.values()], debtors, scheduled, overdue, unscheduled }
}

export interface ObjectMargin {
  object: ConstructionObject
  finance: ObjectFinance
  margin: number | null
}

export function objectMargins(objects: ConstructionObject[], today: string): ObjectMargin[] {
  return objects.flatMap((object) => {
    if (!isLive(object)) {
      return []
    }

    const finance = objectFinance(object, today)

    if (finance.client === 0 && finance.cost === 0) {
      return []
    }

    return [
      { object, finance, margin: finance.client === 0 ? null : finance.profit / finance.client },
    ]
  })
}

export type PaymentTab = 'all' | 'paid' | 'expected' | 'late'

export const PAYMENT_TABS: readonly { value: PaymentTab; label: string }[] = [
  { value: 'all', label: 'Усі' },
  { value: 'paid', label: 'Отримані' },
  { value: 'expected', label: 'Очікуються' },
  { value: 'late', label: 'Прострочені' },
]

export function paymentTab(row: PaymentRow): Exclude<PaymentTab, 'all'> {
  if (row.payment.status.value === 'paid') {
    return 'paid'
  }

  return row.late ? 'late' : 'expected'
}

export function paymentRows(objects: ConstructionObject[], today: string): PaymentRow[] {
  return objects.flatMap((object) =>
    object.payments.flatMap((payment) => {
      if (payment.status.value === 'cancelled') {
        return []
      }

      if (payment.status.value !== 'paid' && !isLive(object)) {
        return []
      }

      return [rowOf(object, payment, today)]
    }),
  )
}

export function countTabs(rows: PaymentRow[]): Record<PaymentTab, number> {
  const counts: Record<PaymentTab, number> = { all: rows.length, paid: 0, expected: 0, late: 0 }

  for (const row of rows) {
    counts[paymentTab(row)] += 1
  }

  return counts
}

function byDate(left: PaymentRow, right: PaymentRow): number {
  const a = left.payment.paid_at ?? ''
  const b = right.payment.paid_at ?? ''

  if (a === '' || b === '') {
    return a === b ? 0 : a === '' ? 1 : -1
  }

  return a.localeCompare(b)
}

const TAB_ORDER: Record<Exclude<PaymentTab, 'all'>, number> = { late: 0, expected: 1, paid: 2 }

export function filterPayments(rows: PaymentRow[], tab: PaymentTab, query: string): PaymentRow[] {
  const needle = query.trim().toLowerCase()

  const list = rows.filter((row) => {
    if (tab !== 'all' && paymentTab(row) !== tab) {
      return false
    }

    if (needle === '') {
      return true
    }

    return [
      row.payment.name,
      row.payment.description ?? '',
      row.object.name,
      row.object.client ?? '',
    ]
      .join(' ')
      .toLowerCase()
      .includes(needle)
  })

  return list.sort((left, right) => {
    const a = paymentTab(left)
    const b = paymentTab(right)

    if (a !== b) {
      return TAB_ORDER[a] - TAB_ORDER[b]
    }

    return a === 'paid' ? byDate(right, left) : byDate(left, right)
  })
}

export interface Scale {
  min: number
  max: number
  ticks: number[]
}

export function niceScale(high: number, count: number = 4): Scale {
  if (high <= 0) {
    return { min: 0, max: 1, ticks: [0] }
  }

  const raw = high / count
  const power = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((factor) => factor * power).find((value) => value >= raw)!
  const top = Math.ceil(high / step) * step

  return {
    min: 0,
    max: top,
    ticks: Array.from({ length: Math.round(top / step) + 1 }, (_, index) =>
      Math.round(index * step),
    ),
  }
}

const compact = new Intl.NumberFormat('uk-UA', { notation: 'compact', maximumFractionDigits: 1 })

export function formatCompact(value: number): string {
  return compact.format(value)
}

const percentFormat = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 1 })

export function formatPercent(share: number): string {
  return `${percentFormat.format(share * 100)}%`
}

const monthShort = new Intl.DateTimeFormat('uk-UA', { month: 'short', timeZone: 'UTC' })
const monthLong = new Intl.DateTimeFormat('uk-UA', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatMonthShort(month: string): string {
  return monthShort.format(new Date(`${month}-01T12:00:00Z`)).replace('.', '')
}

export function formatMonthLong(month: string): string {
  return monthLong.format(new Date(`${month}-01T12:00:00Z`)).replace(/\s*р\.$/, '')
}
