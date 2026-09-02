import { describe, expect, it } from 'vitest'
import {
  buildServicePayload,
  emptyService,
  emptyServiceWorker,
  serviceCost,
  serviceProfit,
  serviceRevenue,
  serviceVolume,
  servicesTotals,
  validateService,
  validateServices,
  workersVolume,
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
