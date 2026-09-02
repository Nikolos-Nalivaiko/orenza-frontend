/**
 * Клієнтська валідація повторює правила бекенду
 * (App\Http\Requests\Auth\RegisterRequest / LoginRequest), щоб форма
 * поводилась однаково ще до підключення API.
 */

export interface RegisterForm {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  passwordConfirmation: string
  agreed: boolean
}

export interface LoginForm {
  email: string
  password: string
}

export type Errors<T> = Partial<Record<keyof T, string>>

/** Мінімальна довжина пароля — Password::min(8) у бекенді. */
export const PASSWORD_MIN = 8

/** Довжина, з якої пароль пройде і продакшн-правило Password::min(10). */
export const PASSWORD_STRONG = 10

/**
 * Той самий алгоритм, що й UserData::normalisePhone: лишаємо цифри,
 * а «+» — тільки на першій позиції.
 */
export function normalisePhone(phone: string): string {
  return phone.trim().replace(/(?!^\+)[^\d]/g, '')
}

/**
 * Форма показує фіксований префікс +380, тому в API телефон завжди йде
 * у міжнародному форматі: «067…», «380…» і «+380…» дають один результат.
 */
export function toInternationalPhone(phone: string): string {
  const digits = normalisePhone(phone).replace(/^\+/, '')

  if (digits === '') {
    return ''
  }

  const local = digits.replace(/^380/, '').replace(/^0/, '')

  return `+380${local}`
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/.test(value.trim())
}

/**
 * 0 — надто короткий, 4 — відповідає продакшн-політиці бекенду
 * (10+ символів, літери, цифри, спецсимволи).
 */
export function passwordScore(password: string): number {
  if (password.length < PASSWORD_MIN) {
    return 0
  }

  let score = 1

  if (password.length >= PASSWORD_STRONG) {
    score += 1
  }

  if (/\p{L}/u.test(password) && /\d/.test(password)) {
    score += 1
  }

  if (/[^\p{L}\d]/u.test(password)) {
    score += 1
  }

  return score
}

const PASSWORD_LABELS = ['Закороткий', 'Слабкий', 'Помірний', 'Добрий', 'Надійний'] as const

export function passwordLabel(score: number): string {
  return PASSWORD_LABELS[Math.min(score, PASSWORD_LABELS.length - 1)] ?? PASSWORD_LABELS[0]
}

/** Крок реєстрації, на якому живе поле: 0 — профіль, 1 — контакти, 2 — пароль. */
export function validateRegisterStep(step: number, form: RegisterForm): Errors<RegisterForm> {
  const errors: Errors<RegisterForm> = {}

  if (step === 0) {
    if (form.firstName.trim() === '') {
      errors.firstName = 'Вкажіть імʼя'
    }

    if (form.lastName.trim() === '') {
      errors.lastName = 'Вкажіть прізвище'
    }
  }

  if (step === 1) {
    if (form.email.trim() === '') {
      errors.email = 'Вкажіть робочу пошту'
    } else if (!isEmail(form.email)) {
      errors.email = 'Схоже на помилку в адресі'
    }

    const phone = toInternationalPhone(form.phone)

    // +380 плюс дев'ять цифр національного номера.
    if (phone !== '' && phone.length !== 13) {
      errors.phone = 'Потрібно 9 цифр після коду: 067 123 45 67'
    }
  }

  if (step === 2) {
    if (form.password.length < PASSWORD_MIN) {
      errors.password = `Мінімум ${PASSWORD_MIN} символів`
    }

    if (form.passwordConfirmation !== form.password) {
      errors.passwordConfirmation = 'Паролі не збігаються'
    }

    if (!form.agreed) {
      errors.agreed = 'Потрібна згода з умовами'
    }
  }

  return errors
}

export function validateLogin(form: LoginForm): Errors<LoginForm> {
  const errors: Errors<LoginForm> = {}

  if (form.email.trim() === '') {
    errors.email = 'Вкажіть пошту'
  } else if (!isEmail(form.email)) {
    errors.email = 'Схоже на помилку в адресі'
  }

  if (form.password === '') {
    errors.password = 'Введіть пароль'
  }

  return errors
}

export function hasErrors(errors: Errors<unknown>): boolean {
  return Object.keys(errors).length > 0
}

/** Тіло запиту POST /api/v1/auth/register у форматі бекенду. */
export interface RegisterPayload {
  first_name: string
  last_name: string
  email: string
  phone?: string
  password: string
  password_confirmation: string
  device_name: string
}

export function buildRegisterPayload(form: RegisterForm, deviceName = 'web'): RegisterPayload {
  const phone = toInternationalPhone(form.phone)

  return {
    first_name: form.firstName.trim(),
    last_name: form.lastName.trim(),
    email: normaliseEmail(form.email),
    ...(phone === '' ? {} : { phone }),
    password: form.password,
    password_confirmation: form.passwordConfirmation,
    device_name: deviceName,
  }
}

/** Тіло запиту POST /api/v1/auth/login. */
export interface LoginPayload {
  email: string
  password: string
  device_name: string
}

export function buildLoginPayload(form: LoginForm, deviceName = 'web'): LoginPayload {
  return {
    email: normaliseEmail(form.email),
    password: form.password,
    device_name: deviceName,
  }
}
