import { describe, expect, it } from 'vitest'
import {
  buildServicePayload,
  defaultServiceFilters,
  emptyService,
  emptyServiceWorker,
  filterServices,
  formatWorks,
  serviceAssignedVolume,
  serviceCost,
  serviceCostTotal,
  serviceLineProfit,
  serviceProfit,
  serviceRevenue,
  serviceRevenueTotal,
  serviceUsedVolume,
  serviceVolume,
  servicesSummary,
  servicesTotals,
  validateService,
  validateServices,
  workersVolume,
  SERVICE_STATUS_LABELS,
  type Service,
  type ServiceFilters,
  type ServiceForm,
  type ServiceWorkerForm,
} from '../services'

function makeWorker(overrides: Partial<ServiceWorkerForm> = {}): ServiceWorkerForm {
  return { ...emptyServiceWorker(), employeeId: 2, volume: '120', rate: '80', ...overrides }
}

function makeService(overrides: Partial<ServiceForm> = {}): ServiceForm {
  return {
    ...emptyService(),
    name: 'Штукатурка стін',
    unit: 'м²',
    planVolume: '120',
    price: '210',
    ...overrides,
  }
}

describe('serviceVolume', () => {
  it('бере факт, щойно він зʼявився, інакше — план', () => {
    expect(serviceVolume(makeService())).toEqual({ value: 120, basis: 'plan' })
    expect(serviceVolume(makeService({ factVolume: '96' }))).toEqual({ value: 96, basis: 'fact' })
    expect(serviceVolume(makeService({ factVolume: '0' }))).toEqual({ value: 120, basis: 'plan' })
  })
})

describe('гроші по послузі', () => {
  it('собівартість — сума (обсяг × ставка) по виконавцях', () => {
    const service = makeService({
      workers: [makeWorker(), makeWorker({ volume: '40', rate: '95' })],
    })

    expect(serviceCost(service)).toBe(120 * 80 + 40 * 95)
  })

  it('недописаний рядок виконавця не ламає підсумок', () => {
    expect(serviceCost(makeService({ workers: [makeWorker({ rate: '' })] }))).toBe(0)
  })

  it('профіт = ціна × обсяг − ЗП', () => {
    const service = makeService({ factVolume: '100', workers: [makeWorker({ volume: '100' })] })

    expect(serviceRevenue(service)).toBe(100 * 210)
    expect(serviceProfit(service)).toBe(100 * 210 - 100 * 80)
  })

  it('workersVolume каже, скільки обсягу вже розписано на людей', () => {
    const service = makeService({
      workers: [makeWorker(), makeWorker({ volume: '40' }), makeWorker({ volume: '' })],
    })

    expect(workersVolume(service)).toBe(160)
  })

  it('без виконавців уся сума лишається доходом', () => {
    const service = makeService()

    expect(serviceCost(service)).toBe(0)
    expect(serviceProfit(service)).toBe(serviceRevenue(service))
  })
})

describe('servicesTotals', () => {
  it('складає дохід, ЗП і профіт по всіх роботах', () => {
    const totals = servicesTotals([
      makeService({ factVolume: '100', workers: [makeWorker({ volume: '100' })] }),
      makeService({ planVolume: '10', price: '1000' }),
    ])

    expect(totals).toEqual({
      count: 2,
      revenue: 100 * 210 + 10 * 1000,
      cost: 100 * 80,
      profit: 100 * 210 + 10 * 1000 - 100 * 80,
    })
  })
})

describe('validateService', () => {
  it('вимагає назву та плановий обсяг більший за нуль', () => {
    expect(validateService(makeService())).toEqual({})
    expect(validateService(makeService({ name: ' ' })).name).toBeDefined()
    expect(validateService(makeService({ planVolume: '' })).planVolume).toBeDefined()
    expect(validateService(makeService({ planVolume: '0' })).planVolume).toBeDefined()
  })

  it('факт і ціна необовʼязкові, але мають бути числами', () => {
    expect(validateService(makeService({ factVolume: '', price: '' }))).toEqual({})
    expect(validateService(makeService({ factVolume: 'багато' })).factVolume).toBeDefined()
    expect(validateService(makeService({ price: '-1' })).price).toBeDefined()
  })

  it('перевіряє виконавців окремо, по їхніх id', () => {
    const worker = makeWorker({ employeeId: null })
    const errors = validateService(makeService({ workers: [worker] }))

    expect(errors.workers?.[worker.id]?.employeeId).toBeDefined()
  })

  it('збирає помилки по роботах і пропускає справні', () => {
    const good = makeService()
    const bad = makeService({ name: '' })

    expect(Object.keys(validateServices([good, bad]))).toEqual([bad.id])
  })
})

describe('buildServicePayload', () => {
  it('надсилає лише заповнені поля у форматі бекенду', () => {
    expect(buildServicePayload(makeService({ description: '  ' }))).toEqual({
      name: 'Штукатурка стін',
      unit: 'м²',
      planned_volume: 120,
      client_price: 210,
      status: 'planned',
    })
  })

  it('віддає виконавців разом зі ставками', () => {
    const payload = buildServicePayload(
      makeService({
        description: 'По маяках, 2 шари',
        factVolume: '96',
        status: 'in_progress',
        workers: [makeWorker()],
      }),
    )

    expect(payload).toEqual({
      name: 'Штукатурка стін',
      description: 'По маяках, 2 шари',
      unit: 'м²',
      planned_volume: 120,
      actual_volume: 96,
      client_price: 210,
      status: 'in_progress',
      workers: [{ employee_id: 2, volume: 120, rate: 80 }],
    })
  })

  it('не шле рядок, у якому ще не обрали співробітника', () => {
    const payload = buildServicePayload(
      makeService({ workers: [makeWorker({ employeeId: null })] }),
    )

    expect(payload.workers).toBeUndefined()
  })
})

/* ── Роботи обʼєкта ────────────────────────────────────────────── */

function makeRow(id: number, overrides: Partial<Service> = {}): Service {
  return {
    id,
    name: 'Штукатурка стін',
    description: null,
    unit: 'м²',
    planned_volume: 120,
    actual_volume: null,
    client_price: 210,
    status: { value: 'planned', label: SERVICE_STATUS_LABELS.planned },
    workers: [],
    ...overrides,
  }
}

describe('гроші по збереженій роботі', () => {
  it('рахує суму за фактом, щойно він зʼявився, інакше за планом', () => {
    expect(serviceUsedVolume(makeRow(1))).toEqual({ value: 120, basis: 'plan' })
    expect(serviceUsedVolume(makeRow(1, { actual_volume: 96 }))).toEqual({
      value: 96,
      basis: 'fact',
    })

    expect(serviceRevenueTotal(makeRow(1))).toBe(120 * 210)
    expect(serviceRevenueTotal(makeRow(1, { actual_volume: 96 }))).toBe(96 * 210)
  })

  it('собівартість — уся ЗП по виконавцях, профіт — різниця', () => {
    const row = makeRow(1, {
      workers: [
        { employee_id: 2, volume: 80, rate: 90 },
        { employee_id: 3, volume: 40, rate: 70 },
      ],
    })

    expect(serviceCostTotal(row)).toBe(80 * 90 + 40 * 70)
    expect(serviceAssignedVolume(row)).toBe(120)
    expect(serviceLineProfit(row)).toBe(120 * 210 - (80 * 90 + 40 * 70))
  })
})

describe('servicesSummary', () => {
  it('складає гроші й рахує роботи по стадіях', () => {
    const summary = servicesSummary([
      makeRow(1),
      makeRow(2, {
        actual_volume: 100,
        client_price: 300,
        status: { value: 'done', label: SERVICE_STATUS_LABELS.done },
        workers: [{ employee_id: 2, volume: 100, rate: 120 }],
      }),
    ])

    expect(summary.total).toBe(2)
    expect(summary.revenue).toBe(120 * 210 + 100 * 300)
    expect(summary.cost).toBe(100 * 120)
    expect(summary.profit).toBe(summary.revenue - summary.cost)
    expect(summary.byStatus).toEqual({ planned: 1, in_progress: 0, done: 1 })
  })

  it('порожній список дає нулі по всіх стадіях', () => {
    expect(servicesSummary([])).toEqual({
      total: 0,
      revenue: 0,
      cost: 0,
      profit: 0,
      byStatus: { planned: 0, in_progress: 0, done: 0 },
    })
  })
})

describe('filterServices', () => {
  const rows = [
    makeRow(1, { name: 'Штукатурка стін' }),
    makeRow(2, {
      name: 'Стяжка підлоги',
      status: { value: 'done', label: SERVICE_STATUS_LABELS.done },
      client_price: 900,
      workers: [{ employee_id: 5, volume: 120, rate: 60 }],
    }),
    makeRow(3, {
      name: 'Електрика',
      status: { value: 'done', label: SERVICE_STATUS_LABELS.done },
      workers: [{ employee_id: 7, volume: 60, rate: 100 }],
    }),
  ]

  function ids(filters: Partial<ServiceFilters>): number[] {
    return filterServices(rows, { ...defaultServiceFilters(), ...filters }).map((row) => row.id)
  }

  it('без фільтрів лишає порядок, у якому роботи завели', () => {
    expect(ids({})).toEqual([1, 2, 3])
  })

  it('порожній список стадій означає «усі»', () => {
    expect(ids({ statuses: [] })).toEqual([1, 2, 3])
    expect(ids({ statuses: ['done'] })).toEqual([2, 3])
  })

  it('показує роботи, де зайнята конкретна людина', () => {
    expect(ids({ employeeId: 5 })).toEqual([2])
    expect(ids({ employeeId: 99 })).toEqual([])
  })

  it('шукає за назвою без огляду на регістр', () => {
    expect(ids({ query: '  ШТУКАТУР ' })).toEqual([1])
    expect(ids({ query: 'нічого' })).toEqual([])
  })

  it('сортує за сумою, назвою та стадією', () => {
    expect(ids({ sort: 'amount' })).toEqual([2, 1, 3])
    expect(ids({ sort: 'name' })).toEqual([3, 2, 1])
    expect(ids({ sort: 'status' })).toEqual([1, 2, 3])
  })
})

describe('formatWorks', () => {
  it('узгоджує число з формою слова', () => {
    expect(formatWorks(1)).toBe('1 робота')
    expect(formatWorks(3)).toBe('3 роботи')
    expect(formatWorks(11)).toBe('11 робіт')
    expect(formatWorks(22)).toBe('22 роботи')
  })
})
