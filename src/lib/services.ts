/**
 * Послуги (роботи) обʼєкта. Логіка грошей дзеркалить матеріали, але
 * собівартість тут не закупівля, а зарплата виконавців:
 *
 *   собівартість послуги = Σ (обсяг виконавця × його ставка)
 *   профіт із послуги    = ціна для клієнта × обсяг − собівартість
 *
 * У приватному просторі виконавців немає — там уся сума послуги
 * показується як дохід, без розкладки на профіт.
 */

import type { IconName } from '@/components/ui/icons'
import { multiply, parseAmount } from '@/lib/amount'

export type ServiceStatus = 'planned' | 'in_progress' | 'done'

export interface ServiceStatusOption {
  value: ServiceStatus
  label: string
}

/** Порядок — шлях роботи: заплановано → в роботі → виконано. */
export const SERVICE_STATUSES: readonly ServiceStatusOption[] = [
  { value: 'planned', label: 'Заплановано' },
  { value: 'in_progress', label: 'В роботі' },
  { value: 'done', label: 'Виконано' },
]

export const SERVICE_STATUS_LABELS: Record<ServiceStatus, string> = {
  planned: 'Заплановано',
  in_progress: 'В роботі',
  done: 'Виконано',
}

export const SERVICE_UNITS = [
  'м²',
  'м³',
  'м.п.',
  'шт',
  'т',
  'год',
  'зміна',
  'точка',
  'компл.',
] as const

export type ServiceUnit = (typeof SERVICE_UNITS)[number]

/* ── Форма ─────────────────────────────────────────────────────── */

/**
 * Рядок виконавця: хто зі співробітників, скільки роботи взяв і за якою
 * ставкою. Людина приходить із довідника простору, тож у формі лежить її id,
 * а не набране руками прізвище.
 */
export interface ServiceWorkerForm {
  id: string
  employeeId: number | null
  volume: string
  rate: string
}

export interface ServiceForm {
  id: string
  name: string
  description: string
  unit: ServiceUnit
  planVolume: string
  factVolume: string
  /** Ціна за одиницю для клієнта. Собівартість збирається з виконавців. */
  price: string
  status: ServiceStatus
  workers: ServiceWorkerForm[]
}

export type ServiceWorkerErrors = Partial<Record<'employeeId' | 'volume' | 'rate', string>>

export interface ServiceErrors {
  name?: string
  planVolume?: string
  factVolume?: string
  price?: string
  workers?: Record<string, ServiceWorkerErrors>
}

export const SERVICE_NAME_MAX = 255
export const SERVICE_DESCRIPTION_MAX = 1000

let sequence = 0

export function nextServiceId(prefix = 's'): string {
  sequence += 1

  return `${prefix}-${sequence}`
}

export function emptyServiceWorker(): ServiceWorkerForm {
  return { id: nextServiceId('w'), employeeId: null, volume: '', rate: '' }
}

/**
 * Рядок виконавця з чернетки: вона могла зберегтись до появи довідника
 * співробітників, тож поля добираємо до сьогоднішніх, а зайві прибираємо.
 */
export function normalizeServiceWorker(worker: Partial<ServiceWorkerForm>): ServiceWorkerForm {
  return {
    id: worker.id ?? nextServiceId('w'),
    employeeId: worker.employeeId ?? null,
    volume: worker.volume ?? '',
    rate: worker.rate ?? '',
  }
}

export function emptyService(): ServiceForm {
  return {
    id: nextServiceId(),
    name: '',
    description: '',
    unit: 'м²',
    planVolume: '',
    factVolume: '',
    price: '',
    status: 'planned',
    workers: [],
  }
}

/* ── Гроші ─────────────────────────────────────────────────────── */

export function workerCost(worker: ServiceWorkerForm): number | null {
  return multiply(worker.volume, worker.rate)
}

/** Собівартість послуги — уся зарплата за нею. */
export function serviceCost(service: ServiceForm): number {
  return service.workers.reduce((sum, worker) => sum + (workerCost(worker) ?? 0), 0)
}

/** Скільки обсягу роботи вже розписано на виконавців. */
export function workersVolume(service: ServiceForm): number {
  return service.workers.reduce((sum, worker) => sum + (parseAmount(worker.volume) ?? 0), 0)
}

/**
 * Обсяг для розрахунку: факт, щойно він зʼявився, інакше план — інакше на
 * етапі планування кожна послуга показувала б нулі.
 */
export function serviceVolume(service: ServiceForm): { value: number; basis: 'fact' | 'plan' } {
  const fact = parseAmount(service.factVolume)

  if (fact !== null && fact > 0) {
    return { value: fact, basis: 'fact' }
  }

  return { value: parseAmount(service.planVolume) ?? 0, basis: 'plan' }
}

/** Дохід від послуги: ціна для клієнта × обсяг. */
export function serviceRevenue(service: ServiceForm): number {
  const price = parseAmount(service.price)

  return price === null ? 0 : price * serviceVolume(service).value
}

export function serviceProfit(service: ServiceForm): number {
  return serviceRevenue(service) - serviceCost(service)
}

export interface ServicesTotals {
  count: number
  revenue: number
  cost: number
  profit: number
}

export function servicesTotals(services: ServiceForm[]): ServicesTotals {
  const totals: ServicesTotals = { count: services.length, revenue: 0, cost: 0, profit: 0 }

  for (const service of services) {
    totals.revenue += serviceRevenue(service)
    totals.cost += serviceCost(service)
  }

  totals.profit = totals.revenue - totals.cost

  return totals
}

/* ── Валідація ─────────────────────────────────────────────────── */

function numberError(value: string, required: boolean): string | undefined {
  if (value.trim() === '') {
    return required ? 'Вкажіть значення' : undefined
  }

  const parsed = parseAmount(value)

  if (parsed === null) {
    return 'Тільки число'
  }

  return parsed < 0 ? 'Не менше нуля' : undefined
}

function validateWorker(worker: ServiceWorkerForm): ServiceWorkerErrors {
  const errors: ServiceWorkerErrors = {}

  if (worker.employeeId === null) {
    errors.employeeId = 'Оберіть виконавця'
  }

  const volume = numberError(worker.volume, false)
  const rate = numberError(worker.rate, false)

  if (volume !== undefined) {
    errors.volume = volume
  }

  if (rate !== undefined) {
    errors.rate = rate
  }

  return errors
}

export function validateService(service: ServiceForm): ServiceErrors {
  const errors: ServiceErrors = {}
  const name = service.name.trim()

  if (name === '') {
    errors.name = 'Вкажіть роботу'
  } else if (name.length > SERVICE_NAME_MAX) {
    errors.name = `Максимум ${SERVICE_NAME_MAX} символів`
  }

  const plan = parseAmount(service.planVolume)

  if (service.planVolume.trim() === '') {
    errors.planVolume = 'Вкажіть обсяг'
  } else if (plan === null) {
    errors.planVolume = 'Тільки число'
  } else if (plan <= 0) {
    errors.planVolume = 'Більше нуля'
  }

  const fact = numberError(service.factVolume, false)
  const price = numberError(service.price, false)

  if (fact !== undefined) {
    errors.factVolume = fact
  }

  if (price !== undefined) {
    errors.price = price
  }

  const workers: Record<string, ServiceWorkerErrors> = {}

  for (const worker of service.workers) {
    const workerErrors = validateWorker(worker)

    if (Object.keys(workerErrors).length > 0) {
      workers[worker.id] = workerErrors
    }
  }

  if (Object.keys(workers).length > 0) {
    errors.workers = workers
  }

  return errors
}

export function validateServices(services: ServiceForm[]): Record<string, ServiceErrors> {
  const map: Record<string, ServiceErrors> = {}

  for (const service of services) {
    const errors = validateService(service)

    if (Object.keys(errors).length > 0) {
      map[service.id] = errors
    }
  }

  return map
}

/* ── Запит ─────────────────────────────────────────────────────── */

export interface ServiceWorkerPayload {
  employee_id: number
  volume: number
  rate: number
}

export interface ServicePayload {
  name: string
  description?: string
  unit: string
  planned_volume: number
  actual_volume?: number
  client_price?: number
  status: ServiceStatus
  workers?: ServiceWorkerPayload[]
}

export function buildServicePayload(service: ServiceForm): ServicePayload {
  const description = service.description.trim()
  const fact = parseAmount(service.factVolume)
  const price = parseAmount(service.price)

  // Рядок без обраної людини — недописаний чернетковий: на бекенд не їде.
  const workers = service.workers.flatMap((worker) =>
    worker.employeeId === null
      ? []
      : [
          {
            employee_id: worker.employeeId,
            volume: parseAmount(worker.volume) ?? 0,
            rate: parseAmount(worker.rate) ?? 0,
          },
        ],
  )

  return {
    name: service.name.trim(),
    ...(description === '' ? {} : { description }),
    unit: service.unit,
    planned_volume: parseAmount(service.planVolume) ?? 0,
    ...(fact === null ? {} : { actual_volume: fact }),
    ...(price === null ? {} : { client_price: price }),
    status: service.status,
    ...(workers.length === 0 ? {} : { workers }),
  }
}

/** Ресурс послуги у форматі майбутнього ServiceResource. */
export interface Service {
  id: number
  name: string
  description: string | null
  unit: string
  planned_volume: number
  actual_volume: number | null
  client_price: number | null
  status: { value: ServiceStatus; label: string }
  workers: ServiceWorkerPayload[]
}

/* ── Роботи обʼєкта ────────────────────────────────────────────── */

/**
 * Далі — те, чим живе вкладка «Послуги» в картці обʼєкта: там роботи вже не
 * форма, а збережені записи. Правило грошей те саме, що й у формі, тільки
 * рахується не з рядків, а з чисел: обсяг береться фактом, щойно він
 * зʼявився, інакше планом.
 */

/** Значок стадії: список → робота йде → зроблено. */
export const SERVICE_STATUS_ICONS: Record<ServiceStatus, IconName> = {
  planned: 'estimate',
  in_progress: 'clock',
  done: 'check',
}

/** Місце статусу в житті роботи — за ним же їх і сортуємо. */
export function serviceStatusIndex(status: ServiceStatus): number {
  return SERVICE_STATUSES.findIndex((option) => option.value === status)
}

export function serviceUsedVolume(service: Service): { value: number; basis: 'fact' | 'plan' } {
  const fact = service.actual_volume

  return fact !== null && fact > 0
    ? { value: fact, basis: 'fact' }
    : { value: service.planned_volume, basis: 'plan' }
}

export function serviceRevenueTotal(service: Service): number {
  return (service.client_price ?? 0) * serviceUsedVolume(service).value
}

/** Собівартість роботи — уся зарплата за нею. */
export function serviceCostTotal(service: Service): number {
  return service.workers.reduce((sum, worker) => sum + worker.volume * worker.rate, 0)
}

export function serviceLineProfit(service: Service): number {
  return serviceRevenueTotal(service) - serviceCostTotal(service)
}

/** Скільки обсягу вже розписано на виконавців: решта висить нерозподіленою. */
export function serviceAssignedVolume(service: Service): number {
  return service.workers.reduce((sum, worker) => sum + worker.volume, 0)
}

export interface ServicesSummary {
  /** Робіт усього — саме стільки рядків у таблиці. */
  total: number
  revenue: number
  cost: number
  profit: number
  /** Скільки робіт на кожній стадії. */
  byStatus: Record<ServiceStatus, number>
}

export function servicesSummary(services: Service[]): ServicesSummary {
  const summary: ServicesSummary = {
    total: services.length,
    revenue: 0,
    cost: 0,
    profit: 0,
    byStatus: { planned: 0, in_progress: 0, done: 0 },
  }

  for (const service of services) {
    summary.byStatus[service.status.value] += 1
    summary.revenue += serviceRevenueTotal(service)
    summary.cost += serviceCostTotal(service)
  }

  summary.profit = summary.revenue - summary.cost

  return summary
}

/** 1 робота, 2–4 роботи, 5+ робіт. */
export function formatWorks(count: number): string {
  const tail = count % 100 >= 11 && count % 100 <= 14 ? 0 : count % 10

  if (tail === 1) {
    return `${count} робота`
  }

  return tail >= 2 && tail <= 4 ? `${count} роботи` : `${count} робіт`
}

/* ── Фільтри та сортування ─────────────────────────────────────── */

export type ServiceSort = 'added' | 'status' | 'name' | 'amount'

export interface ServiceSortOption {
  value: ServiceSort
  label: string
}

export const SERVICE_SORTS: readonly ServiceSortOption[] = [
  { value: 'added', label: 'Як додано' },
  { value: 'status', label: 'За стадією' },
  { value: 'name', label: 'За назвою' },
  { value: 'amount', label: 'Найдорожчі' },
]

export interface ServiceFilters {
  query: string
  /** Порожній список означає «усі стадії». */
  statuses: ServiceStatus[]
  /** null — не важливо, хто виконує. У приватному просторі фільтра немає. */
  employeeId: number | null
  sort: ServiceSort
}

export function defaultServiceFilters(): ServiceFilters {
  return { query: '', statuses: [], employeeId: null, sort: 'added' }
}

export function isDefaultServiceFilters(filters: ServiceFilters): boolean {
  return (
    filters.query.trim() === '' &&
    filters.statuses.length === 0 &&
    filters.employeeId === null &&
    filters.sort === 'added'
  )
}

function compareServices(left: Service, right: Service, sort: ServiceSort): number {
  if (sort === 'status') {
    return serviceStatusIndex(left.status.value) - serviceStatusIndex(right.status.value)
  }

  if (sort === 'name') {
    return left.name.localeCompare(right.name, 'uk')
  }

  if (sort === 'amount') {
    return serviceRevenueTotal(right) - serviceRevenueTotal(left)
  }

  return 0
}

/** Фільтрація й сортування одним проходом — рівно те, що показує таблиця. */
export function filterServices(services: Service[], filters: ServiceFilters): Service[] {
  const needle = filters.query.trim().toLowerCase()

  const rows = services.filter((service) => {
    if (filters.statuses.length > 0 && !filters.statuses.includes(service.status.value)) {
      return false
    }

    // «Покажи все, де зайнятий Петров» — завантаження людини видно без
    // окремого розділу «Співробітники».
    if (
      filters.employeeId !== null &&
      !service.workers.some((worker) => worker.employee_id === filters.employeeId)
    ) {
      return false
    }

    return needle === '' || service.name.toLowerCase().includes(needle)
  })

  // Сортування стабільне, тож «Як додано» лишає роботи в порядку введення.
  return rows.sort((left, right) => compareServices(left, right, filters.sort))
}
