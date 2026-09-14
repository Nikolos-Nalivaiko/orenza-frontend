/**
 * Співробітники простору: GET|POST /api/v1/workspaces/{id}/employees.
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

export const EMPLOYEE_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: 'Активний',
  inactive: 'Неактивний',
}

export interface Employee {
  id: number
  name: string
  /** Спеціальність — саме за нею людину шукають у списку виконавців. */
  role: string
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

/** Підпис під іменем у списку виконавців: «Штукатур». */
export function employeeMeta(employee: Employee): string {
  return employee.role
}

export function isActiveEmployee(employee: Employee): boolean {
  return employee.status === 'active'
}

/** Незаповнене поле — порожній рядок, а не null: так його показує форма. */
export function normalizeEmployee(employee: Employee): Employee {
  return {
    ...employee,
    role: employee.role ?? '',
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

/** Тіло запиту POST|PATCH /api/v1/workspaces/{id}/employees. */
export interface EmployeePayload {
  name: string
  role: string
  phone: string
  email: string
}

export function buildEmployeePayload(form: EmployeeForm): EmployeePayload {
  return {
    name: form.name.trim(),
    role: form.role.trim(),
    phone: form.phone.trim(),
    email: form.email.trim().toLowerCase(),
  }
}
