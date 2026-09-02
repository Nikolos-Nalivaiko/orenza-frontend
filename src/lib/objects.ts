/**
 * Будівельні обʼєкти. Бекенд поки має лише users/workspaces/memberships, тож
 * типи навмисно описані так, як їх віддаватиме майбутній
 * GET|POST /api/v1/workspaces/{id}/objects — щоб потім замінити лише джерело
 * даних, а не форму.
 */

import type { IconName } from '@/components/ui/icons'
import { parseAmount } from '@/lib/amount'
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
export interface Client {
  id: number
  name: string
  contact: string
  phone: string
  /**
   * Персональна знижка, %. Це підказка: новий обʼєкт бере її за замовчуванням,
   * але в розрахунок іде знижка самого обʼєкта.
   */
  discount: number
}

/** Ресурс обʼєкта у форматі майбутнього ObjectResource. */
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
  cover: string | null
  materials: Material[]
  services: Service[]
  /** Знижка обʼєкта — рівно в тому вигляді, у якому її ввели. */
  discount_percent: number | null
  discount_amount: number | null
  payments: Payment[]
  created_at: string | null
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
  /** Обкладинка живе як data-URL, поки немає завантаження файлів на бекенд. */
  cover: string | null
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

/** Обкладинку тримаємо маленькою: вона їде в тому ж JSON, що й форма. */
export const COVER_MAX_BYTES = 5 * 1024 * 1024
export const COVER_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

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

/** Різниця в днях; null, якщо хоч однієї дати немає. */
export function daysBetween(from: string, to: string): number | null {
  const start = parseDay(from)
  const end = parseDay(to)

  if (start === null || end === null) {
    return null
  }

  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
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
  const days = daysBetween(from, to)

  if (days === null || days < 0) {
    return ''
  }

  return days === 0 ? 'Один день' : `Триває ${formatDays(days)}`
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

/* ── Валідація ─────────────────────────────────────────────────── */

export function validateObjectForm(form: ObjectForm): ObjectErrors {
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

/** Тіло запиту POST /api/v1/workspaces/{id}/objects. */
export interface ObjectPayload {
  name: string
  description?: string
  address: string
  client_id?: number
  status: ObjectStatus
  started_at?: string
  finished_at?: string
  actual_started_at?: string
  actual_finished_at?: string
  cover?: string
  materials?: MaterialPayload[]
  services?: ServicePayload[]
  /** Знижку шлемо так, як її ввели: відсотком або сумою, але не обома одразу. */
  discount_percent?: number
  discount_amount?: number
  payments?: PaymentPayload[]
}

export function buildObjectPayload(form: ObjectForm): ObjectPayload {
  const description = form.description.trim()
  const discount = parseAmount(form.discount.value)
  const percent = form.discount.kind === 'percent'
  const off = discount === null || discount <= 0 ? null : discount

  return {
    name: form.name.trim(),
    ...(description === '' ? {} : { description }),
    address: form.address.trim(),
    ...(form.clientId === null ? {} : { client_id: form.clientId }),
    status: form.status,
    ...(form.startDate === '' ? {} : { started_at: form.startDate }),
    ...(form.endDate === '' ? {} : { finished_at: form.endDate }),
    ...(form.factStartDate === '' ? {} : { actual_started_at: form.factStartDate }),
    ...(form.factEndDate === '' ? {} : { actual_finished_at: form.factEndDate }),
    ...(form.cover === null ? {} : { cover: form.cover }),
    ...(form.materials.length === 0 ? {} : { materials: form.materials.map(buildMaterialPayload) }),
    ...(form.services.length === 0 ? {} : { services: form.services.map(buildServicePayload) }),
    ...(off === null ? {} : percent ? { discount_percent: off } : { discount_amount: off }),
    ...(form.payments.length === 0 ? {} : { payments: form.payments.map(buildPaymentPayload) }),
  }
}

/* ── Демодані ──────────────────────────────────────────────────── */

/** Довідника замовників ще немає — беремо тих, що вже фігурують у дашборді. */
export const DEMO_CLIENTS: readonly Client[] = [
  {
    id: 1,
    name: 'ТОВ «Мегабуд»',
    contact: 'Ірина Ковальчук',
    phone: '+380 67 214 30 11',
    discount: 5,
  },
  {
    id: 2,
    name: 'ОСББ «Стеценка, 12»',
    contact: 'Олег Дяченко',
    phone: '+380 50 118 44 02',
    discount: 0,
  },
  {
    id: 3,
    name: 'ФОП Романюк О. П.',
    contact: 'Олександр Романюк',
    phone: '+380 63 902 77 15',
    discount: 3,
  },
  {
    id: 4,
    name: 'ТОВ «Стальпром»',
    contact: 'Марія Гнатюк',
    phone: '+380 44 501 22 90',
    discount: 7,
  },
  { id: 5, name: 'Приватний замовник', contact: 'Без компанії', phone: '', discount: 0 },
]
