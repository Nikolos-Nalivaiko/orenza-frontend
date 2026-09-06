/**
 * Список співробітників — довідник людей і їхнього завантаження.
 *
 * Питання, з якими сюди заходять, рівно два: «кого поставити на нову роботу»
 * і «скільки на людині грошей». Тому за замовчуванням список стоїть не за
 * абеткою, а за завантаженням — вільні зверху: саме їх шукають, коли треба
 * когось призначити.
 *
 * Нічого нового тут не рахується: цифри бере payrollTotals, який уже працює в
 * картці людини, — інакше та сама людина мала б у списку й у картці різні
 * суми. Коли зʼявиться GET /api/v1/workspaces/{id}/employees, зміниться лише
 * джерело: EmployeeRow — уже той формат, у якому екран показує рядок.
 */

import { isActiveEmployee, type Employee } from '@/lib/employees'
import type { ConstructionObject } from '@/lib/objects'
import { employeeCharges, payrollTotals, type PayrollTotals } from '@/lib/payroll'

/* ── Рядок списку ──────────────────────────────────────────────── */

export interface EmployeeRow {
  employee: Employee
  totals: PayrollTotals
  active: boolean
}

/** Усі люди простору з їхніми цифрами — без фільтрів і сортування. */
export function employeeRows(
  employees: Employee[],
  objects: ConstructionObject[],
  today: string,
): EmployeeRow[] {
  return employees.map((employee) => ({
    employee,
    totals: payrollTotals(employeeCharges(objects, employee.id), today),
    active: isActiveEmployee(employee),
  }))
}

/* ── Фільтри та сортування ─────────────────────────────────────── */

export type EmployeeSort = 'load' | 'accrued' | 'name'

export interface EmployeeSortOption {
  value: EmployeeSort
  label: string
}

export const EMPLOYEE_SORTS: readonly EmployeeSortOption[] = [
  { value: 'load', label: 'Спочатку вільні' },
  { value: 'accrued', label: 'Найбільше нараховано' },
  { value: 'name', label: 'За абеткою' },
]

/** Довідник живе далі за людину, тож неактивні лишаються — просто окремо. */
export type EmployeeStatusFilter = 'active' | 'inactive' | 'all'

export interface EmployeeFilters {
  query: string
  status: EmployeeStatusFilter
  /** Спеціальність рівно як у записі; null — не важливо. */
  role: string | null
  /** Тільки вільні: ті, кого можна ставити на нову роботу просто зараз. */
  freeOnly: boolean
  sort: EmployeeSort
}

/**
 * За замовчуванням показуємо активних: людина, яка пішла, лишається в
 * довіднику назавжди, і за півроку список складався б переважно з неї.
 */
export function defaultEmployeeFilters(): EmployeeFilters {
  return { query: '', status: 'active', role: null, freeOnly: false, sort: 'load' }
}

export function isDefaultEmployeeFilters(filters: EmployeeFilters): boolean {
  const base = defaultEmployeeFilters()

  return (
    filters.query.trim() === '' &&
    filters.status === base.status &&
    filters.role === base.role &&
    filters.freeOnly === base.freeOnly &&
    filters.sort === base.sort
  )
}

/** Цифри номера: у довіднику він з плюсом і пробілами, у пошуку — як завгодно. */
function digits(value: string): string {
  return value.replace(/\D/g, '')
}

/**
 * Пошук по імені й телефону одним рядком: людина вводить те, що памʼятає, —
 * чи то прізвище, чи то останні цифри номера. Спеціальність має власний
 * фільтр, тож у пошук вона не йде.
 */
export function matchesEmployeeQuery(employee: Employee, query: string): boolean {
  const needle = query.trim().toLowerCase()

  if (needle === '') {
    return true
  }

  const number = digits(needle)

  // Дві цифри є в будь-якому номері — за ними шукати нічого.
  if (number.length >= 3 && digits(employee.phone).includes(number)) {
    return true
  }

  return employee.name.toLowerCase().includes(needle)
}

function byName(left: EmployeeRow, right: EmployeeRow): number {
  return left.employee.name.localeCompare(right.employee.name, 'uk')
}

function compare(left: EmployeeRow, right: EmployeeRow, sort: EmployeeSort): number {
  if (sort === 'name') {
    return byName(left, right)
  }

  if (sort === 'accrued') {
    const diff = right.totals.accrued - left.totals.accrued

    return Math.abs(diff) < 0.01 ? byName(left, right) : diff
  }

  // Завантаження: вільні зверху, далі за іменем — щоб порядок не стрибав.
  const diff = left.totals.busy - right.totals.busy

  return diff === 0 ? byName(left, right) : diff
}

export function applyEmployeeFilters(rows: EmployeeRow[], filters: EmployeeFilters): EmployeeRow[] {
  const found = rows.filter((row) => {
    if (filters.status === 'active' && !row.active) {
      return false
    }

    if (filters.status === 'inactive' && row.active) {
      return false
    }

    if (filters.role !== null && row.employee.role !== filters.role) {
      return false
    }

    if (filters.freeOnly && row.totals.busy > 0) {
      return false
    }

    return matchesEmployeeQuery(row.employee, filters.query)
  })

  return found.sort((left, right) => compare(left, right, filters.sort))
}

/** Скільки кого — підписи до кнопок фільтра. */
export interface EmployeeCounts {
  all: number
  active: number
  inactive: number
  /** Вільні серед активних: неактивні в «кого призначити» не рахуються. */
  free: number
  busy: number
}

export function countEmployees(rows: EmployeeRow[]): EmployeeCounts {
  const counts: EmployeeCounts = { all: rows.length, active: 0, inactive: 0, free: 0, busy: 0 }

  for (const row of rows) {
    if (!row.active) {
      counts.inactive += 1

      continue
    }

    counts.active += 1

    if (row.totals.busy > 0) {
      counts.busy += 1
    } else {
      counts.free += 1
    }
  }

  return counts
}

export interface RoleOption {
  value: string
  count: number
}

/** Спеціальності, які справді є в довіднику, — фільтрувати за рештою нічого. */
export function employeeRoles(rows: EmployeeRow[]): RoleOption[] {
  const map = new Map<string, number>()

  for (const row of rows) {
    const role = row.employee.role.trim()

    if (role !== '') {
      map.set(role, (map.get(role) ?? 0) + 1)
    }
  }

  return [...map.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => left.value.localeCompare(right.value, 'uk'))
}

/** Скільки грошей нараховано на всіх показаних людях разом. */
export function totalAccrued(rows: EmployeeRow[]): number {
  return rows.reduce((sum, row) => sum + row.totals.accrued, 0)
}
