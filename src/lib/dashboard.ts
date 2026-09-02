/**
 * Дані дашборда. Бекенд поки має лише users/workspaces/memberships, тож
 * зведення збирається локально — типи навмисно описані так, як їх віддаватиме
 * майбутній GET /api/v1/workspaces/{id}/dashboard, щоб потім замінити лише
 * джерело даних.
 */

export type Period = 'week' | 'month' | 'quarter'

export interface PeriodOption {
  value: Period
  label: string
  hint: string
}

export const PERIODS: readonly PeriodOption[] = [
  { value: 'week', label: 'Тиждень', hint: 'останні 7 днів' },
  { value: 'month', label: 'Місяць', hint: 'останні 4 тижні' },
  { value: 'quarter', label: 'Квартал', hint: 'останні 3 місяці' },
]

export type MetricTone = 'brand' | 'ink' | 'danger'
export type MetricFormat = 'count' | 'money' | 'percent'

export interface Metric {
  key: string
  label: string
  value: number
  format: MetricFormat
  /** Зміна до попереднього такого ж періоду, у відсотках. */
  delta: number
  hint: string
  /** Ряд для спарклайна — той самий показник по бакетах періоду. */
  trend: number[]
  tone: MetricTone
}

export interface FlowPoint {
  label: string
  income: number
  spend: number
}

export interface CostSlice {
  key: string
  label: string
  value: number
}

export type SiteStatus = 'ok' | 'risk' | 'late'

export interface Site {
  id: number
  name: string
  address: string
  stage: string
  progress: number
  budget: number
  spent: number
  crew: string
  deadline: string
  status: SiteStatus
}

export type TaskUrgency = 'late' | 'today' | 'soon'

export interface Task {
  id: number
  title: string
  site: string
  due: string
  urgency: TaskUrgency
  done: boolean
}

export type FeedKind = 'act' | 'delivery' | 'crew' | 'money' | 'lead'

export interface FeedItem {
  id: number
  time: string
  text: string
  site: string
  kind: FeedKind
}

export interface Crew {
  id: number
  name: string
  people: number
  load: number
  site: string
}

export interface DashboardData {
  metrics: Metric[]
  flow: FlowPoint[]
  costs: CostSlice[]
  sites: Site[]
  tasks: Task[]
  feed: FeedItem[]
  crews: Crew[]
}

export const SITE_STATUS_LABELS: Record<SiteStatus, string> = {
  ok: 'За графіком',
  risk: 'Ризик',
  late: 'Відставання',
}

export const FEED_KIND_LABELS: Record<FeedKind, string> = {
  act: 'Акт',
  delivery: 'Постачання',
  crew: 'Бригада',
  money: 'Гроші',
  lead: 'Лід',
}

/* ── Форматування ──────────────────────────────────────────────── */

const integer = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 })
const decimal = new Intl.NumberFormat('uk-UA', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/**
 * Гроші в підписах графіка й плиток скорочуємо: «1,2 млн», «860 тис».
 * Знак ₴ додається окремо — щоб у щільних місцях його можна було лишити
 * тільки в заголовку осі.
 */
export function formatMoney(value: number): string {
  const abs = Math.abs(value)

  if (abs >= 1_000_000) {
    return `${decimal.format(value / 1_000_000)} млн`
  }

  if (abs >= 1_000) {
    return `${integer.format(Math.round(value / 1_000))} тис`
  }

  return integer.format(Math.round(value))
}

export function formatMetric(value: number, format: MetricFormat): string {
  if (format === 'money') {
    return formatMoney(value)
  }

  return format === 'percent' ? `${Math.round(value)}%` : integer.format(Math.round(value))
}

/** «+12%» / «−4%». Нуль лишається без знака. */
export function formatDelta(delta: number): string {
  const rounded = Math.round(Math.abs(delta))

  if (rounded === 0) {
    return '0%'
  }

  return `${delta > 0 ? '+' : '−'}${rounded}%`
}

/* ── Демодані ──────────────────────────────────────────────────── */

const SITES: Site[] = [
  {
    id: 1,
    name: 'ЖК «Пасаж», 3 черга',
    address: 'вул. Стеценка, 12 · Київ',
    stage: 'Монолітні роботи',
    progress: 68,
    budget: 2_400_000,
    spent: 1_608_000,
    crew: 'Бригада №3',
    deadline: '14 жов',
    status: 'ok',
  },
  {
    id: 2,
    name: 'Котеджне містечко «Липки»',
    address: 'с. Гатне · Київська обл.',
    stage: 'Покрівля',
    progress: 41,
    budget: 1_120_000,
    spent: 596_000,
    crew: 'Бригада №1',
    deadline: '2 жов',
    status: 'risk',
  },
  {
    id: 3,
    name: 'Реконструкція складу №4',
    address: 'вул. Промислова, 8 · Львів',
    stage: 'Оздоблення',
    progress: 87,
    budget: 860_000,
    spent: 792_000,
    crew: 'Підряд «Стальпром»',
    deadline: '19 вер',
    status: 'ok',
  },
  {
    id: 4,
    name: 'Офіс «Кварц», 4 поверх',
    address: 'просп. Науки, 54 · Харків',
    stage: 'Демонтаж',
    progress: 23,
    budget: 640_000,
    spent: 214_000,
    crew: 'Бригада №2',
    deadline: '28 вер',
    status: 'late',
  },
]

const TASKS: Task[] = [
  {
    id: 1,
    title: 'Підписати КБ-2в за серпень',
    site: 'ЖК «Пасаж»',
    due: 'учора',
    urgency: 'late',
    done: false,
  },
  {
    id: 2,
    title: 'Замовити арматуру А500С, 18 т',
    site: 'ЖК «Пасаж»',
    due: 'сьогодні',
    urgency: 'today',
    done: false,
  },
  {
    id: 3,
    title: 'Погодити кошторис на покрівлю',
    site: '«Липки»',
    due: 'сьогодні',
    urgency: 'today',
    done: false,
  },
  {
    id: 4,
    title: 'Закрити табель бригади №2',
    site: 'Офіс «Кварц»',
    due: 'завтра',
    urgency: 'soon',
    done: false,
  },
  {
    id: 5,
    title: 'Виїзд на заміри вікон',
    site: 'Склад №4',
    due: 'пт, 12 вер',
    urgency: 'soon',
    done: true,
  },
]

const FEED: FeedItem[] = [
  {
    id: 1,
    time: '09:24',
    text: 'Бетонування 3-го рівня завершено',
    site: 'ЖК «Пасаж»',
    kind: 'crew',
  },
  {
    id: 2,
    time: '08:50',
    text: 'Прийнято 24 т арматури, накладна №1841',
    site: 'ЖК «Пасаж»',
    kind: 'delivery',
  },
  { id: 3, time: 'учора', text: 'Акт КБ-2в на 420 тис ₴ підписано', site: 'Склад №4', kind: 'act' },
  {
    id: 4,
    time: 'учора',
    text: 'Оплата підряднику «Стальпром» — 180 тис ₴',
    site: 'Склад №4',
    kind: 'money',
  },
  {
    id: 5,
    time: '2 дні тому',
    text: 'Новий лід: ремонт офісу, 240 м²',
    site: 'Без обʼєкта',
    kind: 'lead',
  },
  {
    id: 6,
    time: '2 дні тому',
    text: 'Заявка на автокран узгоджена',
    site: '«Липки»',
    kind: 'crew',
  },
]

const CREWS: Crew[] = [
  { id: 1, name: 'Бригада №3', people: 9, load: 96, site: 'ЖК «Пасаж»' },
  { id: 2, name: 'Бригада №1', people: 6, load: 74, site: '«Липки»' },
  { id: 3, name: 'Бригада №2', people: 5, load: 48, site: 'Офіс «Кварц»' },
  { id: 4, name: 'Підряд «Стальпром»', people: 12, load: 88, site: 'Склад №4' },
]

interface PeriodSeed {
  flow: FlowPoint[]
  costs: [number, number, number, number]
  metrics: [Metric, Metric, Metric, Metric]
}

function metric(
  key: string,
  label: string,
  value: number,
  format: MetricFormat,
  delta: number,
  hint: string,
  trend: number[],
  tone: MetricTone,
): Metric {
  return { key, label, value, format, delta, hint, trend, tone }
}

const SEEDS: Record<Period, PeriodSeed> = {
  week: {
    flow: [
      { label: 'Пн', income: 118_000, spend: 88_000 },
      { label: 'Вт', income: 96_000, spend: 132_000 },
      { label: 'Ср', income: 214_000, spend: 96_000 },
      { label: 'Чт', income: 64_000, spend: 151_000 },
      { label: 'Пт', income: 340_000, spend: 208_000 },
      { label: 'Сб', income: 176_000, spend: 119_000 },
      { label: 'Нд', income: 38_000, spend: 34_000 },
    ],
    costs: [412_000, 286_000, 118_000, 12_000],
    metrics: [
      metric(
        'sites',
        'Обʼєктів у роботі',
        4,
        'count',
        0,
        'усі активні',
        [3, 3, 4, 4, 4, 4, 4],
        'ink',
      ),
      metric(
        'done',
        'Виконано робіт',
        1_046_000,
        'money',
        12,
        'за 7 днів, ₴',
        [118, 96, 214, 64, 340, 176, 38],
        'brand',
      ),
      metric(
        'margin',
        'Кошторис освоєно',
        62,
        'percent',
        4,
        'від затвердженого',
        [54, 56, 57, 58, 60, 61, 62],
        'ink',
      ),
      metric(
        'overdue',
        'Прострочені задачі',
        1,
        'count',
        -50,
        'потребують дії',
        [3, 3, 2, 2, 2, 1, 1],
        'danger',
      ),
    ],
  },
  month: {
    flow: [
      { label: '1 тиж', income: 642_000, spend: 481_000 },
      { label: '2 тиж', income: 818_000, spend: 612_000 },
      { label: '3 тиж', income: 537_000, spend: 524_000 },
      { label: '4 тиж', income: 914_000, spend: 703_000 },
    ],
    costs: [1_284_000, 812_000, 396_000, 68_000],
    metrics: [
      metric('sites', 'Обʼєктів у роботі', 6, 'count', 20, 'усі активні', [4, 5, 5, 6], 'ink'),
      metric(
        'done',
        'Виконано робіт',
        2_911_000,
        'money',
        18,
        'за місяць, ₴',
        [642, 818, 537, 914],
        'brand',
      ),
      metric(
        'margin',
        'Кошторис освоєно',
        58,
        'percent',
        9,
        'від затвердженого',
        [41, 47, 52, 58],
        'ink',
      ),
      metric(
        'overdue',
        'Прострочені задачі',
        3,
        'count',
        -25,
        'потребують дії',
        [6, 5, 4, 3],
        'danger',
      ),
    ],
  },
  quarter: {
    flow: [
      { label: 'Черв', income: 2_140_000, spend: 1_724_000 },
      { label: 'Лип', income: 2_648_000, spend: 1_982_000 },
      { label: 'Серп', income: 2_372_000, spend: 1_836_000 },
    ],
    costs: [3_512_000, 2_218_000, 1_104_000, 208_000],
    metrics: [
      metric('sites', 'Обʼєктів у роботі', 9, 'count', 28, 'усі активні', [6, 8, 9], 'ink'),
      metric(
        'done',
        'Виконано робіт',
        7_160_000,
        'money',
        22,
        'за квартал, ₴',
        [2140, 2648, 2372],
        'brand',
      ),
      metric(
        'margin',
        'Кошторис освоєно',
        71,
        'percent',
        14,
        'від затвердженого',
        [52, 63, 71],
        'ink',
      ),
      metric(
        'overdue',
        'Прострочені задачі',
        5,
        'count',
        25,
        'потребують дії',
        [3, 4, 5],
        'danger',
      ),
    ],
  },
}

const COST_LABELS: [string, string, string, string] = [
  'Матеріали',
  'Роботи',
  'Техніка',
  'Логістика',
]
const COST_KEYS: [string, string, string, string] = ['materials', 'works', 'machinery', 'logistics']

export function demoDashboard(period: Period): DashboardData {
  const seed = SEEDS[period]

  return {
    metrics: seed.metrics.map((item) => ({ ...item, trend: [...item.trend] })),
    flow: seed.flow.map((point) => ({ ...point })),
    costs: seed.costs.map((value, index) => ({
      key: COST_KEYS[index] ?? `slot-${index}`,
      label: COST_LABELS[index] ?? '',
      value,
    })),
    sites: SITES.map((site) => ({ ...site })),
    tasks: TASKS.map((task) => ({ ...task })),
    feed: FEED.map((item) => ({ ...item })),
    crews: CREWS.map((crew) => ({ ...crew })),
  }
}
