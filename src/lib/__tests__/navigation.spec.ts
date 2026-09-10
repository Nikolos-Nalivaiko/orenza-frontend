import { describe, expect, it } from 'vitest'
import { isAllowed, navFor, NAV_ITEMS, findNavItem } from '../navigation'
import { workspaceFeatures, type Workspace } from '../workspaces'

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: 1,
    type: { value: 'company', label: 'Компанія' },
    features: { team: true },
    name: 'Оренза',
    slug: 'orenza',
    owner_id: 1,
    created_at: null,
    ...overrides,
  }
}

describe('navFor', () => {
  it('в особистому просторі команди в меню немає', () => {
    const names = navFor({ team: false })
      .flatMap((group) => group.items)
      .map((item) => item.name)

    expect(names).not.toContain('team')
    expect(names).toContain('objects')
    expect(names).toContain('clients')
  })

  it('у компанії меню повне', () => {
    const names = navFor({ team: true })
      .flatMap((group) => group.items)
      .map((item) => item.name)

    expect(names).toContain('team')
  })

  it('порожні групи не лишаються заголовком без пунктів', () => {
    expect(navFor({ team: false }).every((group) => group.items.length > 0)).toBe(true)
  })

  it('маршрути лишаються всі: ховаємо пункт, а не адресу', () => {
    expect(NAV_ITEMS.some((item) => item.name === 'team')).toBe(true)
  })
})

describe('isAllowed', () => {
  it('пункт без вимог доступний завжди', () => {
    const objects = findNavItem('objects')

    expect(objects).not.toBeNull()
    expect(isAllowed(objects!, { team: false })).toBe(true)
  })

  it('пункт команди — лише там, де команда є', () => {
    const team = findNavItem('team')

    expect(isAllowed(team!, { team: false })).toBe(false)
    expect(isAllowed(team!, { team: true })).toBe(true)
  })
})

describe('workspaceFeatures', () => {
  it('бере можливості з відповіді сервера', () => {
    expect(workspaceFeatures(workspace({ features: { team: false } }))).toEqual({ team: false })
  })

  it('без простору команди немає', () => {
    expect(workspaceFeatures(null)).toEqual({ team: false })
  })

  it('простір із минулої сесії добираємо за типом', () => {
    const stale = workspace({ type: { value: 'personal', label: 'Особистий' } })

    delete (stale as Partial<Workspace>).features

    expect(workspaceFeatures(stale)).toEqual({ team: false })
  })
})
