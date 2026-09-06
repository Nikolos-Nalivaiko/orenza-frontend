/**
 * Графік робіт. Нічого нового тут не заводять: у стрічку йдуть планові дати
 * обʼєктів і очікувані платежі — ті самі записи, що вже живуть у картці
 * обʼєкта. Графік лише перекладає їх з розрізу «обʼєкт» у розріз «день», щоб
 * відповісти на питання, якого картка не чує: що робити цього тижня.
 */

import type { IconName } from '@/components/ui/icons'
import { daysBetween, formatDays, type ConstructionObject } from '@/lib/objects'

/* ── Події ─────────────────────────────────────────────────────── */

export type ScheduleEventKind = 'start' | 'finish' | 'payment'

export interface EventKindOption {
  value: ScheduleEventKind
  label: string
  icon: IconName
}

/** Порядок — той, у якому події стоять в один день: вихід, здача, гроші. */
export const EVENT_KINDS: readonly EventKindOption[] = [
  { value: 'start', label: 'Початок', icon: 'play' },
  { value: 'finish', label: 'Дедлайн', icon: 'clock' },
  { value: 'payment', label: 'Платіж', icon: 'wallet' },
]

export const EVENT_KIND_LABELS: Record<ScheduleEventKind, string> = {
  start: 'Початок',
  finish: 'Дедлайн',
  payment: 'Платіж',
}

export const EVENT_KIND_ICONS: Record<ScheduleEventKind, IconName> = {
  start: 'play',
  finish: 'clock',
  payment: 'wallet',
}

export interface ScheduleEvent {
  /** Ключ рядка: тип, обʼєкт і — для платежу — сам платіж. */
  id: string
  kind: ScheduleEventKind
  /** День події, YYYY-MM-DD. Подій без дати в графіку не буває. */
  date: string
  object: ConstructionObject
  /** Що саме стається того дня: «Початок робіт», назва платежу. */
  title: string
  /** Сума платежу, ₴. У дат обʼєкта грошей немає. */
  amount: number | null
  /** День уже минув, а подія так і не сталась. */
  overdue: boolean
  /** Днів до події; відʼємне — стільки вже прострочено. */
  daysLeft: number
}

const KIND_RANK: Record<ScheduleEventKind, number> = { start: 0, finish: 1, payment: 2 }

function makeEvent(
  kind: ScheduleEventKind,
  id: string,
  date: string,
  object: ConstructionObject,
  title: string,
  amount: number | null,
  today: string,
): ScheduleEvent {
  const daysLeft = daysBetween(today, date) ?? 0

  return { id, kind, date, object, title, amount, overdue: daysLeft < 0, daysLeft }
}

/**
 * Події одного обʼєкта. З графіка зникає все, що вже сталося: обʼєкт, на який
 * вийшли, більше не питає «коли починаємо», а здана будова — «коли здаємо».
 */
export function objectEvents(object: ConstructionObject, today: string): ScheduleEvent[] {
  if (object.archived_at !== null) {
    return []
  }

  const events: ScheduleEvent[] = []
  const done = object.status.value === 'done'

  if (object.started_at !== null && object.actual_started_at === null && !done) {
    events.push(
      makeEvent(
        'start',
        `start-${object.id}`,
        object.started_at,
        object,
        'Початок робіт',
        null,
        today,
      ),
    )
  }

  if (object.finished_at !== null && object.actual_finished_at === null && !done) {
    events.push(
      makeEvent(
        'finish',
        `finish-${object.id}`,
        object.finished_at,
        object,
        'Здача обʼєкта',
        null,
        today,
      ),
    )
  }

  for (const payment of object.payments) {
    // Оплачений платіж — це вже історія обʼєкта, а не подія графіка;
    // скасований не станеться взагалі. Без дати подію нікуди покласти.
    const waiting = payment.status.value === 'pending' || payment.status.value === 'overdue'

    if (!waiting || payment.paid_at === null) {
      continue
    }

    events.push(
      makeEvent(
        'payment',
        `payment-${object.id}-${payment.id}`,
        payment.paid_at,
        object,
        payment.name,
        payment.amount,
        today,
      ),
    )
  }

  return events
}

export function compareEvents(left: ScheduleEvent, right: ScheduleEvent): number {
  if (left.date !== right.date) {
    return left.date.localeCompare(right.date)
  }

  const byKind = KIND_RANK[left.kind] - KIND_RANK[right.kind]

  return byKind === 0 ? left.object.name.localeCompare(right.object.name) : byKind
}

/** Усі події простору, від найближчої до найдальшої. */
export function buildEvents(objects: ConstructionObject[], today: string): ScheduleEvent[] {
  return objects.flatMap((object) => objectEvents(object, today)).sort(compareEvents)
}

/* ── Фільтри ───────────────────────────────────────────────────── */

export type ScheduleRange = '2w' | '4w' | '3m' | 'all'

export interface RangeOption {
  value: ScheduleRange
  label: string
  /** Скільки днів уперед показуємо; null — без обмеження. */
  days: number | null
}

/**
 * За замовчуванням — найближчий місяць. Показати одразу півроку означає
 * довгу порожню стрічку з рідкими подіями: у ній не видно ані тижня, ані
 * навантаження.
 */
export const SCHEDULE_RANGES: readonly RangeOption[] = [
  { value: '2w', label: 'Два тижні', days: 14 },
  { value: '4w', label: 'Місяць', days: 28 },
  { value: '3m', label: 'Три місяці', days: 92 },
  { value: 'all', label: 'Увесь графік', days: null },
]

/**
 * Стрічка чи сітка. Дані під ними однакові — різниця лише в тому, шукають
 * зараз «що далі» чи «як лягає місяць».
 */
export type ScheduleMode = 'feed' | 'calendar'

export interface ScheduleFilters {
  objectId: number | null
  /** Порожній список означає «усі типи». */
  kinds: ScheduleEventKind[]
  range: ScheduleRange
}

export function defaultScheduleFilters(): ScheduleFilters {
  return { objectId: null, kinds: [], range: '4w' }
}

export function isDefaultScheduleFilters(filters: ScheduleFilters): boolean {
  const base = defaultScheduleFilters()

  return filters.objectId === null && filters.kinds.length === 0 && filters.range === base.range
}

/** Обʼєкт і тип події. Період сюди не входить: прострочене живе поза ним. */
export function matchesFilters(event: ScheduleEvent, filters: ScheduleFilters): boolean {
  if (filters.objectId !== null && event.object.id !== filters.objectId) {
    return false
  }

  return filters.kinds.length === 0 || filters.kinds.includes(event.kind)
}

export function rangeDays(range: ScheduleRange): number | null {
  return SCHEDULE_RANGES.find((option) => option.value === range)?.days ?? null
}

/** Останній день періоду; null — період не обмежений. */
export function rangeEnd(today: string, range: ScheduleRange): string | null {
  const days = rangeDays(range)

  return days === null ? null : shiftDays(today, days)
}

/* ── Дні й тижні ───────────────────────────────────────────────── */

const DAY_MS = 86_400_000

function parseDay(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return null
  }

  // Полудень за UTC — щоб зсув часового поясу не зʼїдав добу.
  const date = new Date(`${iso}T12:00:00Z`)

  return Number.isNaN(date.getTime()) ? null : date
}

function isoOf(date: Date): string {
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0')
  const day = `${date.getUTCDate()}`.padStart(2, '0')

  return `${date.getUTCFullYear()}-${month}-${day}`
}

/** Дата через N днів; некоректний рядок повертається як є. */
export function shiftDays(iso: string, days: number): string {
  const date = parseDay(iso)

  return date === null ? iso : isoOf(new Date(date.getTime() + days * DAY_MS))
}

/** Понеділок того тижня, у який потрапляє дата. */
export function weekStart(iso: string): string {
  const date = parseDay(iso)

  if (date === null) {
    return iso
  }

  // getUTCDay(): 0 — неділя, тож зсуваємо тиждень на понеділок.
  return shiftDays(iso, -((date.getUTCDay() + 6) % 7))
}

const shortDayFormat = new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'short' })
const weekdayFormat = new Intl.DateTimeFormat('uk-UA', { weekday: 'short' })
const monthFormat = new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' })

/** «12 жовт.» — дата в підписі дня, без року: рік каже заголовок тижня. */
export function formatShortDay(iso: string): string {
  const date = parseDay(iso)

  return date === null ? '' : shortDayFormat.format(date)
}

/** «пн» — короткий день тижня. */
export function formatWeekday(iso: string): string {
  const date = parseDay(iso)

  return date === null ? '' : weekdayFormat.format(date)
}

/** «жовтень 2026» — заголовок місяця в календарі. */
export function formatMonthLabel(month: string): string {
  const date = parseDay(`${month}-01`)

  return date === null ? '' : monthFormat.format(date).replace(/\s*р\.$/, '')
}

/** «Сьогодні», «Завтра», «Через 5 днів», «Прострочено 3 дні». */
export function formatWhen(daysLeft: number): string {
  if (daysLeft < 0) {
    return `Прострочено ${formatDays(daysLeft)}`
  }

  if (daysLeft === 0) {
    return 'Сьогодні'
  }

  return daysLeft === 1 ? 'Завтра' : `Через ${formatDays(daysLeft)}`
}

export interface ScheduleDay {
  date: string
  /** «Сьогодні» чи «Завтра»; для решти днів порожньо. */
  relative: string
  weekday: string
  events: ScheduleEvent[]
}

export interface ScheduleWeek {
  /** Понеділок тижня. */
  start: string
  label: string
  days: ScheduleDay[]
  count: number
}

function weekLabel(start: string, today: string): string {
  const current = weekStart(today)

  if (start === current) {
    return 'Цього тижня'
  }

  if (start === shiftDays(current, 7)) {
    return 'Наступного тижня'
  }

  return `${formatShortDay(start)} — ${formatShortDay(shiftDays(start, 6))}`
}

function dayRelative(date: string, today: string): string {
  if (date === today) {
    return 'Сьогодні'
  }

  return date === shiftDays(today, 1) ? 'Завтра' : ''
}

/**
 * Стрічка: події по днях, дні — під тижнями. Порожні дні в неї не потрапляють,
 * інакше на п’ять подій припадало б тридцять порожніх рядків.
 */
export function groupByWeek(events: ScheduleEvent[], today: string): ScheduleWeek[] {
  const weeks: ScheduleWeek[] = []

  for (const event of events) {
    const start = weekStart(event.date)
    let week = weeks[weeks.length - 1]

    if (week === undefined || week.start !== start) {
      week = { start, label: weekLabel(start, today), days: [], count: 0 }
      weeks.push(week)
    }

    let day = week.days[week.days.length - 1]

    if (day === undefined || day.date !== event.date) {
      day = {
        date: event.date,
        relative: dayRelative(event.date, today),
        weekday: formatWeekday(event.date),
        events: [],
      }
      week.days.push(day)
    }

    day.events.push(event)
    week.count += 1
  }

  return weeks
}

/* ── Зведення ──────────────────────────────────────────────────── */

export interface Schedule {
  /**
   * Прострочене — окремим блоком і поза періодом: воно не «минуло», а досі
   * висить, і саме з нього починається робочий день.
   */
  overdue: ScheduleEvent[]
  /** Події періоду, від сьогодні й далі. */
  upcoming: ScheduleEvent[]
  weeks: ScheduleWeek[]
  /** Скільки грошей чекаємо в періоді — сума платежів стрічки. */
  expected: number
  /** Скільки з простроченого — гроші, яких так і не дочекались. */
  overdueAmount: number
}

export function expectedTotal(events: ScheduleEvent[]): number {
  return events.reduce((sum, event) => sum + (event.amount ?? 0), 0)
}

export function buildSchedule(
  events: ScheduleEvent[],
  filters: ScheduleFilters,
  today: string,
): Schedule {
  const matched = events.filter((event) => matchesFilters(event, filters))
  const end = rangeEnd(today, filters.range)

  const overdue = matched.filter((event) => event.overdue)
  const upcoming = matched.filter((event) => !event.overdue && (end === null || event.date <= end))

  return {
    overdue,
    upcoming,
    weeks: groupByWeek(upcoming, today),
    expected: expectedTotal(upcoming),
    overdueAmount: expectedTotal(overdue),
  }
}

/** Скільки подій кожного типу — підписи до кнопок фільтра. */
export function countKinds(
  events: ScheduleEvent[],
  objectId: number | null,
): Record<ScheduleEventKind, number> {
  const counts: Record<ScheduleEventKind, number> = { start: 0, finish: 0, payment: 0 }

  for (const event of events) {
    if (objectId === null || event.object.id === objectId) {
      counts[event.kind] += 1
    }
  }

  return counts
}

export interface ScheduleObjectOption {
  id: number
  name: string
  /** Скільки подій за цим обʼєктом — підпис у фільтрі. */
  count: number
}

/** Обʼєкти, у яких справді є події: фільтрувати за рештою немає сенсу. */
export function objectsOf(events: ScheduleEvent[]): ScheduleObjectOption[] {
  const map = new Map<number, ScheduleObjectOption>()

  for (const event of events) {
    const known = map.get(event.object.id)

    if (known === undefined) {
      map.set(event.object.id, { id: event.object.id, name: event.object.name, count: 1 })
    } else {
      known.count += 1
    }
  }

  return [...map.values()].sort((left, right) => left.name.localeCompare(right.name))
}

/* ── Календар ──────────────────────────────────────────────────── */

/** Тиждень починається з понеділка — так його читають на будові. */
export const WEEKDAYS: readonly string[] = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'нд']

export interface CalendarDay {
  date: string
  /** Число місяця — саме воно стоїть у клітинці. */
  day: number
  /** День цього місяця, а не «хвіст» сусіднього. */
  inMonth: boolean
  isToday: boolean
  events: ScheduleEvent[]
}

export interface CalendarMonth {
  /** YYYY-MM. */
  month: string
  label: string
  weeks: CalendarDay[][]
}

/** Місяць, у який потрапляє дата: YYYY-MM. */
export function monthOf(iso: string): string {
  return iso.slice(0, 7)
}

export function shiftMonth(month: string, delta: number): string {
  const year = Number(month.slice(0, 4))
  const index = Number(month.slice(5, 7))

  // Date сам переносить рік, коли номер місяця виходить за межі 1…12.
  return monthOf(isoOf(new Date(Date.UTC(year, index - 1 + delta, 1, 12))))
}

/**
 * Сітка місяця. Це та сама стрічка подій, лише розкладена по клітинках, — тож
 * і події тут ті самі, вже відфільтровані.
 */
export function buildCalendar(
  month: string,
  events: ScheduleEvent[],
  today: string,
): CalendarMonth {
  const byDate = new Map<string, ScheduleEvent[]>()

  for (const event of events) {
    const known = byDate.get(event.date)

    if (known === undefined) {
      byDate.set(event.date, [event])
    } else {
      known.push(event)
    }
  }

  const first = `${month}-01`
  const last = shiftDays(`${shiftMonth(month, 1)}-01`, -1)
  const weeks: CalendarDay[][] = []

  let cursor = weekStart(first)

  // Сітка тягнеться до кінця тижня, у якому лежить останнє число місяця:
  // рядків буде 4–6 залежно від місяця, і жодного зайвого.
  while (cursor <= weekStart(last)) {
    const week: CalendarDay[] = []

    for (let index = 0; index < 7; index += 1) {
      const date = shiftDays(cursor, index)

      week.push({
        date,
        day: Number(date.slice(8)),
        inMonth: monthOf(date) === month,
        isToday: date === today,
        events: byDate.get(date) ?? [],
      })
    }

    weeks.push(week)
    cursor = shiftDays(cursor, 7)
  }

  return { month, label: formatMonthLabel(month), weeks }
}

/** Події одного дня — список під сіткою, коли клікнули по клітинці. */
export function eventsOn(events: ScheduleEvent[], date: string): ScheduleEvent[] {
  return events.filter((event) => event.date === date)
}
