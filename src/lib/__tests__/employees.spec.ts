import { describe, expect, it } from 'vitest'
import {
  buildEmployeePayload,
  employeeForm,
  employeeMeta,
  hasEmployeeErrors,
  isActiveEmployee,
  normalizeEmployee,
  validateEmployeeForm,
  type Employee,
  type EmployeeForm,
} from '../employees'

function makeEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    id: 1,
    name: 'Тарас Мельник',
    role: 'Муляр',
    phone: '+380971186230',
    email: '',
    status: 'active',
    notes: '',
    created_at: '2025-08-12T07:45:00.000Z',
    ...overrides,
  }
}

function makeForm(overrides: Partial<EmployeeForm> = {}): EmployeeForm {
  return { name: 'Тарас Мельник', role: '', phone: '', email: '', ...overrides }
}

describe('employeeMeta', () => {
  it('підписує людину спеціальністю', () => {
    expect(employeeMeta(makeEmployee())).toBe('Муляр')
  })

  it('без спеціальності підпис порожній', () => {
    expect(employeeMeta(makeEmployee({ role: '' }))).toBe('')
  })
})

describe('normalizeEmployee', () => {
  it('незаповнені поля бекенда стають порожніми рядками', () => {
    const raw = {
      id: 7,
      name: 'Дмитро Бойко',
      status: 'inactive',
    } as unknown as Employee

    expect(normalizeEmployee(raw)).toEqual({
      id: 7,
      name: 'Дмитро Бойко',
      role: '',
      phone: '',
      email: '',
      status: 'inactive',
      notes: '',
      created_at: null,
    })
  })

  it('людина без статусу вважається активною', () => {
    const raw = { id: 1, name: 'Тарас' } as unknown as Employee

    expect(isActiveEmployee(normalizeEmployee(raw))).toBe(true)
  })
})

describe('validateEmployeeForm', () => {
  it('без імені людину не заводять', () => {
    expect(validateEmployeeForm(makeForm({ name: '   ' })).name).toBeDefined()
  })

  it('решта полів необовʼязкові', () => {
    expect(hasEmployeeErrors(validateEmployeeForm(makeForm()))).toBe(false)
  })

  it('недописаний телефон і крива пошта не проходять', () => {
    const errors = validateEmployeeForm(makeForm({ phone: '+380 67 33', email: 'не пошта' }))

    expect(errors.phone).toBeDefined()
    expect(errors.email).toBeDefined()
  })

  it('порожній телефон — не помилка', () => {
    expect(validateEmployeeForm(makeForm({ phone: '' })).phone).toBeUndefined()
  })
})

describe('buildEmployeePayload', () => {
  it('обрізає пробіли й приводить пошту до нижнього регістру', () => {
    const payload = buildEmployeePayload(
      makeForm({ name: '  Тарас  ', role: ' Муляр ', email: '  Taras@Orenza.UA ' }),
    )

    expect(payload).toEqual({
      name: 'Тарас',
      role: 'Муляр',
      phone: '',
      email: 'taras@orenza.ua',
    })
  })

  it('форма з картки повертає ті самі поля, що поїдуть на бекенд', () => {
    expect(buildEmployeePayload(employeeForm(makeEmployee()))).toEqual({
      name: 'Тарас Мельник',
      role: 'Муляр',
      phone: '+380971186230',
      email: '',
    })
  })
})
