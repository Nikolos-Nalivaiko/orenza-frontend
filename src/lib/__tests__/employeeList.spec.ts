import { describe, expect, it } from 'vitest'
import {
  applyEmployeeFilters,
  countEmployees,
  defaultEmployeeFilters,
  employeeRoles,
  employeeRows,
  isDefaultEmployeeFilters,
  matchesEmployeeQuery,
  totalAccrued,
  type EmployeeFilters,
} from '../employeeList'
import type { Employee } from '../employees'
import { OBJECT_STATUS_LABELS, type ConstructionObject } from '../objects'
import { SERVICE_STATUS_LABELS, type Service, type ServiceWorkerPayload } from '../services'

const TODAY = '2026-09-02'

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 1,
    name: 'Тарас Мельник',
    role: 'Муляр',
    crew: 'Бригада №1',
    phone: '+380 97 118 62 30',
    email: '',
    status: 'active',
    notes: '',
    created_at: '2025-08-12T07:45:00.000Z',
    ...overrides,
  }
}

function worker(overrides: Partial<ServiceWorkerPayload> = {}): ServiceWorkerPayload {
  return { employee_id: 1, volume: 100, rate: 400, ...overrides }
}

function service(overrides: Partial<Service> = {}): Service {
  return {
    id: 1,
    name: 'Мурування',
    description: null,
    unit: 'м³',
    planned_volume: 100,
    actual_volume: null,
    client_price: 1000,
    status: { value: 'in_progress', label: SERVICE_STATUS_LABELS.in_progress },
    workers: [worker()],
    ...overrides,
  }
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
    services: [service()],
    discount_percent: null,
    discount_amount: null,
    payments: [],
    public_token: 'token-1',
    archived_at: null,
    created_at: '2026-06-01T09:00:00.000Z',
    ...overrides,
  }
}

describe('employeeRows', () => {
  it('зводить завантаження й нараховане по кожній людині', () => {
    const rows = employeeRows(
      [makeEmployee(), makeEmployee({ id: 2, name: 'Оксана Панченко' })],
      [makeObject()],
      TODAY,
    )

    expect(rows[0]?.totals.busy).toBe(1)
    expect(rows[0]?.totals.accrued).toBe(40_000)
    expect(rows[0]?.active).toBe(true)

    // Людину ще не ставили на роботи — вона вільна й без нарахувань.
    expect(rows[1]?.totals.busy).toBe(0)
    expect(rows[1]?.totals.accrued).toBe(0)
  })

  it('неактивність бере зі статусу запису', () => {
    const rows = employeeRows([makeEmployee({ status: 'inactive' })], [], TODAY)

    expect(rows[0]?.active).toBe(false)
  })
})

describe('matchesEmployeeQuery', () => {
  const employee = makeEmployee()

  it('шукає за імʼям', () => {
    expect(matchesEmployeeQuery(employee, 'мельник')).toBe(true)
    expect(matchesEmployeeQuery(employee, 'кравець')).toBe(false)
  })

  it('шукає за номером у будь-якому написанні', () => {
    expect(matchesEmployeeQuery(employee, '0971186230')).toBe(true)
    expect(matchesEmployeeQuery(employee, '118-62')).toBe(true)
    expect(matchesEmployeeQuery(employee, '999')).toBe(false)
  })

  it('порожній запит пропускає всіх', () => {
    expect(matchesEmployeeQuery(employee, '  ')).toBe(true)
  })
})

describe('applyEmployeeFilters', () => {
  const mason = makeEmployee({ id: 1, name: 'Тарас Мельник', role: 'Муляр' })
  const painter = makeEmployee({ id: 2, name: 'Оксана Панченко', role: 'Маляр' })
  const gone = makeEmployee({ id: 3, name: 'Дмитро Бойко', role: 'Плиточник', status: 'inactive' })

  const rows = employeeRows(
    [mason, painter, gone],
    [
      makeObject(),
      // Друга людина зайнята на своєму обʼєкті й уже закритій роботі.
      makeObject({
        id: 2,
        services: [
          service({
            id: 2,
            status: { value: 'done', label: SERVICE_STATUS_LABELS.done },
            workers: [worker({ employee_id: 2, volume: 20, rate: 500 })],
          }),
        ],
      }),
    ],
    TODAY,
  )

  function filters(overrides: Partial<EmployeeFilters> = {}): EmployeeFilters {
    return { ...defaultEmployeeFilters(), ...overrides }
  }

  it('за замовчуванням показує активних і ставить вільних зверху', () => {
    const found = applyEmployeeFilters(rows, filters())

    expect(found.map((row) => row.employee.id)).toEqual([2, 1])
  })

  it('неактивних показує лише на вимогу', () => {
    expect(
      applyEmployeeFilters(rows, filters({ status: 'inactive' })).map((row) => row.employee.id),
    ).toEqual([3])

    expect(applyEmployeeFilters(rows, filters({ status: 'all' })).length).toBe(3)
  })

  it('фільтрує за спеціальністю', () => {
    expect(
      applyEmployeeFilters(rows, filters({ role: 'Муляр' })).map((row) => row.employee.id),
    ).toEqual([1])
  })

  it('лишає тільки вільних', () => {
    expect(
      applyEmployeeFilters(rows, filters({ freeOnly: true })).map((row) => row.employee.id),
    ).toEqual([2])
  })

  it('сортує за нарахованим і за абеткою', () => {
    expect(
      applyEmployeeFilters(rows, filters({ sort: 'accrued' })).map((row) => row.employee.id),
    ).toEqual([1, 2])

    expect(
      applyEmployeeFilters(rows, filters({ sort: 'name', status: 'all' })).map(
        (row) => row.employee.name,
      ),
    ).toEqual(['Дмитро Бойко', 'Оксана Панченко', 'Тарас Мельник'])
  })
})

describe('countEmployees і employeeRoles', () => {
  const rows = employeeRows(
    [
      makeEmployee(),
      makeEmployee({ id: 2, name: 'Оксана Панченко', role: 'Маляр' }),
      makeEmployee({ id: 3, name: 'Дмитро Бойко', role: 'Муляр', status: 'inactive' }),
    ],
    [makeObject()],
    TODAY,
  )

  it('рахує активних, неактивних, вільних і зайнятих', () => {
    expect(countEmployees(rows)).toEqual({ all: 3, active: 2, inactive: 1, free: 1, busy: 1 })
    expect(totalAccrued(rows)).toBe(40_000)
  })

  it('збирає спеціальності, які справді є', () => {
    expect(employeeRoles(rows)).toEqual([
      { value: 'Маляр', count: 1 },
      { value: 'Муляр', count: 2 },
    ])
  })
})

describe('isDefaultEmployeeFilters', () => {
  it('бачить будь-яку зміну панелі', () => {
    expect(isDefaultEmployeeFilters(defaultEmployeeFilters())).toBe(true)
    expect(isDefaultEmployeeFilters({ ...defaultEmployeeFilters(), freeOnly: true })).toBe(false)
    expect(isDefaultEmployeeFilters({ ...defaultEmployeeFilters(), query: ' ' })).toBe(true)
    expect(isDefaultEmployeeFilters({ ...defaultEmployeeFilters(), role: 'Муляр' })).toBe(false)
  })
})
