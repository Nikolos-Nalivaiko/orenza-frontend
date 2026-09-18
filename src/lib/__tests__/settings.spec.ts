import { describe, expect, it } from 'vitest'
import {
  ACCOUNT_TYPE_INFO,
  buildPasswordPayload,
  buildProfilePayload,
  buildWorkspacePayload,
  canManageWorkspace,
  emailChanged,
  emptyPasswordForm,
  exportFileName,
  exportFiles,
  formatUnits,
  groupOf,
  initialsOf,
  isDeleteConfirmed,
  isPasswordFormTouched,
  isWorkspaceDeleteConfirmed,
  profileFormFrom,
  sameProfile,
  sameWorkspace,
  SETTINGS_GROUPS,
  SETTINGS_MENU,
  validatePasswordForm,
  validateProfile,
  validateWorkspaceForm,
  workspaceFormFrom,
  type ProfileForm,
} from '../settings'
import type { Workspace } from '../workspaces'

function profile(overrides: Partial<ProfileForm> = {}): ProfileForm {
  return {
    firstName: 'Ада',
    lastName: 'Лавлейс',
    email: 'ada@example.com',
    phone: '+380501234567',
    ...overrides,
  }
}

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: 1,
    type: { value: 'company', label: 'Компанія' },
    features: { team: true },
    name: 'БудМайстер',
    slug: 'budmaister',
    owner_id: 7,
    created_at: null,
    ...overrides,
  }
}

describe('розділи налаштувань', () => {
  it('акаунт і простір — окремі сторінки з унікальними секціями', () => {
    const ids = SETTINGS_GROUPS.flatMap((group) => group.sections.map((section) => section.id))

    expect(new Set(ids).size).toBe(ids.length)
    expect(groupOf('account').route).toBe('settings')
    expect(groupOf('workspace').route).toBe('settings-workspace')
  })

  it('меню — плоский список, де кожна секція є рівно один раз', () => {
    const fromGroups = SETTINGS_GROUPS.flatMap((group) =>
      group.sections.map((section) => section.id),
    )
    const fromMenu = SETTINGS_MENU.map((item) => item.id)

    expect([...fromMenu].sort()).toEqual([...fromGroups].sort())
    expect(SETTINGS_MENU.find((item) => item.id === 'data')?.route).toBe('settings-workspace')
  })

  it('небезпечна секція завжди остання на сторінці', () => {
    for (const group of SETTINGS_GROUPS) {
      expect(group.sections[group.sections.length - 1]?.danger).toBe(true)
    }
  })
})

describe('profileFormFrom', () => {
  it('без телефону поле порожнє, а не null', () => {
    expect(
      profileFormFrom({ first_name: 'Ада', last_name: 'Лавлейс', email: 'a@b.ua', phone: null })
        .phone,
    ).toBe('')
  })

  it('без користувача форма порожня', () => {
    expect(profileFormFrom(null)).toEqual({ firstName: '', lastName: '', email: '', phone: '' })
  })
})

describe('validateProfile', () => {
  it('приймає заповнений профіль', () => {
    expect(validateProfile(profile())).toEqual({})
  })

  it('вимагає імʼя, прізвище і пошту', () => {
    const errors = validateProfile(profile({ firstName: ' ', lastName: '', email: '' }))

    expect(Object.keys(errors).sort()).toEqual(['email', 'firstName', 'lastName'])
  })

  it('телефон необовʼязковий, але неповний номер — помилка', () => {
    expect(validateProfile(profile({ phone: '' })).phone).toBeUndefined()
    expect(validateProfile(profile({ phone: '+38050123' })).phone).toBeDefined()
  })

  it('ловить помилку в адресі', () => {
    expect(validateProfile(profile({ email: 'ada@' })).email).toBeDefined()
  })
})

describe('sameProfile', () => {
  it('не бачить змін у пробілах, регістрі пошти й форматі телефону', () => {
    expect(
      sameProfile(
        profile(),
        profile({ firstName: ' Ада ', email: 'ADA@example.com', phone: '0501234567' }),
      ),
    ).toBe(true)
  })

  it('помічає нове прізвище', () => {
    expect(sameProfile(profile(), profile({ lastName: 'Байрон' }))).toBe(false)
  })
})

describe('emailChanged', () => {
  it('реагує лише на іншу адресу', () => {
    expect(emailChanged(profile(), profile({ email: ' ADA@example.com ' }))).toBe(false)
    expect(emailChanged(profile(), profile({ email: 'lovelace@example.com' }))).toBe(true)
  })
})

describe('buildProfilePayload', () => {
  it('нормалізує поля під формат бекенду', () => {
    expect(
      buildProfilePayload(
        profile({ firstName: ' Ада ', email: 'ADA@Example.com', phone: '050 123 45 67' }),
      ),
    ).toEqual({
      first_name: 'Ада',
      last_name: 'Лавлейс',
      email: 'ada@example.com',
      phone: '+380501234567',
    })
  })

  it('порожній телефон надсилає як null', () => {
    expect(buildProfilePayload(profile({ phone: '' })).phone).toBeNull()
  })
})

describe('initialsOf', () => {
  it('бере перші літери імені й прізвища', () => {
    expect(initialsOf(profile())).toBe('АЛ')
    expect(initialsOf(profile({ firstName: '', lastName: '' }))).toBe('O')
  })
})

describe('зміна пароля', () => {
  it('порожня форма не вважається зміною', () => {
    expect(isPasswordFormTouched(emptyPasswordForm())).toBe(false)
    expect(isPasswordFormTouched({ ...emptyPasswordForm(), current: 'x' })).toBe(true)
  })

  it('вимагає поточний пароль, довжину і збіг підтвердження', () => {
    const errors = validatePasswordForm({ current: '', password: 'short', confirmation: 'other' })

    expect(Object.keys(errors).sort()).toEqual(['confirmation', 'current', 'password'])
  })

  it('не приймає той самий пароль', () => {
    expect(
      validatePasswordForm({
        current: 'password123',
        password: 'password123',
        confirmation: 'password123',
      }).password,
    ).toBeDefined()
  })

  it('збирає тіло запиту', () => {
    expect(buildPasswordPayload({ current: 'a', password: 'b', confirmation: 'b' })).toEqual({
      current_password: 'a',
      password: 'b',
      password_confirmation: 'b',
    })
  })
})

describe('простір', () => {
  it('тип акаунта має підпис для кожного значення', () => {
    expect(ACCOUNT_TYPE_INFO.personal.label).toBe('Приватна особа')
    expect(ACCOUNT_TYPE_INFO.company.label).toBe('Компанія')
  })

  it('форма бере назву поточного простору', () => {
    expect(workspaceFormFrom(workspace())).toEqual({ name: 'БудМайстер' })
    expect(workspaceFormFrom(null)).toEqual({ name: '' })
  })

  it('назва обовʼязкова й тримає межі довжини', () => {
    expect(validateWorkspaceForm({ name: 'БудМайстер' })).toEqual({})
    expect(validateWorkspaceForm({ name: ' ' }).name).toBeDefined()
    expect(validateWorkspaceForm({ name: 'Б' }).name).toBeDefined()
    expect(validateWorkspaceForm({ name: 'Б'.repeat(256) }).name).toBeDefined()
  })

  it('пробіли навколо назви не є зміною', () => {
    expect(sameWorkspace({ name: 'БудМайстер' }, { name: ' БудМайстер ' })).toBe(true)
    expect(buildWorkspacePayload({ name: ' БудМайстер ' })).toEqual({ name: 'БудМайстер' })
  })

  it('керувати простором може лише власник', () => {
    expect(canManageWorkspace(workspace(), 7)).toBe(true)
    expect(canManageWorkspace(workspace(), 8)).toBe(false)
    expect(canManageWorkspace(workspace(), null)).toBe(false)
    expect(canManageWorkspace(null, 7)).toBe(false)
  })

  it('видалення підтверджується точною назвою', () => {
    expect(isWorkspaceDeleteConfirmed('БудМайстер', 'БудМайстер')).toBe(true)
    expect(isWorkspaceDeleteConfirmed(' БудМайстер ', 'БудМайстер')).toBe(true)
    expect(isWorkspaceDeleteConfirmed('будмайстер', 'БудМайстер')).toBe(false)
    expect(isWorkspaceDeleteConfirmed('', '')).toBe(false)
  })
})

describe('експорт', () => {
  it('таблиця команди — лише для компанії', () => {
    expect(exportFiles(true).map((file) => file.name)).toContain('employees.csv')
    expect(exportFiles(false).map((file) => file.name)).not.toContain('employees.csv')
  })

  it('імʼя файлу архіву', () => {
    expect(exportFileName('budmaister', '2026-09-15')).toBe('orenza-budmaister-2026-09-15.zip')
  })
})

describe('дрібниці', () => {
  it('видалення акаунта — лише з паролем і згодою', () => {
    expect(isDeleteConfirmed('', true)).toBe(false)
    expect(isDeleteConfirmed('secret', false)).toBe(false)
    expect(isDeleteConfirmed('secret', true)).toBe(true)
  })

  it('відмінює кількість', () => {
    expect(formatUnits(1, 'простір', 'простори', 'просторів')).toBe('1 простір')
    expect(formatUnits(3, 'простір', 'простори', 'просторів')).toBe('3 простори')
    expect(formatUnits(12, 'простір', 'простори', 'просторів')).toBe('12 просторів')
  })
})
