import { parseAmount } from '@/lib/amount'
import {
  materialClientTotal,
  materialCostTotal,
  materialsTotals,
  type Material,
  type MaterialForm,
} from '@/lib/materials'
import {
  serviceCostTotal,
  serviceRevenueTotal,
  servicesTotals,
  type Service,
  type ServiceForm,
} from '@/lib/services'

export type PaymentStatus = 'pending' | 'paid' | 'overdue' | 'cancelled'

export interface PaymentStatusOption {
  value: PaymentStatus
  label: string
}

export const PAYMENT_STATUSES: readonly PaymentStatusOption[] = [
  { value: 'pending', label: 'В очікуванні' },
  { value: 'paid', label: 'Оплачено' },
  { value: 'overdue', label: 'Прострочено' },
  { value: 'cancelled', label: 'Скасовано' },
]

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'В очікуванні',
  paid: 'Оплачено',
  overdue: 'Прострочено',
  cancelled: 'Скасовано',
}

export interface PaymentForm {
  id: string
  name: string
  description: string
  amount: string
  status: PaymentStatus
  date: string
}

export const PAYMENT_NAME_MAX = 255
export const PAYMENT_DESCRIPTION_MAX = 500

let sequence = 0

export function nextPaymentId(): string {
  sequence += 1

  return `p-${sequence}`
}

export function emptyPayment(): PaymentForm {
  return {
    id: nextPaymentId(),
    name: '',
    description: '',
    amount: '',
    status: 'pending',
    date: '',
  }
}

export function normalizePayment(payment: Partial<PaymentForm>): PaymentForm {
  return {
    id: payment.id ?? nextPaymentId(),
    name: payment.name ?? '',
    description: payment.description ?? '',
    amount: payment.amount ?? '',
    status: payment.status ?? 'pending',
    date: payment.date ?? '',
  }
}

export function paymentAmount(payment: PaymentForm): number {
  return parseAmount(payment.amount) ?? 0
}

export function isLate(payment: PaymentForm, today: string): boolean {
  return payment.status === 'pending' && payment.date !== '' && payment.date < today
}

export interface PaymentsTotals {
  count: number
  paid: number
  pending: number
  overdue: number
}

export function paymentsTotals(payments: PaymentForm[]): PaymentsTotals {
  const totals: PaymentsTotals = { count: payments.length, paid: 0, pending: 0, overdue: 0 }

  for (const payment of payments) {
    if (payment.status === 'cancelled') {
      continue
    }

    totals[payment.status] += paymentAmount(payment)
  }

  return totals
}

export type DiscountKind = 'percent' | 'amount'

export const DISCOUNT_KIND_LABELS: Record<DiscountKind, string> = {
  percent: '%',
  amount: '₴',
}

export const DISCOUNT_PERCENT_MAX = 100

/**
 * Знижка на обʼєкт. У розрахунок іде завжди вона — персональна знижка
 * замовника лише підставляє сюди значення за замовчуванням.
 */
export interface DiscountForm {
  kind: DiscountKind
  value: string
  /** Значення прийшло від замовника й досі їде за ним, бо його не правили руками. */
  fromClient: boolean
}

export function emptyDiscount(): DiscountForm {
  return { kind: 'percent', value: '', fromClient: true }
}

/** Персональна знижка замовника у вигляді знижки обʼєкта. */
export function clientDiscount(percent: number): DiscountForm {
  return { kind: 'percent', value: percent > 0 ? String(percent) : '', fromClient: true }
}

export function normalizeDiscount(discount: Partial<DiscountForm> | undefined): DiscountForm {
  return {
    kind: discount?.kind ?? 'percent',
    value: discount?.value ?? '',
    fromClient: discount?.fromClient ?? true,
  }
}

/** Скільки гривень знімає знижка. Більше, ніж є, вона зняти не може. */
export function discountAmount(discount: DiscountForm, gross: number): number {
  const value = parseAmount(discount.value)

  if (value === null || value <= 0) {
    return 0
  }

  if (discount.kind === 'amount') {
    return Math.min(value, gross)
  }

  const percent = Math.min(value, DISCOUNT_PERCENT_MAX)

  return Math.round(((gross * percent) / 100) * 100) / 100
}

/** Усе, з чого складаються гроші обʼєкта. ObjectForm підходить як є. */
export interface FinanceInput {
  materials: MaterialForm[]
  services: ServiceForm[]
  discount: DiscountForm
  payments: PaymentForm[]
}

export interface FinanceTotals {
  /** Матеріали замовнику — лише ті, які закуповуємо ми. */
  materials: number
  /** Роботи замовнику: за фактом, де він уже є, інакше за планом. */
  services: number
  /** Матеріали + роботи, ще без знижки. */
  gross: number
  /** Знижка в гривнях — скільки б її не вводили відсотками. */
  discount: number
  /** Сума для клієнта — те, що він винен за обʼєкт разом. */
  client: number
  /** Собівартість: закупівля матеріалів + ЗП виконавців. */
  cost: number
  /** Профіт однією цифрою: сума для клієнта − собівартість. */
  profit: number
  paid: number
  pending: number
  overdue: number
  /** Залишок до сплати; відʼємний — це переплата. */
  due: number
  /** Частка оплаченого від суми для клієнта, 0…1. */
  progress: number
}

export function financeTotals(input: FinanceInput): FinanceTotals {
  const materials = materialsTotals(input.materials)
  const services = servicesTotals(input.services)
  const payments = paymentsTotals(input.payments)

  const gross = materials.revenue + services.revenue
  const discount = discountAmount(input.discount, gross)
  const client = gross - discount
  const cost = materials.cost + services.cost

  return {
    materials: materials.revenue,
    services: services.revenue,
    gross,
    discount,
    client,
    cost,
    profit: client - cost,
    paid: payments.paid,
    pending: payments.pending,
    overdue: payments.overdue,
    due: client - payments.paid,
    progress: client === 0 ? 0 : Math.min(1, payments.paid / client),
  }
}

/* ── Валідація ─────────────────────────────────────────────────── */

export type PaymentErrors = Partial<Record<'name' | 'amount' | 'date', string>>

export interface FinanceErrors {
  discount?: string
  /** Помилки по платежах, ключ — id рядка. Справні рядки в мапу не потрапляють. */
  payments?: Record<string, PaymentErrors>
}

function discountError(discount: DiscountForm, gross: number): string | undefined {
  if (discount.value.trim() === '') {
    return undefined
  }

  const value = parseAmount(discount.value)

  if (value === null) {
    return 'Тільки число'
  }

  if (value < 0) {
    return 'Не менше нуля'
  }

  if (discount.kind === 'percent') {
    return value > DISCOUNT_PERCENT_MAX ? `Максимум ${DISCOUNT_PERCENT_MAX}%` : undefined
  }

  return value > gross ? 'Знижка більша за суму матеріалів і робіт' : undefined
}

export function validatePayment(payment: PaymentForm): PaymentErrors {
  const errors: PaymentErrors = {}
  const name = payment.name.trim()

  if (name === '') {
    errors.name = 'Вкажіть, за що платіж'
  } else if (name.length > PAYMENT_NAME_MAX) {
    errors.name = `Максимум ${PAYMENT_NAME_MAX} символів`
  }

  const amount = parseAmount(payment.amount)

  if (payment.amount.trim() === '') {
    errors.amount = 'Вкажіть суму'
  } else if (amount === null) {
    errors.amount = 'Тільки число'
  } else if (amount <= 0) {
    errors.amount = 'Більше нуля'
  }

  // Дата потрібна там, де гроші вже рухались: без неї платіж не лягає в жоден
  // період і не зводиться з випискою.
  if (payment.status === 'paid' && payment.date === '') {
    errors.date = 'Оплачено — вкажіть, коли'
  }

  return errors
}

export function validateFinance(input: FinanceInput): FinanceErrors {
  const errors: FinanceErrors = {}
  const gross = materialsTotals(input.materials).revenue + servicesTotals(input.services).revenue
  const discount = discountError(input.discount, gross)

  if (discount !== undefined) {
    errors.discount = discount
  }

  const payments: Record<string, PaymentErrors> = {}

  for (const payment of input.payments) {
    const paymentErrors = validatePayment(payment)

    if (Object.keys(paymentErrors).length > 0) {
      payments[payment.id] = paymentErrors
    }
  }

  if (Object.keys(payments).length > 0) {
    errors.payments = payments
  }

  return errors
}

export function hasFinanceErrors(errors: FinanceErrors): boolean {
  return errors.discount !== undefined || errors.payments !== undefined
}

/* ── Запит ─────────────────────────────────────────────────────── */

export interface PaymentPayload {
  name: string
  description?: string
  amount: number
  status: PaymentStatus
  paid_at?: string
  /** Показати коментар платежу замовнику на публічній сторінці. */
  client_visible?: boolean
}

export function buildPaymentPayload(payment: PaymentForm): PaymentPayload {
  const description = payment.description.trim()

  return {
    name: payment.name.trim(),
    ...(description === '' ? {} : { description }),
    amount: paymentAmount(payment),
    status: payment.status,
    ...(payment.date === '' ? {} : { paid_at: payment.date }),
  }
}

/**
 * Ресурс платежу у форматі майбутнього PaymentResource.
 *
 * `paid_at` — дата платежу в обидві сторони: коли гроші прийшли, якщо він
 * оплачений, і коли їх чекають, якщо він ще в очікуванні. Другого поля під
 * дату немає навмисно: графік надходжень — це той самий список платежів,
 * а не окремий модуль рахунків.
 */
export interface Payment {
  id: number
  name: string
  description: string | null
  amount: number
  status: { value: PaymentStatus; label: string }
  paid_at: string | null
  /**
   * Коментар до платежу видно замовнику на публічній сторінці. За
   * замовчуванням — ні: «спитати бухгалтера» писали для себе, а не для нього.
   */
  client_visible: boolean
}

/* ── Гроші обʼєкта ─────────────────────────────────────────────── */

/**
 * Далі — те, чим живе вкладка «Фінанси» в картці обʼєкта. Нічого нового тут
 * не рахується: суми приходять з матеріалів і робіт за тими самими правилами,
 * що діють на їхніх вкладках, а знижка й платежі лише зводять їх докупи.
 */

/** Записи, з яких складаються гроші картки. ConstructionObject підходить як є. */
export interface FinanceRecords {
  materials: Material[]
  services: Service[]
  discount_percent: number | null
  discount_amount: number | null
  payments: Payment[]
}

/** Рядок розкладки: скільки виставляємо клієнту й скільки це коштує нам. */
export interface FinanceLine {
  revenue: number
  cost: number
}

export interface ObjectFinance {
  materials: FinanceLine
  services: FinanceLine
  /** Матеріали + роботи, ще без знижки. */
  gross: number
  /** Знижка в гривнях — скільки б її не вводили відсотками. */
  discount: number
  client: number
  cost: number
  profit: number
  paid: number
  /** Ще очікується: платежі, які позначили як заплановані. */
  pending: number
  /** З них прострочені — день очікування вже позаду. */
  overdue: number
  /** Залишок до сплати; відʼємний — це переплата. */
  due: number
  /** Частка оплаченого від суми для клієнта, 0…1. */
  progress: number
}

/** Знижка обʼєкта в гривнях. Більше, ніж є, вона зняти не може. */
export function recordDiscount(
  percent: number | null,
  amount: number | null,
  gross: number,
): number {
  if (amount !== null) {
    return Math.min(amount, gross)
  }

  if (percent === null) {
    return 0
  }

  return Math.round(gross * Math.min(percent, DISCOUNT_PERCENT_MAX)) / 100
}

/** Платіж чекали раніше, ніж сьогодні, а він досі не прийшов. */
export function isPaymentLate(payment: Payment, today: string): boolean {
  return payment.status.value === 'pending' && payment.paid_at !== null && payment.paid_at < today
}

export function objectFinance(records: FinanceRecords, today: string): ObjectFinance {
  const materials: FinanceLine = { revenue: 0, cost: 0 }
  const services: FinanceLine = { revenue: 0, cost: 0 }

  for (const material of records.materials) {
    materials.revenue += materialClientTotal(material) ?? 0
    materials.cost += materialCostTotal(material) ?? 0
  }

  for (const service of records.services) {
    services.revenue += serviceRevenueTotal(service)
    services.cost += serviceCostTotal(service)
  }

  const gross = materials.revenue + services.revenue
  const discount = recordDiscount(records.discount_percent, records.discount_amount, gross)
  const client = gross - discount
  const cost = materials.cost + services.cost

  let paid = 0
  let pending = 0
  let overdue = 0

  for (const payment of records.payments) {
    if (payment.status.value === 'cancelled') {
      continue
    }

    if (payment.status.value === 'paid') {
      paid += payment.amount

      continue
    }

    pending += payment.amount

    if (isPaymentLate(payment, today)) {
      overdue += payment.amount
    }
  }

  return {
    materials,
    services,
    gross,
    discount,
    client,
    cost,
    profit: client - cost,
    paid,
    pending,
    overdue,
    due: client - paid,
    progress: client === 0 ? 0 : Math.min(1, paid / client),
  }
}

/**
 * Автостатус залишку — світлофор, який власник читає першим: не оплачено,
 * частково, повністю, переплата.
 */
export type DueState = 'none' | 'partial' | 'paid' | 'over'

export const DUE_STATE_LABELS: Record<DueState, string> = {
  none: 'Не оплачено',
  partial: 'Оплачено частково',
  paid: 'Оплачено повністю',
  over: 'Переплата',
}

export function dueState(client: number, paid: number): DueState {
  // Копійчана різниця після відсоткової знижки не має читатись як недоплата.
  const left = client - paid

  if (paid > 0 && left < -0.01) {
    return 'over'
  }

  if (client > 0 && left <= 0.01) {
    return 'paid'
  }

  return paid > 0 ? 'partial' : 'none'
}

/**
 * Порядок списку платежів: спочатку історія — що вже отримали, свіже зверху,
 * далі те, що ще чекаємо, найближче зверху. Скасовані йдуть у кінець.
 */
export function sortPayments(payments: Payment[], today: string): Payment[] {
  function rank(payment: Payment): number {
    if (payment.status.value === 'cancelled') {
      return 2
    }

    return payment.status.value === 'paid' ? 0 : 1
  }

  return [...payments].sort((left, right) => {
    const byGroup = rank(left) - rank(right)

    if (byGroup !== 0) {
      return byGroup
    }

    // Платіж без дати не має витісняти той, у якого вона є.
    const a = left.paid_at ?? ''
    const b = right.paid_at ?? ''

    if (a === '' || b === '') {
      return a === b ? 0 : a === '' ? 1 : -1
    }

    return rank(left) === 0 ? b.localeCompare(a) : a.localeCompare(b)
  })
}

/** 1 платіж, 2–4 платежі, 5+ платежів. */
export function formatPayments(count: number): string {
  const tail = count % 100 >= 11 && count % 100 <= 14 ? 0 : count % 10

  if (tail === 1) {
    return `${count} платіж`
  }

  return tail >= 2 && tail <= 4 ? `${count} платежі` : `${count} платежів`
}
