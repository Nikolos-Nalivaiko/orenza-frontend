import { parseAmount } from '@/lib/amount'
import { materialsTotals, type MaterialForm } from '@/lib/materials'
import { servicesTotals, type ServiceForm } from '@/lib/services'

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

/** Ресурс платежу у форматі майбутнього PaymentResource. */
export interface Payment {
  id: number
  name: string
  description: string | null
  amount: number
  status: { value: PaymentStatus; label: string }
  paid_at: string | null
}
