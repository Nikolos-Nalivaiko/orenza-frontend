import { describe, expect, it } from 'vitest'
import {
  buildWorkspacePayload,
  formatCreatedAt,
  monogram,
  slugify,
  validateWorkspaceForm,
  type WorkspaceForm,
} from '../workspaces'

function makeForm(overrides: Partial<WorkspaceForm> = {}): WorkspaceForm {
  return { type: 'company', name: 'ТОВ БудКомпанія', ...overrides }
}

describe('slugify', () => {
  it('транслітерує кирилицю та збирає слова через дефіс', () => {
    expect(slugify('ТОВ БудКомпанія')).toBe('tov-budkompaniya')
    expect(slugify('  Обʼєкт №4  ')).toBe('obyekt-4')
  })

  it('не лишає дефісів по краях і тримається межі в 48 символів', () => {
    expect(slugify('--Test--')).toBe('test')
    expect(slugify('a'.repeat(60)).length).toBe(48)
  })
})

describe('validateWorkspaceForm', () => {
  it('вимагає назву для компанії — як Rule::requiredIf на бекенді', () => {
    expect(validateWorkspaceForm(makeForm({ name: '' })).name).toBeDefined()
    expect(validateWorkspaceForm(makeForm({ type: 'personal', name: '' })).name).toBeUndefined()
  })

  it('тримає межі довжини назви', () => {
    expect(validateWorkspaceForm(makeForm())).toEqual({})
    expect(validateWorkspaceForm(makeForm({ name: 'Т' })).name).toBeDefined()
    expect(validateWorkspaceForm(makeForm({ name: 'Т'.repeat(256) })).name).toBeDefined()
  })
})

describe('buildWorkspacePayload', () => {
  it('надсилає лише type і name — адресу генерує бекенд', () => {
    expect(buildWorkspacePayload(makeForm({ name: '  ТОВ БудКомпанія  ' }))).toEqual({
      type: 'company',
      name: 'ТОВ БудКомпанія',
    })

    expect(buildWorkspacePayload(makeForm({ type: 'personal', name: '' }))).toEqual({
      type: 'personal',
    })
  })
})

describe('formatCreatedAt', () => {
  it('форматує дату українською без хвоста «р.»', () => {
    expect(formatCreatedAt('2026-08-21T09:30:00+00:00')).toBe('21 серп. 2026')
    expect(formatCreatedAt(null)).toBe('')
    expect(formatCreatedAt('не дата')).toBe('')
  })
})

describe('monogram', () => {
  it('бере перші літери двох слів назви', () => {
    expect(monogram('ТОВ БудКомпанія')).toBe('ТБ')
    expect(monogram('Ковальчук')).toBe('К')
    expect(monogram('   ')).toBe('O')
  })
})
