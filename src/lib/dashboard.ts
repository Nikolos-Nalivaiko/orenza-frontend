/**
 * Дашборд власника. Свого джерела даних у нього немає й бути не може: гроші
 * рахує та сама логіка, що й у картці обʼєкта, прострочене й найближчі події
 * приходять із графіка робіт, а список обʼєктів — це рядки сторінки
 * «Обʼєкти». Дашборд лише зводить їх в одну відповідь: з чого почати сьогодні.
 *
 * Тут навмисно немає динаміки по місяцях, воронки лідів і розкладки по
 * постачальниках: історії на старті ще немає, а модулів під них — тим більше.
 * Цифра, яку нема з чим порівняти, лише вдає аналітику.
 */

import type { IconName } from '@/components/ui/icons'
import { ACTIVE_STATUSES, objectSummary, type ObjectRow } from '@/lib/objectList'
import type { ConstructionObject } from '@/lib/objects'
import {
  buildEvents,
  expectedTotal,
  shiftDays,
  type ScheduleEvent,
  type ScheduleEventKind,
} from '@/lib/schedule'

/* ── Гроші простору ────────────────────────────────────────────── */

export interface DashboardTotals {
  /** Сума для замовників по активних обʼєктах — скільки грошей зараз у роботі. */
  running: number
  /** Профіт по всіх живих обʼєктах: сума для клієнта мінус собівартість. */
  profit: number
  /** Отримано за весь час. */
  paid: number
  /** Залишок до отримання — дебіторка простору; відʼємний означає переплату. */
  due: number
  /** Скільки обʼєктів дало цифру «в роботі». */
  active: number
  /** Скільки обʼєктів у зведенні взагалі. */
  total: number
}

/**
 * Архів у зведення не входить: обʼєкт ховають саме тоді, коли по ньому вже
 * нема чого рахувати, і його борг не має щоранку висіти в дебіторці.
 */
export function dashboardTotals(objects: ConstructionObject[], today: string): DashboardTotals {
  const totals: DashboardTotals = {
    running: 0,
    profit: 0,
    paid: 0,
    due: 0,
    active: 0,
    total: 0,
  }

  for (const object of objects) {
    if (object.archived_at !== null) {
      continue
    }

    const summary = objectSummary(object, today)

    totals.total += 1
    totals.profit += summary.profit
    totals.paid += summary.paid
    totals.due += summary.due

    if (ACTIVE_STATUSES.includes(object.status.value)) {
      totals.active += 1
      totals.running += summary.client
    }
  }

  return totals
}

/**
 * Нараховано команді. Це та сама «людина × обсяг × ставка» з бригад на
 * роботах, що й у картці співробітника, — просто підсумована з іншого боку,
 * тож окремого обліку виплат тут немає: простір їх поки не веде.
 */
export function crewAccrued(objects: ConstructionObject[]): number {
  let accrued = 0

  for (const object of objects) {
    if (object.archived_at !== null) {
      continue
    }

    for (const service of object.services) {
      for (const worker of service.workers) {
        accrued += worker.volume * worker.rate
      }
    }
  }

  return accrued
}

/* ── Рядок показників ──────────────────────────────────────────── */

export type KpiTone = 'plain' | 'brand' | 'danger'

/**
 * Смужка під цифрою. Це завжди реальна пропорція між двома числами простору
 * (оплачено до суми, активні до всіх) — а не намальована динаміка за період,
 * якої простір ще не має.
 */
export interface KpiMeter {
  /** Частка від 0 до 1. */
  share: number
  label: string
}

/**
 * Два питання власника, на які відповідає рядок цифр: скільки роботи зараз
 * у руках і як із неї розраховуються. Дашборд показує їх окремими блоками —
 * одним рядом із пʼяти плиток вони читаються як список без сенсу.
 */
export type KpiGroup = 'work' | 'settlement'

export interface Kpi {
  key: string
  label: string
  /** Усі показники — гроші, тож формат один на всіх. */
  value: number
  hint: string
  tone: KpiTone
  icon: IconName
  group: KpiGroup
  /** Розділ, який пояснює цифру: плитка веде саме туди. */
  to: string
  meter: KpiMeter | null
}

function share(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.min(Math.max(part / whole, 0), 1)
}

function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100)
}

/** 1 обʼєкт, 2–4 обʼєкти, 5+ обʼєктів. */
export function formatObjects(count: number): string {
  const tail = count % 100 >= 11 && count % 100 <= 14 ? 0 : count % 10

  if (tail === 1) {
    return `${count} обʼєкт`
  }

  return tail >= 2 && tail <= 4 ? `${count} обʼєкти` : `${count} обʼєктів`
}

/**
 * Чотири цифри власника — і пʼята, зарплатна, у компанії: в особистому
 * просторі бригади немає, тож і питання «скільки винен людям» не стоїть.
 */
export function dashboardKpis(totals: DashboardTotals, crew: number | null): Kpi[] {
  // Сума для замовників по живих обʼєктах: due — це та сама сума мінус оплати.
  const contracted = totals.paid + totals.due

  const kpis: Kpi[] = [
    {
      key: 'running',
      label: 'В роботі зараз',
      value: totals.running,
      hint: `${formatObjects(totals.active)} у роботі`,
      tone: 'plain',
      icon: 'building',
      group: 'work',
      to: 'objects',
      meter:
        totals.total === 0
          ? null
          : {
              share: share(totals.active, totals.total),
              label: `з ${formatObjects(totals.total)} простору`,
            },
    },
    {
      key: 'profit',
      label: 'Профіт',
      value: totals.profit,
      hint: `по ${formatObjects(totals.total)}`,
      tone: totals.profit < 0 ? 'danger' : 'brand',
      icon: 'spark',
      group: 'work',
      to: 'objects',
      meter:
        contracted === 0
          ? null
          : {
              share: share(totals.profit, contracted),
              label: `маржа ${percent(totals.profit, contracted)}%`,
            },
    },
    {
      key: 'paid',
      label: 'Оплачено',
      value: totals.paid,
      hint: 'отримано за весь час',
      tone: 'plain',
      icon: 'wallet',
      group: 'settlement',
      to: 'objects',
      meter:
        contracted === 0
          ? null
          : {
              share: share(totals.paid, contracted),
              label: `${percent(totals.paid, contracted)}% від суми обʼєктів`,
            },
    },
    {
      key: 'due',
      label: 'Залишок до отримання',
      value: totals.due,
      hint: totals.due > 0 ? 'замовники ще винні' : 'боргів немає',
      tone: totals.due > 0 ? 'danger' : 'plain',
      icon: 'clock',
      group: 'settlement',
      to: 'clients',
      meter:
        contracted === 0
          ? null
          : {
              share: share(totals.due, contracted),
              label:
                totals.due > 0
                  ? `${percent(totals.due, contracted)}% ще не оплачено`
                  : 'усе оплачено',
            },
    },
  ]

  if (crew === null) {
    return kpis
  }

  return [
    ...kpis,
    {
      key: 'crew',
      label: 'До виплати команді',
      value: crew,
      hint: 'нараховано за роботами',
      tone: 'plain',
      icon: 'team',
      group: 'settlement',
      to: 'team',
      meter: null,
    },
  ]
}

/* ── Портфель обʼєктів ─────────────────────────────────────────── */

/** Скільки обʼєктів показує дашборд: далі за пʼятий уже йдуть у список. */
export const PORTFOLIO_LIMIT = 5

function byUrgency(left: ObjectRow, right: ObjectRow): number {
  // Прострочене зверху завжди: це вже не план, а розмова із замовником.
  if (left.summary.overdue !== right.summary.overdue) {
    return left.summary.overdue ? -1 : 1
  }

  const a = left.summary.daysLeft
  const b = right.summary.daysLeft

  // Обʼєкт без дати завершення не має витісняти той, у якого дедлайн горить.
  if (a === null || b === null) {
    if (a !== b) {
      return a === null ? 1 : -1
    }
  } else if (a !== b) {
    return a - b
  }

  // За однакової терміновості попереду той, де більше невиплачених грошей.
  return right.summary.due - left.summary.due
}

/**
 * Активні обʼєкти, з яких починають день: спочатку ті, що вийшли за строк,
 * далі — за наближенням дедлайну. Це ті самі рядки, що й на сторінці
 * «Обʼєкти», тож і показує їх той самий компонент — просто без фільтрів.
 */
export function portfolio(
  objects: ConstructionObject[],
  today: string,
  limit: number = PORTFOLIO_LIMIT,
): ObjectRow[] {
  const rows = objects.flatMap<ObjectRow>((object) => {
    if (object.archived_at !== null || !ACTIVE_STATUSES.includes(object.status.value)) {
      return []
    }

    return [{ object, summary: objectSummary(object, today) }]
  })

  return rows.sort(byUrgency).slice(0, limit)
}

/**
 * Обʼєкти, на які має сенс завести платіж просто зараз: усе, крім архіву,
 * і спочатку найбільший борг. Швидка дія з дашборда не повинна змушувати
 * згадувати назву — потрібний обʼєкт має стояти першим.
 */
export function payableObjects(objects: ConstructionObject[], today: string): ObjectRow[] {
  const rows = objects.flatMap<ObjectRow>((object) =>
    object.archived_at === null ? [{ object, summary: objectSummary(object, today) }] : [],
  )

  return rows.sort((left, right) => right.summary.due - left.summary.due)
}

/* ── Події ─────────────────────────────────────────────────────── */

/**
 * «Горить» — це прострочені дедлайни обʼєктів і платежі, яких так і не
 * дочекались. Дати початку сюди не йдуть: те, що на обʼєкт ще не вийшли, —
 * питання планування, а не тривоги.
 */
export const ALARM_KINDS: readonly ScheduleEventKind[] = ['finish', 'payment']

/** Найближчий тиждень — рівно стільки, скільки тримають у голові з ранку. */
export const UPCOMING_DAYS = 7

export interface DashboardEvents {
  /** Прострочене — те, що вимагає уваги просто зараз. */
  alarm: ScheduleEvent[]
  /** Скільки з простроченого — гроші. */
  alarmAmount: number
  /** Найближчі 7 днів, без фільтрів: повний графік живе на своїй сторінці. */
  upcoming: ScheduleEvent[]
}

export function dashboardEvents(
  objects: ConstructionObject[],
  today: string,
  days: number = UPCOMING_DAYS,
): DashboardEvents {
  const events = buildEvents(objects, today)
  const end = shiftDays(today, days)

  const alarm = events.filter((event) => event.overdue && ALARM_KINDS.includes(event.kind))

  return {
    alarm,
    alarmAmount: expectedTotal(alarm),
    upcoming: events.filter((event) => !event.overdue && event.date <= end),
  }
}
