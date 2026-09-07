/**
 * Замовник як окремий екран.
 *
 * Тут нічого нового не рахується: суми беруться тими самими функціями, що
 * працюють у картці обʼєкта (lib/finance), а події — тими, що складають її
 * стрічку (lib/activity). Сенс модуля в іншому: звести все, що розкидано по
 * обʼєктах однієї людини, в одну відповідь на питання «скільки їх у неї,
 * скільки вона винна разом і чи вигідна вона нам загалом».
 *
 * Коли зʼявиться GET /api/v1/workspaces/{id}/clients/{client}, зміниться лише
 * джерело: типи нижче — уже той формат, у якому екран показує замовника.
 */

import { parseAmount } from '@/lib/amount'
import { comparePayments, objectFinance, type Payment } from '@/lib/finance'
import { daysBetween, type Client, type ClientType, type ConstructionObject } from '@/lib/objects'
import { isBlankPhone, isCompletePhone } from '@/lib/phone'
import { isEmail, PHONE_ERROR } from '@/lib/validation'

/* ── Обʼєкти замовника ─────────────────────────────────────────── */

export function clientObjects(items: ConstructionObject[], clientId: number): ConstructionObject[] {
  return items.filter((object) => object.client?.id === clientId)
}

/**
 * Зведення по замовнику. Обʼєкти рахуються всі, включно з архівними — їх у
 * людини справді стільки. Гроші — лише по живих: архів прибрали саме тому, що
 * він більше не в роботі, і тягнути його борг у шапку означало б показувати
 * власнику суму, якої він не чекає.
 */
export interface ClientTotals {
  objects: number
  /** Живі зараз: заплановані й у роботі, поза архівом. */
  active: number
  done: number
  archived: number
  /** Сума по всіх обʼєктах замовника: матеріали й роботи за мінусом знижок. */
  client: number
  cost: number
  /** Профіт з замовника загалом — цифра, заради якої й заходять сюди. */
  profit: number
  paid: number
  pending: number
  overdue: number
  /** Залишок до сплати по всіх обʼєктах; відʼємний — це переплата. */
  due: number
  /** Частка оплаченого від суми для клієнта, 0…1. */
  progress: number
}

export function clientTotals(objects: ConstructionObject[], today: string): ClientTotals {
  const totals: ClientTotals = {
    objects: objects.length,
    active: 0,
    done: 0,
    archived: 0,
    client: 0,
    cost: 0,
    profit: 0,
    paid: 0,
    pending: 0,
    overdue: 0,
    due: 0,
    progress: 0,
  }

  for (const object of objects) {
    if (object.archived_at !== null) {
      totals.archived += 1

      continue
    }

    if (object.status.value === 'done') {
      totals.done += 1
    } else if (object.status.value !== 'paused') {
      totals.active += 1
    }

    const finance = objectFinance(object, today)

    totals.client += finance.client
    totals.cost += finance.cost
    totals.paid += finance.paid
    totals.pending += finance.pending
    totals.overdue += finance.overdue
  }

  totals.profit = totals.client - totals.cost
  totals.due = totals.client - totals.paid
  totals.progress = totals.client === 0 ? 0 : Math.min(1, totals.paid / totals.client)

  return totals
}

/**
 * Другий обʼєкт — уже не випадковість: людина повернулась. Мітку ставимо
 * автоматично, бо вона й привід запропонувати знижку, і підказка, з ким варто
 * розмовляти обережніше.
 */
export const REGULAR_LABEL = 'Постійний замовник'

export function isRegularClient(objects: number): boolean {
  return objects > 1
}

/** 1 обʼєкт, 2–4 обʼєкти, 5+ обʼєктів. */
export function formatObjects(count: number): string {
  return formatUnits(count, 'обʼєкт', 'обʼєкти', 'обʼєктів')
}

/** «1 активний», «2 активні», «5 активних» — підпис до кількості обʼєктів. */
export function formatActive(count: number): string {
  return formatUnits(count, 'активний', 'активні', 'активних')
}

/* ── Платежі замовника ─────────────────────────────────────────── */

/**
 * Платіж разом із обʼєктом. Власник отримав переказ і не памʼятає, за яку
 * будову він був, — саме тому обʼєкт тут не менш важливий за суму.
 */
export interface ClientPaymentRow {
  payment: Payment
  object: { id: number; name: string }
}

/** Платежі з усіх обʼєктів замовника в тому ж порядку, що й у картці обʼєкта. */
export function clientPayments(objects: ConstructionObject[]): ClientPaymentRow[] {
  const rows = objects.flatMap((object) =>
    object.payments.map((payment) => ({
      payment,
      object: { id: object.id, name: object.name },
    })),
  )

  return rows.sort((left, right) => comparePayments(left.payment, right.payment))
}

/* ── Портрет замовника ─────────────────────────────────────────── */

/**
 * Те, що видно лише збоку від окремої будови: відколи з нами ця людина, на яку
 * суму вона зазвичай заходить і як платить. Зведеної стрічки подій тут
 * навмисно немає — історія кожного обʼєкта живе у власній картці, а тягнути
 * сюди події з усіх будов означало б збирати довгий список заради того, що вже
 * прочитали в обʼєкті.
 */
export interface ClientProfile {
  /** День першого обʼєкта — «з нами з». */
  since: string | null
  /** Скільки днів триває співпраця. */
  days: number | null
  /** Останній заведений обʼєкт — з нього найчастіше й починається розмова. */
  last: { id: number; name: string; at: string | null } | null
  /** Середній чек: сума для клієнта на один живий обʼєкт. */
  average: number
  payments: number
  /** Скільки платежів уже пройшло — решта ще попереду. */
  received: number
}

/** День створення обʼєкта; коли його не зберегли — плановий початок. */
function objectDay(object: ConstructionObject): string | null {
  return object.created_at === null ? object.started_at : object.created_at.slice(0, 10)
}

export function clientProfile(
  objects: ConstructionObject[],
  totals: ClientTotals,
  today: string,
): ClientProfile {
  let since: string | null = null
  let last: ClientProfile['last'] = null
  let lastDay: string | null = null
  let payments = 0
  let received = 0

  for (const object of objects) {
    const day = objectDay(object)

    if (day !== null && (since === null || day < since)) {
      since = day
    }

    // Обʼєкт без дати не має витісняти той, у якого вона є.
    if (lastDay === null || (day !== null && day > lastDay)) {
      last = { id: object.id, name: object.name, at: day }
      lastDay = day
    }

    for (const payment of object.payments) {
      if (payment.status.value === 'cancelled') {
        continue
      }

      payments += 1

      if (payment.status.value === 'paid') {
        received += 1
      }
    }
  }

  const live = totals.objects - totals.archived

  return {
    since,
    days: since === null ? null : daysBetween(since, today),
    last,
    average: live === 0 ? 0 : totals.client / live,
    payments,
    received,
  }
}

/** Скільки триває співпраця: «3 місяці», «2 роки», «11 днів». */
export function formatSpell(days: number): string {
  if (days < 45) {
    return formatUnits(days, 'день', 'дні', 'днів')
  }

  const months = Math.round(days / 30)

  return months < 18
    ? formatUnits(months, 'місяць', 'місяці', 'місяців')
    : formatUnits(Math.round(days / 365), 'рік', 'роки', 'років')
}

function formatUnits(count: number, one: string, few: string, many: string): string {
  const tail = count % 100 >= 11 && count % 100 <= 14 ? 0 : count % 10

  if (tail === 1) {
    return `${count} ${one}`
  }

  return tail >= 2 && tail <= 4 ? `${count} ${few}` : `${count} ${many}`
}

/* ── Нотатки ───────────────────────────────────────────────────── */

/**
 * Опис замовника — те, що читають перед дзвінком. Ліміт такий самий, як у
 * нотатці обʼєкта: це абзац-два, а не досьє.
 */
export const CLIENT_NOTES_MAX = 1000

/* ── Персональна знижка ────────────────────────────────────────── */

export const CLIENT_DISCOUNT_MAX = 100

/** Знижку правлять просто з шапки, тож розбір і перевірка — окремо. */
export function parseClientDiscount(value: string): number | null {
  const parsed = parseAmount(value)

  return parsed === null ? null : Math.round(parsed * 100) / 100
}

export function validateClientDiscount(value: string): string | undefined {
  if (value.trim() === '') {
    return 'Вкажіть відсоток — 0, якщо знижки немає'
  }

  const parsed = parseClientDiscount(value)

  if (parsed === null) {
    return 'Тільки число'
  }

  if (parsed < 0) {
    return 'Не менше нуля'
  }

  return parsed > CLIENT_DISCOUNT_MAX ? `Максимум ${CLIENT_DISCOUNT_MAX}%` : undefined
}

/* ── Контакти ──────────────────────────────────────────────────── */

export interface ClientForm {
  type: ClientType
  name: string
  contact: string
  phone: string
  email: string
}

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  person: 'Особа',
  company: 'Компанія',
}

export function emptyClientForm(type: ClientType = 'person'): ClientForm {
  return { type, name: '', contact: '', phone: '', email: '' }
}

export type ClientErrors = Partial<Record<keyof ClientForm, string>>

export const CLIENT_NAME_MIN = 2
export const CLIENT_NAME_MAX = 255

export function clientForm(client: Client): ClientForm {
  return {
    type: client.type.value,
    name: client.name,
    contact: client.contact,
    phone: client.phone,
    email: client.email,
  }
}

/**
 * Обовʼязкова тут лише назва: замовника заводять з одного слова в полі обʼєкта
 * і дозаповнюють потім, коли вже є що записувати.
 */
export function validateClientForm(form: ClientForm): ClientErrors {
  const errors: ClientErrors = {}
  const name = form.name.trim()

  if (name === '') {
    errors.name = form.type === 'company' ? 'Вкажіть назву компанії' : 'Вкажіть імʼя та прізвище'
  } else if (name.length < CLIENT_NAME_MIN) {
    errors.name = `Мінімум ${CLIENT_NAME_MIN} символи`
  } else if (name.length > CLIENT_NAME_MAX) {
    errors.name = `Максимум ${CLIENT_NAME_MAX} символів`
  }

  if (!isBlankPhone(form.phone) && !isCompletePhone(form.phone)) {
    errors.phone = PHONE_ERROR
  }

  if (form.email.trim() !== '' && !isEmail(form.email)) {
    errors.email = 'Схоже на помилку в адресі'
  }

  return errors
}

export function hasClientErrors(errors: ClientErrors): boolean {
  return Object.keys(errors).length > 0
}

/** Тіло запиту PATCH /api/v1/workspaces/{id}/clients/{client}. */
export interface ClientPayload {
  type: ClientType
  name: string
  contact: string
  phone: string
  email: string
}

export function buildClientPayload(form: ClientForm): ClientPayload {
  return {
    type: form.type,
    name: form.name.trim(),
    contact: form.type === 'company' ? form.contact.trim() : '',
    phone: form.phone.trim(),
    email: form.email.trim().toLowerCase(),
  }
}
