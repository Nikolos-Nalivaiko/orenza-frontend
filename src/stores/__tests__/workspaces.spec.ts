import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Workspace } from '@/lib/workspaces'

const getMock = vi.hoisted(() => vi.fn<(path: string) => Promise<unknown>>())
const putMock = vi.hoisted(() => vi.fn<(path: string) => Promise<unknown>>())

vi.mock('@/lib/http', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/http')>()

  return { ...original, api: { ...original.api, get: getMock, put: putMock } }
})

const { useWorkspacesStore } = await import('../workspaces')

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

function workspace(id: number, slug: string): Workspace {
  return {
    id,
    type: { value: 'company', label: 'Компанія' },
    features: { team: true },
    name: slug,
    slug,
    owner_id: 1,
    created_at: null,
  }
}

describe('workspaces.enter', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
    getMock.mockReset()
    putMock.mockReset()
    setActivePinia(createPinia())
  })

  it('поточний простір не перемикає вдруге', async () => {
    const store = useWorkspacesStore()

    store.items = [workspace(1, 'acme'), workspace(2, 'nord')]
    store.currentId = 1

    await expect(store.enter('acme')).resolves.toMatchObject({ id: 1 })
    expect(putMock).not.toHaveBeenCalled()
  })

  it('перемикає на простір з адреси', async () => {
    const store = useWorkspacesStore()

    putMock.mockResolvedValue({ workspace: workspace(2, 'nord'), user: { id: 1 } })
    store.items = [workspace(1, 'acme'), workspace(2, 'nord')]
    store.currentId = 1

    await expect(store.enter('nord')).resolves.toMatchObject({ id: 2 })
    expect(putMock).toHaveBeenCalledWith('/workspaces/nord/current')
    expect(store.currentId).toBe(2)
  })

  it('незнайомий slug довантажує список', async () => {
    const store = useWorkspacesStore()

    getMock.mockResolvedValue([workspace(1, 'acme'), workspace(3, 'fresh')])
    putMock.mockResolvedValue({ workspace: workspace(3, 'fresh'), user: { id: 1 } })
    store.items = [workspace(1, 'acme')]
    store.currentId = 1

    await expect(store.enter('fresh')).resolves.toMatchObject({ id: 3 })
    expect(getMock).toHaveBeenCalledWith('/workspaces')
  })

  it('чужий або видалений простір не відкриває', async () => {
    const store = useWorkspacesStore()

    getMock.mockResolvedValue([workspace(1, 'acme')])
    store.items = [workspace(1, 'acme')]
    store.currentId = 1

    await expect(store.enter('ghost')).resolves.toBeNull()
    expect(store.currentId).toBe(1)
  })

  it('якщо сервер не перемкнув — лишається в поточному', async () => {
    const store = useWorkspacesStore()

    putMock.mockRejectedValue(new Error('offline'))
    store.items = [workspace(1, 'acme'), workspace(2, 'nord')]
    store.currentId = 1

    await expect(store.enter('nord')).resolves.toBeNull()
    expect(store.currentId).toBe(1)
  })
})
