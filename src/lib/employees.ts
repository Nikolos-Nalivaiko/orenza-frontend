/**
 * Співробітники простору. Свого списку в застосунку вони ще не мають, але
 * власна картка вже є, тож тип описаний так, як його віддаватиме майбутній
 * GET /api/v1/workspaces/{id}/employees — щоб потім замінити лише джерело
 * даних, а не поля форми.
 *
 * Роль тут — спеціальність («муляр», «бригадир»), а не права доступу: це
 * підпис, за яким людину впізнають у списку виконавців. Повноцінні ролі й
 * доступи свідомо відкладені — вони живуть не в довіднику людей.
 */

import { isBlankPhone, isCompletePhone } from '@/lib/phone'
import { isEmail, PHONE_ERROR } from '@/lib/validation'

/**
 * Людина не звільняється зі сховища: пішла — стає неактивною. Історія робіт і
 * нарахувань лишається, у нові бригади її просто більше не пропонують.
 */
export type EmployeeStatus = 'active' | 'inactive'

export interface EmployeeStatusOption {
  value: EmployeeStatus
  label: string
}

export const EMPLOYEE_STATUSES: readonly EmployeeStatusOption[] = [
  { value: 'active', label: 'Активний' },
  { value: 'inactive', label: 'Неактивний' },
]

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: 'Активний',
  inactive: 'Неактивний',
}

export interface Employee {
  id: number
  name: string
  /** Спеціальність — саме за нею людину шукають у списку виконавців. */
  role: string
  /** Бригада або підряд, у якому людина працює. */
  crew: string
  phone: string
  email: string
  status: EmployeeStatus
  /**
   * Як із людиною працювати: що вміє краще за інших, куди не поїде, про що з
   * нею вже домовлялись. Це опис самої людини, а не хроніка робіт.
   */
  notes: string
  /** Коли людину завели в систему. */
  created_at: string | null
}

/** Рядок під іменем у списку: «Штукатур · Бригада №3». */
export function employeeMeta(employee: Employee): string {
  return [employee.role, employee.crew].filter(Boolean).join(' · ')
}

export function isActiveEmployee(employee: Employee): boolean {
  return employee.status === 'active'
}

/**
 * Запис із минулої сесії міг не мати ні телефона, ні статусу — їх завели
 * разом із карткою. Порожній рядок, а не null: поле просто ще не заповнили.
 */
export function normalizeEmployee(employee: Employee): Employee {
  return {
    ...employee,
    role: employee.role ?? '',
    crew: employee.crew ?? '',
    phone: employee.phone ?? '',
    email: employee.email ?? '',
    status: employee.status ?? 'active',
    notes: employee.notes ?? '',
    created_at: employee.created_at ?? null,
  }
}

/* ── Опис ──────────────────────────────────────────────────────── */

/** Ліміт той самий, що й в описі замовника: це абзац-два, а не досьє. */
export const EMPLOYEE_NOTES_MAX = 1000

/* ── Форма ─────────────────────────────────────────────────────── */

export interface EmployeeForm {
  name: string
  role: string
  crew: string
  phone: string
  email: string
}

export type EmployeeErrors = Partial<Record<keyof EmployeeForm, string>>

export const EMPLOYEE_NAME_MIN = 2
export const EMPLOYEE_NAME_MAX = 255
export const EMPLOYEE_ROLE_MAX = 120

export function employeeForm(employee: Employee): EmployeeForm {
  return {
    name: employee.name,
    role: employee.role,
    crew: employee.crew,
    phone: employee.phone,
    email: employee.email,
  }
}

/**
 * Обовʼязкове тут лише імʼя: людину заводять із бригади на ходу, а телефон і
 * пошту дозаповнюють потім, коли вже є що записувати.
 */
export function validateEmployeeForm(form: EmployeeForm): EmployeeErrors {
  const errors: EmployeeErrors = {}
  const name = form.name.trim()

  if (name === '') {
    errors.name = 'Вкажіть, як звати людину'
  } else if (name.length < EMPLOYEE_NAME_MIN) {
    errors.name = `Мінімум ${EMPLOYEE_NAME_MIN} символи`
  } else if (name.length > EMPLOYEE_NAME_MAX) {
    errors.name = `Максимум ${EMPLOYEE_NAME_MAX} символів`
  }

  if (form.role.trim().length > EMPLOYEE_ROLE_MAX) {
    errors.role = `Максимум ${EMPLOYEE_ROLE_MAX} символів`
  }

  if (form.crew.trim().length > EMPLOYEE_ROLE_MAX) {
    errors.crew = `Максимум ${EMPLOYEE_ROLE_MAX} символів`
  }

  if (!isBlankPhone(form.phone) && !isCompletePhone(form.phone)) {
    errors.phone = PHONE_ERROR
  }

  if (form.email.trim() !== '' && !isEmail(form.email)) {
    errors.email = 'Схоже на помилку в адресі'
  }

  return errors
}

export function hasEmployeeErrors(errors: EmployeeErrors): boolean {
  return Object.keys(errors).length > 0
}

/** Тіло запиту PATCH /api/v1/workspaces/{id}/employees/{employee}. */
export interface EmployeePayload {
  name: string
  role: string
  crew: string
  phone: string
  email: string
}

export function buildEmployeePayload(form: EmployeeForm): EmployeePayload {
  return {
    name: form.name.trim(),
    role: form.role.trim(),
    crew: form.crew.trim(),
    phone: form.phone.trim(),
    email: form.email.trim().toLowerCase(),
  }
}

/* ── Демодані ──────────────────────────────────────────────────── */

/** Довідника співробітників ще немає — беремо бригади з дашборда. */
export const DEMO_EMPLOYEES: readonly Employee[] = [
  {
    id: 1,
    name: 'Ігор Величко',
    role: 'Бригадир',
    crew: 'Бригада №3',
    phone: '+380 67 330 18 42',
    email: 'i.velychko@orenza.ua',
    status: 'active',
    notes: 'Тримає на собі «Пасаж». Питання по обʼєкту вирішувати через нього, не через людей.',
    created_at: '2025-11-04T08:30:00.000Z',
  },
  {
    id: 2,
    name: 'Андрій Пасічник',
    role: 'Штукатур',
    crew: 'Бригада №3',
    phone: '+380 50 214 76 03',
    email: '',
    status: 'active',
    notes: '',
    created_at: '2025-11-04T08:30:00.000Z',
  },
  {
    id: 3,
    name: 'Юрій Гнатенко',
    role: 'Різнороб',
    crew: 'Бригада №3',
    phone: '+380 63 441 09 55',
    email: '',
    status: 'active',
    notes: '',
    created_at: '2026-01-20T09:15:00.000Z',
  },
  {
    id: 4,
    name: 'Тарас Мельник',
    role: 'Муляр',
    crew: 'Бригада №1',
    phone: '+380 97 118 62 30',
    email: '',
    status: 'active',
    notes: 'Добре кладе лицьову цеглу. Далі 20 км від міста обʼєкти не бере.',
    created_at: '2025-08-12T07:45:00.000Z',
  },
  {
    id: 5,
    name: 'Сергій Кравець',
    role: 'Електрик',
    crew: 'Бригада №1',
    phone: '+380 66 507 23 18',
    email: 's.kravets@orenza.ua',
    status: 'active',
    notes: '',
    created_at: '2025-08-12T07:45:00.000Z',
  },
  {
    id: 6,
    name: 'Оксана Панченко',
    role: 'Маляр',
    crew: 'Бригада №2',
    phone: '+380 68 902 44 71',
    email: '',
    status: 'active',
    notes: '',
    created_at: '2026-02-02T10:00:00.000Z',
  },
  {
    id: 7,
    name: 'Дмитро Бойко',
    role: 'Плиточник',
    crew: 'Бригада №2',
    phone: '+380 95 613 87 20',
    email: '',
    status: 'inactive',
    notes: 'Пішов у відпустку до кінця місяця — на нові роботи поки не ставимо.',
    created_at: '2025-09-23T06:50:00.000Z',
  },
  {
    id: 8,
    name: 'Віталій Соколюк',
    role: 'Монтажник',
    crew: 'Підряд «Стальпром»',
    phone: '+380 44 501 22 90',
    email: '',
    status: 'active',
    notes: '',
    created_at: '2026-03-16T11:30:00.000Z',
  },
]
