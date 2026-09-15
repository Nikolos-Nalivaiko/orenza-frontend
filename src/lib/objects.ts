import type { IconName } from '@/components/ui/icons'
import { formatAmount, parseAmount } from '@/lib/amount'
import type { CoverDraft, ObjectCover } from '@/lib/cover'
import {
  buildPaymentPayload,
  emptyDiscount,
  type DiscountForm,
  type Payment,
  type PaymentForm,
  type PaymentPayload,
} from '@/lib/finance'
import {
  buildMaterialPayload,
  type Material,
  type MaterialForm,
  type MaterialPayload,
} from '@/lib/materials'
import {
  buildServicePayload,
  type Service,
  type ServiceForm,
  type ServicePayload,
} from '@/lib/services'

export type ObjectStatus = 'planned' | 'in_progress' | 'paused' | 'done'

export interface StatusOption {
  value: ObjectStatus
  label: string
  icon: IconName
}

/** Порядок — життєвий цикл обʼєкта, саме в ньому статуси стоять у формі. */
export const OBJECT_STATUSES: readonly StatusOption[] = [
  { value: 'planned', label: 'Планується', icon: 'calendar' },
  { value: 'in_progress', label: 'В роботі', icon: 'play' },
  { value: 'paused', label: 'Призупинено', icon: 'pause' },
  { value: 'done', label: 'Завершено', icon: 'check' },
]

export const OBJECT_STATUS_LABELS: Record<ObjectStatus, string> = {
  planned: 'Планується',
  in_progress: 'В роботі',
  paused: 'Призупинено',
  done: 'Завершено',
}

/** Замовник обʼєкта. Окремого довідника ще немає — структура вже під нього. */
export type ClientType = 'person' | 'company'

export interface Client {
  id: number
  type: { value: ClientType; label: string }
  name: string
  /** Контактна особа: з ким саме розмовляють, якщо замовник — компанія. */
  contact: string
  phone: string
  email: string
  /**
   * Як із цією людиною працювати: коли зручно телефонувати, на чому наполягає,
   * про що домовились назавжди. Це опис самого замовника, а не хроніка подій —
   * його читають перед дзвінком, тож він живе одним текстом, а не стрічкою.
   */
  notes: string
  /**
   * Персональна знижка, %. Це підказка: новий обʼєкт бере її за замовчуванням,
   * але в розрахунок іде знижка самого обʼєкта.
   */
  discount: number
}

/**
 * Замовник із минулої сесії міг не мати пошти й адреси — їх завели разом із
 * карткою замовника. Порожній рядок, а не null: поле просто ще не заповнили.
 */
export function normalizeClient(client: Client): Client {
  return {
    ...client,
    type: client.type ?? { value: 'person', label: 'Особа' },
    contact: client.contact ?? '',
    phone: client.phone ?? '',
    email: client.email ?? '',
    notes: client.notes ?? '',
    discount: client.discount ?? 0,
  }
}

export interface ConstructionObject {
  id: number
  workspace_id: number
  name: string
  description: string | null
  address: string
  client: Client | null
  status: { value: ObjectStatus; label: string }
  started_at: string | null
  finished_at: string | null
  actual_started_at: string | null
  actual_finished_at: string | null
  cover: ObjectCover | null
  materials: Material[]
  services: Service[]
  /** Знижка обʼєкта — рівно в тому вигляді, у якому її ввели. */
  discount_percent: number | null
  discount_amount: number | null
  payments: Payment[]
  /**
   * Ключ публічної сторінки обʼєкта: за ним замовник відкриває /track/{token}
   * без реєстрації. Довгий і випадковий — саме тому, що доступ до нього має
   * лише той, кому дали посилання, а не той, хто підібрав сусідній id.
   */
  public_token: string
  /** Архівований обʼєкт зникає зі списку, але лишається в історії. */
  archived_at: string | null
  created_at: string | null
}

/** Адреса публічної сторінки — відносна, домен підставляє браузер. */
export function trackPath(token: string): string {
  return `/track/${token}`
}

/** Дати обʼєкта — пара «план» і пара «факт». Правлять їх поштучно з картки. */
export type ObjectDateField =
  'started_at' | 'finished_at' | 'actual_started_at' | 'actual_finished_at'

export const OBJECT_DATE_LABELS: Record<ObjectDateField, string> = {
  started_at: 'Початок · план',
  finished_at: 'Завершення · план',
  actual_started_at: 'Початок · факт',
  actual_finished_at: 'Завершення · факт',
}

/* ── Форма ─────────────────────────────────────────────────────── */

export interface ObjectForm {
  name: string
  description: string
  address: string
  clientId: number | null
  /** Дати — у форматі input[type=date], тобто YYYY-MM-DD. */
  startDate: string
  endDate: string
  factStartDate: string
  factEndDate: string
  status: ObjectStatus
  cover: CoverDraft | null
  /** Позиції матеріалів — другий блок картки. */
  materials: MaterialForm[]
  /** Роботи по обʼєкту — третій блок картки. */
  services: ServiceForm[]
  /** Знижка на обʼєкт — четвертий блок, фінанси. */
  discount: DiscountForm
  /** Платежі замовника: аванс, транші, доплата. */
  payments: PaymentForm[]
}

export type ObjectErrors = Partial<Record<keyof ObjectForm, string>>

export const NAME_MIN = 3
export const NAME_MAX = 255
export const ADDRESS_MIN = 5
export const ADDRESS_MAX = 255
export const DESCRIPTION_MAX = 2000

export function emptyObjectForm(): ObjectForm {
  return {
    name: '',
    description: '',
    address: '',
    clientId: null,
    startDate: '',
    endDate: '',
    factStartDate: '',
    factEndDate: '',
    status: 'planned',
    cover: null,
    materials: [],
    services: [],
    discount: emptyDiscount(),
    payments: [],
  }
}

/* ── Дати ──────────────────────────────────────────────────────── */

const dayFormat = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function todayIso(): string {
  const now = new Date()
  const month = `${now.getMonth() + 1}`.padStart(2, '0')
  const day = `${now.getDate()}`.padStart(2, '0')

  return `${now.getFullYear()}-${month}-${day}`
}

function parseDay(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return null
  }

  // Полудень за UTC — щоб зсув часового поясу не зʼїдав добу.
  const date = new Date(`${iso}T12:00:00Z`)

  return Number.isNaN(date.getTime()) ? null : date
}

/** «14 жов. 2026». Порожня чи неповна дата дає порожній рядок. */
export function formatDay(iso: string): string {
  const date = parseDay(iso)

  return date === null ? '' : dayFormat.format(date).replace(/\s*р\.$/, '')
}

const monthFormat = new Intl.DateTimeFormat('uk-UA', { month: 'long' })

/** «вересень» — підпис до цифри за місяць. */
export function formatMonth(iso: string): string {
  const date = parseDay(iso)

  return date === null ? '' : monthFormat.format(date)
}

/** Різниця в днях; null, якщо хоч однієї дати немає. */
export function daysBetween(from: string, to: string): number | null {
  const start = parseDay(from)
  const end = parseDay(to)

  if (start === null || end === null) {
    return null
  }

  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

export const FUTURE_FACT = 'Фактична дата не може бути пізніше за сьогодні'

export function isFutureFact(day: string, today: string): boolean {
  return day !== '' && today !== '' && day > today
}

const briefDay = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' })
const briefMonth = new Intl.DateTimeFormat('uk-UA', { month: 'short' })

function withYear(text: string, iso: string, today: string): string {
  return iso.slice(0, 4) === today.slice(0, 4) ? text : `${text} ${iso.slice(0, 4)}`
}

export function formatDayBrief(iso: string, today: string): string {
  const date = parseDay(iso)

  return date === null ? '' : withYear(briefDay.format(date), iso, today)
}

export function formatPeriodBrief(from: string, to: string, today: string): string {
  const start = parseDay(from)
  const end = parseDay(to)

  if (start === null || end === null) {
    return ''
  }

  if (from === to) {
    return formatDayBrief(from, today)
  }

  if (from.slice(0, 7) === to.slice(0, 7)) {
    return withYear(
      `${start.getUTCDate()}–${end.getUTCDate()} ${briefMonth.format(end)}`,
      to,
      today,
    )
  }

  if (from.slice(0, 4) === to.slice(0, 4)) {
    return withYear(`${briefDay.format(start)} — ${briefDay.format(end)}`, to, today)
  }

  return `${formatDayBrief(from, today)} — ${formatDayBrief(to, today)}`
}

export function periodDays(from: string, to: string): number | null {
  const days = daysBetween(from, to)

  return days === null || days < 0 ? null : days + 1
}

/** 1 день, 2–4 дні, 5+ днів. */
export function formatDays(days: number): string {
  const abs = Math.abs(days)
  const tail = abs % 100 >= 11 && abs % 100 <= 14 ? 0 : abs % 10

  if (tail === 1) {
    return `${abs} день`
  }

  return tail >= 2 && tail <= 4 ? `${abs} дні` : `${abs} днів`
}

/** Підпис під парою дат: «Триває 128 днів» або «Один день». */
export function formatSpan(from: string, to: string): string {
  const days = periodDays(from, to)

  if (days === null) {
    return ''
  }

  return days === 1 ? 'Один день' : `Триває ${formatDays(days)}`
}

/**
 * Наскільки факт розійшовся з планом. Порівнюємо дати завершення — саме за
 * ними зазвичай і питає замовник.
 */
export function formatDrift(form: ObjectForm): string {
  const drift = daysBetween(form.endDate, form.factEndDate)

  if (drift === null) {
    return ''
  }

  if (drift === 0) {
    return 'Точно в строк'
  }

  return drift > 0
    ? `Пізніше плану на ${formatDays(drift)}`
    : `Раніше плану на ${formatDays(drift)}`
}

/* ── Знижка ────────────────────────────────────────────────────── */

/**
 * Знижка обʼєкта людською мовою: «5%», «120 000 ₴» або порожньо, якщо її
 * немає. Зберігається вона так, як її ввели, — тож і показуємо так само.
 */
export function formatDiscount(percent: number | null, amount: number | null): string {
  if (amount !== null) {
    return `${formatAmount(amount)} ₴`
  }

  return percent === null ? '' : `${formatAmount(percent)}%`
}

/* ── Валідація ─────────────────────────────────────────────────── */

export function validateObjectForm(form: ObjectForm, today: string = todayIso()): ObjectErrors {
  const errors: ObjectErrors = {}

  const name = form.name.trim()

  if (name === '') {
    errors.name = 'Вкажіть назву обʼєкта'
  } else if (name.length < NAME_MIN) {
    errors.name = `Мінімум ${NAME_MIN} символи`
  } else if (name.length > NAME_MAX) {
    errors.name = `Максимум ${NAME_MAX} символів`
  }

  if (form.description.trim().length > DESCRIPTION_MAX) {
    errors.description = `Максимум ${DESCRIPTION_MAX} символів`
  }

  const address = form.address.trim()

  if (address === '') {
    errors.address = 'Вкажіть адресу — без неї обʼєкт не знайти'
  } else if (address.length < ADDRESS_MIN) {
    errors.address = 'Замало для адреси: вулиця, будинок, місто'
  } else if (address.length > ADDRESS_MAX) {
    errors.address = `Максимум ${ADDRESS_MAX} символів`
  }

  const plan = daysBetween(form.startDate, form.endDate)

  if (plan !== null && plan < 0) {
    errors.endDate = 'Завершення раніше за початок'
  }

  const fact = daysBetween(form.factStartDate, form.factEndDate)

  if (fact !== null && fact < 0) {
    errors.factEndDate = 'Завершення раніше за початок'
  }

  if (form.factEndDate !== '' && form.factStartDate === '') {
    errors.factStartDate = 'Спочатку вкажіть фактичний початок'
  }

  if (isFutureFact(form.factStartDate, today)) {
    errors.factStartDate = FUTURE_FACT
  }

  if (isFutureFact(form.factEndDate, today)) {
    errors.factEndDate = FUTURE_FACT
  }

  // Статус і фактичні дати мають не сперечатись: «в роботі» без початку та
  // «завершено» без завершення — найчастіші розбіжності в звітах.
  if (form.status === 'in_progress' && form.factStartDate === '') {
    errors.factStartDate = 'Обʼєкт у роботі — вкажіть, коли фактично почали'
  }

  if (form.status === 'done' && form.factEndDate === '') {
    errors.factEndDate = 'Обʼєкт завершено — вкажіть фактичну дату здачі'
  }

  return errors
}

export function hasObjectErrors(errors: ObjectErrors): boolean {
  return Object.keys(errors).length > 0
}

/* ── Запит ─────────────────────────────────────────────────────── */

export type ObjectCore = ConstructionObject

export interface ObjectCorePayload {
  name: string
  description: string | null
  address: string
  client_id: number | null
  status: ObjectStatus
  started_at: string | null
  finished_at: string | null
  actual_started_at: string | null
  actual_finished_at: string | null
  materials?: MaterialPayload[]
  services?: ServicePayload[]
  payments?: PaymentPayload[]
  discount_percent?: number
  discount_amount?: number
}

export function buildObjectCorePayload(form: ObjectForm): ObjectCorePayload {
  const description = form.description.trim()

  return {
    name: form.name.trim(),
    description: description === '' ? null : description,
    address: form.address.trim(),
    client_id: form.clientId,
    status: form.status,
    started_at: form.startDate === '' ? null : form.startDate,
    finished_at: form.endDate === '' ? null : form.endDate,
    actual_started_at: form.factStartDate === '' ? null : form.factStartDate,
    actual_finished_at: form.factEndDate === '' ? null : form.factEndDate,
    ...(form.materials.length === 0 ? {} : { materials: form.materials.map(buildMaterialPayload) }),
    ...(form.services.length === 0 ? {} : { services: form.services.map(buildServicePayload) }),
    ...(form.payments.length === 0 ? {} : { payments: form.payments.map(buildPaymentPayload) }),
    ...discountPayload(form.discount),
  }
}

function discountPayload(discount: DiscountForm): {
  discount_percent?: number
  discount_amount?: number
} {
  const parsed = parseAmount(discount.value)
  const off = parsed === null || parsed <= 0 ? null : parsed

  if (off === null) {
    return {}
  }

  return discount.kind === 'percent' ? { discount_percent: off } : { discount_amount: off }
}
