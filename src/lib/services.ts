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
