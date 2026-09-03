/**
 * Стрічка подій обʼєкта — ядро вкладки «Огляд».
 *
 * Записи в ній двох сортів і збираються з двох джерел:
 *
 * • автоподії — те, що вже видно з самого обʼєкта: коли його завели, які
 *   матеріали й роботи в ньому зʼявились, які платежі пройшли, коли фактично
 *   почали й закінчили. Їх ніхто не пише руками, вони виводяться з даних —
 *   тож правка обʼєкта одразу міняє й стрічку;
 * • журнал дій — те, чого з обʼєкта не відновити: зміна статусу, правка
 *   знижки чи планових дат і ручні нотатки людини. Ці записи store складає
 *   в момент дії й тримає поруч із обʼєктами.
 *
 * Коли зʼявиться GET /api/v1/objects/{id}/activity, зміниться лише джерело:
 * ActivityEntry — це вже той формат, у якому стрічку показує екран.
 */

import type { IconName } from '@/components/ui/icons'
import { formatAmount } from '@/lib/amount'
import type { ConstructionObject } from '@/lib/objects'
import { formatShots, type ObjectPhoto } from '@/lib/photos'

export type ActivityKind =
  'object' | 'status' | 'stage' | 'material' | 'service' | 'payment' | 'photo' | 'note'

export const ACTIVITY_KIND_LABELS: Record<ActivityKind, string> = {
  object: 'Обʼєкт',
  status: 'Статус',
  stage: 'Етап',
  material: 'Матеріали',
  service: 'Роботи',
  payment: 'Гроші',
  photo: 'Фото',
  note: 'Нотатка',
}

/** Нотатка людини має свій значок — її не сплутати з системним записом. */
export const ACTIVITY_ICONS: Record<ActivityKind, IconName> = {
  object: 'building',
  status: 'swap',
  stage: 'spark',
  material: 'box',
  service: 'team',
  payment: 'wallet',
  photo: 'image',
  note: 'document',
}

/** Запис журналу — рівно те, що піде в POST /api/v1/objects/{id}/activity. */
export interface ActivityRecord {
  id: number
  object_id: number
  kind: ActivityKind
  text: string
  /** Уточнення поруч із текстом: «В роботі → Завершено», сума, обсяг. */
  detail: string | null
  at: string
}

/** Рядок стрічки — спільний вигляд автоподії, знімка й ручної нотатки. */
export interface ActivityEntry {
  id: string
  kind: ActivityKind
  /** Момент події: повний ISO або лише день, якщо часу ніхто не фіксував. */
  at: string
  text: string
  detail: string | null
  /** Прибрати можна тільки свій запис — автоподію ні. */
  recordId: number | null
}

/** Скільки записів показуємо одразу: решта — за «Показати все». */
export const ACTIVITY_PAGE = 8

export const NOTE_MAX = 500

/* ── Час ───────────────────────────────────────────────────────── */

const dayShort = new Intl.DateTimeFormat('uk-UA', { day: '2-digit', month: '2-digit' })
const dayFull = new Intl.DateTimeFormat('uk-UA', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})
const clock = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' })

function isDay(at: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(at)
}

function parseMoment(at: string): Date | null {
  // Полудень за UTC — щоб зсув часового поясу не зʼїдав добу в датах без часу.
  const date = new Date(isDay(at) ? `${at}T12:00:00Z` : at)

  return Number.isNaN(date.getTime()) ? null : date
}

/** Мітка часу для сортування; нерозбірлива дата йде в кінець стрічки. */
export function momentTime(at: string): number {
  return parseMoment(at)?.getTime() ?? 0
}

/** «15.09», а для іншого року — «15.09.2025». */
export function formatMomentDay(at: string, today: string): string {
  const date = parseMoment(at)

  if (date === null) {
    return ''
  }

  return at.slice(0, 4) === today.slice(0, 4) ? dayShort.format(date) : dayFull.format(date)
}

/** «14:20». Порожньо там, де часу ніхто не фіксував — лише день. */
export function formatMomentTime(at: string): string {
  const date = parseMoment(at)

  return date === null || isDay(at) ? '' : clock.format(date)
}

/** «Було → стало» одним рядком; порожнє значення показуємо як «—». */
export function transition(before: string, after: string): string {
  return `${before === '' ? '—' : before} → ${after === '' ? '—' : after}`
}

/* ── Автоподії ─────────────────────────────────────────────────── */

function entry(
  id: string,
  kind: ActivityKind,
  at: string,
  text: string,
  detail: string | null = null,
): ActivityEntry {
  return { id, kind, at, text, detail, recordId: null }
}

/**
 * Події, які видно з самого обʼєкта. Матеріали й роботи власного часу не
 * мають — вони зʼявляються разом із карткою, тож і в стрічці стоять на дні
 * створення.
 */
export function derivedActivity(object: ConstructionObject): ActivityEntry[] {
  const entries: ActivityEntry[] = []

  if (object.actual_finished_at !== null) {
    entries.push(entry('fact-end', 'stage', object.actual_finished_at, 'Обʼєкт фактично завершено'))
  }

  for (const payment of object.payments) {
    // У стрічку йде тільки те, що вже сталося: запланований платіж — не подія.
    if (payment.status.value !== 'paid' || payment.paid_at === null) {
      continue
    }

    entries.push(
      entry(
        `payment-${payment.id}`,
        'payment',
        payment.paid_at,
        'Внесено платіж',
        `${payment.name} — ${formatAmount(payment.amount)} ₴`,
      ),
    )
  }

  if (object.actual_started_at !== null) {
    entries.push(entry('fact-start', 'stage', object.actual_started_at, 'Роботи фактично почалися'))
  }

  if (object.created_at !== null) {
    for (const material of object.materials) {
      entries.push(
        entry(
          `material-${material.id}`,
          'material',
          object.created_at,
          'Додано матеріал',
          `${material.name}, ${formatAmount(material.quantity)} ${material.unit}`,
        ),
      )
    }

    for (const service of object.services) {
      entries.push(
        entry(
          `service-${service.id}`,
          'service',
          object.created_at,
          'Додано роботу',
          `${service.name}, ${formatAmount(service.planned_volume)} ${service.unit}`,
        ),
      )
    }

    // Створення — останнє в списку: серед подій того ж дня воно найглибше.
    entries.push(entry('created', 'object', object.created_at, 'Обʼєкт створено'))
  }

  return entries
}

/**
 * Знімки в стрічці. Завантажені одним заходом склеюємо в один запис — інакше
 * десяток фото з майданчика витісняє з екрана все інше.
 */
export function photoActivity(photos: ObjectPhoto[]): ActivityEntry[] {
  const groups = new Map<string, ObjectPhoto[]>()

  for (const photo of photos) {
    // Хвилина — той самий захід: більше фото за хвилину людина не вибирає.
    const bucket = photo.at.slice(0, 16)

    groups.set(bucket, [...(groups.get(bucket) ?? []), photo])
  }

  return [...groups.values()].map((group) =>
    entry(
      `photo-${group[0]?.id ?? 0}`,
      'photo',
      group[0]?.at ?? '',
      'Завантажено фото',
      group.length === 1 ? (group[0]?.name ?? null) : formatShots(group.length),
    ),
  )
}

function fromRecord(record: ActivityRecord): ActivityEntry {
  return {
    id: `record-${record.id}`,
    kind: record.kind,
    at: record.at,
    text: record.text,
    detail: record.detail,
    // Нотатку писала людина — їй же дозволяємо її й прибрати.
    recordId: record.kind === 'note' ? record.id : null,
  }
}

/** Уся стрічка обʼєкта, свіже спочатку. */
export function objectActivity(
  object: ConstructionObject,
  records: ActivityRecord[],
  photos: ObjectPhoto[],
): ActivityEntry[] {
  const entries = [...records.map(fromRecord), ...photoActivity(photos), ...derivedActivity(object)]

  // Сортування стабільне, тож події з однаковою міткою часу лишаються в тому
  // порядку, у якому їх зібрали вище.
  return entries.sort((left, right) => momentTime(right.at) - momentTime(left.at))
}
