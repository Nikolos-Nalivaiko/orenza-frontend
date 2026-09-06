import { describe, expect, it } from 'vitest'
import { employeeCharges, groupByObject, payrollTotals } from '../payroll'
import { OBJECT_STATUS_LABELS, type ConstructionObject } from '../objects'
import { SERVICE_STATUS_LABELS, type Service, type ServiceWorkerPayload } from '../services'

const TODAY = '2026-09-02'

function service(overrides: Partial<Service> = {}): Service {
  return {
    id: 1,
    name: 'Монолітні роботи',
    description: null,
    unit: 'м³',
    planned_volume: 100,
    actual_volume: null,
    client_price: 1000,
    status: { value: 'in_progress', label: SERVICE_STATUS_LABELS.in_progress },
    workers: [],
    ...overrides,
  }
}

function worker(overrides: Partial<ServiceWorkerPayload> = {}): ServiceWorkerPayload {
  return { employee_id: 1, volume: 100, rate: 400, ...overrides }
}

function makeObject(overrides: Partial<ConstructionObject> = {}): ConstructionObject {
  return {
    id: 1,
    workspace_id: 1,
    name: 'ЖК «Пасаж»',
    description: null,
    address: 'вул. Стеценка, 12 · Київ',
    client: null,
    status: { value: 'in_progress', label: OBJECT_STATUS_LABELS.in_progress },
    started_at: '2026-06-01',
    finished_at: '2026-10-14',
    actual_started_at: '2026-06-08',
    actual_finished_at: null,
    cover: null,
    materials: [],
    services: [service({ workers: [worker()] })],
    discount_percent: null,
    discount_amount: null,
    payments: [],
    public_token: 'token-1',
    archived_at: null,
    created_at: '2026-06-01T09:00:00.000Z',
    ...overrides,
  }
}

describe('employeeCharges', () => {
  it('бере лише рядки бригади з цією людиною', () => {
    const charges = employeeCharges(
      [
        makeObject({
          services: [service({ workers: [worker(), worker({ employee_id: 2, rate: 500 })] })],
        }),
      ],
      1,
    )

    expect(charges).toHaveLength(1)
    expect(charges[0]?.amount).toBe(40_000)
  })

  it('рахує частку людини від обсягу роботи — факту, коли він є', () => {
    const [byPlan] = employeeCharges(
      [makeObject({ services: [service({ workers: [worker({ volume: 25 })] })] })],
      1,
    )

    expect(byPlan?.serviceVolume).toBe(100)
    expect(byPlan?.share).toBe(0.25)

    const [byFact] = employeeCharges(
      [
        makeObject({
          services: [service({ actual_volume: 50, workers: [worker({ volume: 25 })] })],
        }),
      ],
      1,
    )

    expect(byFact?.serviceVolume).toBe(50)
    expect(byFact?.share).toBe(0.5)
  })

  it('одна людина двічі в бригаді дає два різні рядки', () => {
    const charges = employeeCharges(
      [
        makeObject({
          services: [service({ workers: [worker({ volume: 60 }), worker({ volume: 40 })] })],
        }),
      ],
      1,
    )

    expect(charges.map((charge) => charge.id)).toEqual(['1-1-0', '1-1-1'])
    expect(charges.map((charge) => charge.amount)).toEqual([24_000, 16_000])
  })

  it('датою бере завершення для закритої роботи й фактичний початок для решти', () => {
    const [open] = employeeCharges([makeObject()], 1)

    expect(open?.at).toBe('2026-06-08')

    const [done] = employeeCharges(
      [
        makeObject({
          actual_finished_at: '2026-08-21',
          services: [
            service({
              status: { value: 'done', label: SERVICE_STATUS_LABELS.done },
              workers: [worker()],
            }),
          ],
        }),
      ],
      1,
    )

    expect(done?.at).toBe('2026-08-21')
  })

  it('без фактичних дат лягає на день заведення обʼєкта', () => {
    const [charge] = employeeCharges([makeObject({ actual_started_at: null })], 1)

    expect(charge?.at).toBe('2026-06-01')
  })

  it('свіжі нарахування йдуть зверху', () => {
    const charges = employeeCharges(
      [makeObject(), makeObject({ id: 2, actual_started_at: '2026-08-30' })],
      1,
    )

    expect(charges.map((charge) => charge.objectId)).toEqual([2, 1])
  })
})

describe('payrollTotals', () => {
  it('складає нараховане з усіх рядків бригад', () => {
    const charges = employeeCharges(
      [
        makeObject({
          services: [
            service({ workers: [worker()] }),
            service({ id: 2, name: 'Мурування', workers: [worker({ volume: 50 })] }),
          ],
        }),
      ],
      1,
    )

    const totals = payrollTotals(charges, TODAY)

    expect(totals.accrued).toBe(60_000)
    expect(totals.charges).toBe(2)
  })

  it('окремо тримає суму по закритих роботах', () => {
    const charges = employeeCharges(
      [
        makeObject({
          services: [
            service({ workers: [worker()] }),
            service({
              id: 2,
              name: 'Мурування',
              status: { value: 'done', label: SERVICE_STATUS_LABELS.done },
              workers: [worker({ volume: 50 })],
            }),
          ],
        }),
      ],
      1,
    )

    const totals = payrollTotals(charges, TODAY)

    expect(totals.accrued).toBe(60_000)
    expect(totals.done).toBe(20_000)
  })

  it('за місяць бере лише нарахування цього місяця', () => {
    const charges = employeeCharges(
      [makeObject(), makeObject({ id: 2, actual_started_at: '2026-09-01' })],
      1,
    )

    const totals = payrollTotals(charges, TODAY)

    expect(totals.accrued).toBe(80_000)
    expect(totals.month).toBe(40_000)
  })

  it('зайнятим вважає лише незакриті роботи на живих обʼєктах', () => {
    const charges = employeeCharges(
      [
        makeObject(),
        makeObject({
          id: 2,
          services: [
            service({
              status: { value: 'done', label: SERVICE_STATUS_LABELS.done },
              workers: [worker()],
            }),
          ],
        }),
        makeObject({ id: 3, archived_at: '2026-08-01T10:00:00.000Z' }),
      ],
      1,
    )

    const totals = payrollTotals(charges, TODAY)

    expect(totals.objects).toBe(3)
    expect(totals.busy).toBe(1)
  })
})

describe('groupByObject', () => {
  it('усередині обʼєкта ставить незакриті роботи зверху', () => {
    const groups = groupByObject(
      employeeCharges(
        [
          makeObject({
            services: [
              service({
                id: 1,
                name: 'Закрита',
                status: { value: 'done', label: SERVICE_STATUS_LABELS.done },
                workers: [worker()],
              }),
              service({ id: 2, name: 'У роботі', workers: [worker({ volume: 10 })] }),
            ],
          }),
        ],
        1,
      ),
    )

    expect(groups[0]?.rows.map((row) => row.serviceName)).toEqual(['У роботі', 'Закрита'])
    expect(groups[0]?.done).toBe(1)
  })

  it('збирає роботи одного обʼєкта в один блок і ставить живі зверху', () => {
    const charges = employeeCharges(
      [
        makeObject({ id: 1, archived_at: '2026-08-01T10:00:00.000Z' }),
        makeObject({
          id: 2,
          name: '«Липки»',
          services: [
            service({ workers: [worker()] }),
            service({ id: 2, name: 'Мурування', workers: [worker({ volume: 50 })] }),
          ],
        }),
      ],
      1,
    )

    const groups = groupByObject(charges)

    expect(groups.map((group) => group.objectId)).toEqual([2, 1])
    expect(groups[0]?.rows).toHaveLength(2)
    expect(groups[0]?.amount).toBe(60_000)
    expect(groups[0]?.busy).toBe(true)
    expect(groups[0]?.address).toBe('вул. Стеценка, 12 · Київ')
    expect(groups[1]?.busy).toBe(false)
  })
})
