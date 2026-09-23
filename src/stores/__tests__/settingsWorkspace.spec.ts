import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Workspace } from '@/lib/workspaces'

const patchMock = vi.hoisted(() => vi.fn<(path: string, body?: unknown) => Promise<unknown>>())
const deleteMock = vi.hoisted(() =>
  vi.fn<(path: string, options?: { body?: unknown }) => Promise<unknown>>(),
)

vi.mock('@/lib/http', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/http')>()

  return { ...original, api: { ...original.api, patch: patchMock, delete: deleteMock } }
})

const { useSettingsStore } = await import('../settings')
const { useWorkspacesStore } = await import('../workspaces')
const { ApiError } = await import('@/lib/http')

function memoryStorage(): Storage {
  const items = new Map<string, string>()

  return {
    get length() {
      return items.size
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
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

function withCurrent(item: Workspace): ReturnType<typeof useWorkspacesStore> {
  const workspaces = useWorkspacesStore()

  workspaces.items = [item, workspace({ id: 2, name: 'Інший', slug: 'inshyi' })]
  workspaces.currentId = item.id

  return workspaces
}

describe('settings: простір', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
    vi.stubGlobal('sessionStorage', memoryStorage())
    patchMock.mockReset()
    deleteMock.mockReset()
    setActivePinia(createPinia())
  })

  it('перейменовує поточний простір на сервері', async () => {
    const workspaces = withCurrent(workspace())

    patchMock.mockResolvedValue(workspace({ name: 'Нова назва' }))

    const result = await useSettingsStore().saveWorkspace({ name: '  Нова назва ' })

    expect(result.ok).toBe(true)
    expect(patchMock).toHaveBeenCalledWith('/workspaces/budmaister', { name: 'Нова назва' })
    expect(workspaces.current?.name).toBe('Нова назва')
    expect(workspaces.items[1]?.name).toBe('Інший')
    expect(useSettingsStore().workspace).toEqual({ name: 'Нова назва' })
  })

  it('помилка валідації повертається як помилка поля й нічого не змінює', async () => {
    const workspaces = withCurrent(workspace())

    patchMock.mockRejectedValue(
      new ApiError('Перевірте заповнені поля.', 422, 'validation_failed', {
        name: ['Мінімум 2 символи.'],
      }),
    )

    const result = await useSettingsStore().saveWorkspace({ name: 'Б' })

    expect(result.ok).toBe(false)
    expect(result.fields).toEqual({ name: 'Мінімум 2 символи.' })
    expect(workspaces.current?.name).toBe('БудМайстер')
  })

  it('без обраного простору нічого не надсилає', async () => {
    const result = await useSettingsStore().saveWorkspace({ name: 'Нова назва' })

    expect(result.ok).toBe(false)
    expect(patchMock).not.toHaveBeenCalled()
  })

  it('видаляє поточний простір і прибирає його зі списку', async () => {
    const workspaces = withCurrent(workspace())

    deleteMock.mockResolvedValue(null)

    const result = await useSettingsStore().deleteWorkspace(' БудМайстер ')

    expect(result.ok).toBe(true)
    expect(deleteMock).toHaveBeenCalledWith('/workspaces/budmaister', {
      body: { name: 'БудМайстер' },
    })
    expect(workspaces.items.map((item) => item.slug)).toEqual(['inshyi'])
    expect(workspaces.currentId).toBeNull()
  })

  it('невірна назва при видаленні лишає простір', async () => {
    const workspaces = withCurrent(workspace())

    deleteMock.mockRejectedValue(
      new ApiError('Перевірте заповнені поля.', 422, 'validation_failed', {
        name: ['Назва не збігається з назвою простору.'],
      }),
    )

    const result = await useSettingsStore().deleteWorkspace('Щось інше')

    expect(result.ok).toBe(false)
    expect(result.fields).toEqual({ name: 'Назва не збігається з назвою простору.' })
    expect(workspaces.items).toHaveLength(2)
    expect(workspaces.currentId).toBe(1)
  })
})
