import { describe, expect, it } from 'vitest'
import {
  buildRegisterPayload,
  isEmail,
  normalisePhone,
  passwordScore,
  toInternationalPhone,
  validateLogin,
  validateRegisterStep,
  type RegisterForm,
} from '../validation'

function makeForm(overrides: Partial<RegisterForm> = {}): RegisterForm {
  return {
    firstName: 'Іван',
    lastName: 'Ковальчук',
    email: 'Ivan@Budcompany.UA',
    phone: '+38 (067) 123-45-67',
    password: 'orenza2026',
    passwordConfirmation: 'orenza2026',
    agreed: true,
    ...overrides,
  }
}

describe('normalisePhone', () => {
  it('лишає цифри та провідний плюс, як у UserData::normalisePhone', () => {
    expect(normalisePhone('+38 (067) 123-45-67')).toBe('+380671234567')
    expect(normalisePhone(' 067 123 45 67 ')).toBe('0671234567')
    expect(normalisePhone('067+123')).toBe('067123')
  })
})

describe('toInternationalPhone', () => {
  it('зводить локальний, національний і міжнародний записи до +380', () => {
    expect(toInternationalPhone('067 123 45 67')).toBe('+380671234567')
    expect(toInternationalPhone('380671234567')).toBe('+380671234567')
    expect(toInternationalPhone('+38 (067) 123-45-67')).toBe('+380671234567')
    expect(toInternationalPhone('   ')).toBe('')
  })
})

describe('isEmail', () => {
  it('приймає звичайні адреси й відхиляє биті', () => {
    expect(isEmail('ivan@budcompany.ua')).toBe(true)
    expect(isEmail('ivan@budcompany')).toBe(false)
    expect(isEmail('ivan budcompany.ua')).toBe(false)
  })
})

describe('passwordScore', () => {
  it('нуль, поки пароль коротший за 8 символів', () => {
    expect(passwordScore('короткий')).toBeGreaterThan(0)
    expect(passwordScore('1234567')).toBe(0)
  })

  it('максимум за довжину, літери з цифрами та спецсимвол', () => {
    expect(passwordScore('Orenza2026!')).toBe(4)
    expect(passwordScore('orenzaorenza')).toBe(2)
  })
})

describe('validateRegisterStep', () => {
  it('перевіряє тільки поточний крок', () => {
    const form = makeForm({ firstName: '', password: '123' })

    expect(validateRegisterStep(0, form)).toHaveProperty('firstName')
    expect(validateRegisterStep(1, form)).toEqual({})
  })

  it('ловить розбіжність паролів і відсутню згоду', () => {
    const errors = validateRegisterStep(
      2,
      makeForm({ passwordConfirmation: 'інший', agreed: false }),
    )

    expect(errors.passwordConfirmation).toBeDefined()
    expect(errors.agreed).toBeDefined()
  })
})

describe('validateLogin', () => {
  it('вимагає пошту та пароль', () => {
    expect(validateLogin({ email: '', password: '' })).toEqual({
      email: 'Вкажіть пошту',
      password: 'Введіть пароль',
    })
  })
})

describe('buildRegisterPayload', () => {
  it('віддає snake_case у форматі RegisterRequest', () => {
    expect(buildRegisterPayload(makeForm())).toEqual({
      first_name: 'Іван',
      last_name: 'Ковальчук',
      email: 'ivan@budcompany.ua',
      phone: '+380671234567',
      password: 'orenza2026',
      password_confirmation: 'orenza2026',
      device_name: 'web',
    })
  })

  it('не додає порожній телефон — поле у бекенді sometimes|nullable', () => {
    expect(buildRegisterPayload(makeForm({ phone: '  ' }))).not.toHaveProperty('phone')
  })
})
