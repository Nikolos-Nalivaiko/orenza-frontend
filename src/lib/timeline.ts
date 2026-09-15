import {
  daysBetween,
  formatDayBrief,
  formatDays,
  formatPeriodBrief,
  periodDays,
} from '@/lib/objects'

export type TimelineState =
  'empty' | 'partial' | 'invalid' | 'upcoming' | 'waiting' | 'going' | 'late' | 'done'

export type FigureTone = 'neutral' | 'good' | 'warn' | 'late' | 'muted'

export interface TimelineDates {
  started_at: string | null
  finished_at: string | null
  actual_started_at: string | null
  actual_finished_at: string | null
}

export interface TimelineFigure {
  label: string
  value: string
  unit: string
  hint: string
  tone: FigureTone
}

export interface ObjectTimeline {
  state: TimelineState
  figures: TimelineFigure[]
  note: string | null
}

export type DeviationTone = 'neutral' | 'good' | 'late'

export interface Deviation {
  days: number
  label: string
  tone: DeviationTone
}

function span(from: string, to: string): number {
  return Math.max(0, daysBetween(from, to) ?? 0)
}

function period(from: string, to: string): number {
  return periodDays(from, to) ?? 0
}

function days(
  label: string,
  count: number,
  hint: string,
  tone: FigureTone,
  sign = '',
): TimelineFigure {
  const [value = '', ...unit] = formatDays(count).split(' ')

  return { label, value: `${sign}${value}`, unit: unit.join(' '), hint, tone }
}

function word(label: string, value: string, hint: string, tone: FigureTone): TimelineFigure {
  return { label, value, unit: '', hint, tone }
}

export function objectTimeline(dates: TimelineDates, today: string): ObjectTimeline {
  const { started_at: planStart, finished_at: planFinish } = dates
  const start =
    dates.actual_started_at !== null && dates.actual_started_at <= today
      ? dates.actual_started_at
      : null
  const finish =
    start !== null && dates.actual_finished_at !== null && dates.actual_finished_at <= today
      ? dates.actual_finished_at
      : null
  const brief = (day: string): string => formatDayBrief(day, today)
  const range = (from: string, to: string): string => formatPeriodBrief(from, to, today)

  if (planStart !== null && planFinish !== null && planFinish < planStart) {
    return {
      state: 'invalid',
      figures: [],
      note: 'Планове завершення стоїть раніше за початок — виправте дати нижче',
    }
  }

  if (planStart === null || planFinish === null) {
    if (start !== null) {
      return {
        state: 'partial',
        figures: [
          finish !== null
            ? days('Фактичний строк', period(start, finish), range(start, finish), 'neutral')
            : days('Роботи тривають', period(start, today), `з ${brief(start)}`, 'neutral'),
        ],
        note: 'Вкажіть плановий строк, щоб звіряти з ним факт',
      }
    }

    const empty = planStart === null && planFinish === null

    return {
      state: empty ? 'empty' : 'partial',
      figures: [],
      note: empty
        ? 'Строки ще не заповнені — вкажіть плановий початок і завершення'
        : 'Вкажіть і плановий початок, і завершення',
    }
  }

  const plan = days(
    'Плановий строк',
    period(planStart, planFinish),
    range(planStart, planFinish),
    'muted',
  )

  if (start !== null && finish !== null) {
    const drift = daysBetween(planFinish, finish) ?? 0
    const instead = `${brief(finish)} замість ${brief(planFinish)}`

    const key =
      drift > 0
        ? days('Здано із запізненням', drift, instead, 'late', '+')
        : drift < 0
          ? days('Здано раніше строку', drift, instead, 'good', '−')
          : word('Здано', 'Вчасно', brief(finish), 'good')

    return {
      state: 'done',
      figures: [
        key,
        days('Фактичний строк', period(start, finish), range(start, finish), 'muted'),
        plan,
      ],
      note: null,
    }
  }

  if (today > planFinish) {
    return {
      state: 'late',
      figures: [
        days(
          'Прострочено',
          span(planFinish, today),
          `здача була ${brief(planFinish)}`,
          'late',
          '+',
        ),
        start === null
          ? word('Старт', 'Не почали', `планували ${brief(planStart)}`, 'muted')
          : days('Роботи тривають', period(start, today), `з ${brief(start)}`, 'muted'),
        plan,
      ],
      note: null,
    }
  }

  if (start === null) {
    if (today < planStart) {
      return {
        state: 'upcoming',
        figures: [
          days('До старту', span(today, planStart), `старт ${brief(planStart)}`, 'neutral'),
          plan,
        ],
        note: null,
      }
    }

    const waited = span(planStart, today)

    return {
      state: 'waiting',
      figures: [
        waited === 0
          ? word('Старт за планом', 'Сьогодні', brief(planStart), 'warn')
          : days('Затримка старту', waited, `старт планували ${brief(planStart)}`, 'warn'),
        days('До здачі', span(today, planFinish), `здача ${brief(planFinish)}`, 'muted'),
        plan,
      ],
      note: null,
    }
  }

  const left = span(today, planFinish)

  return {
    state: 'going',
    figures: [
      left === 0
        ? word('Здача за планом', 'Сьогодні', brief(planFinish), 'warn')
        : days('До здачі', left, `здача ${brief(planFinish)}`, left <= 3 ? 'warn' : 'neutral'),
      days('Роботи тривають', period(start, today), `з ${brief(start)}`, 'muted'),
      plan,
    ],
    note: null,
  }
}

export function dateDeviation(
  plan: string | null,
  fact: string | null,
  kind: 'start' | 'finish',
): Deviation | null {
  if (plan === null || fact === null) {
    return null
  }

  const days = daysBetween(plan, fact)

  if (days === null) {
    return null
  }

  const label = days === 0 ? 'вчасно' : `${days > 0 ? '+' : '−'}${formatDays(days)}`

  if (kind === 'start') {
    return { days, label, tone: 'neutral' }
  }

  return { days, label, tone: days > 0 ? 'late' : 'good' }
}
