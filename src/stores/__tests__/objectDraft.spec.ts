import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { reactive } from 'vue'
import { emptyObjectForm } from '@/lib/objects'

const session = vi.hoisted(() => ({ userId: 4 as number | null, workspaceId: 8 as number | null }))

vi.mock('../auth', () => ({
  useAuthStore: () => ({
    get user() {
      return session.userId === null ? null : { id: session.userId }
    },
  }),
}))

vi.mock('../workspaces', () => ({
  useWorkspacesStore: () =>
    reactive({
      get current() {
        return session.workspaceId === null ? null : { id: session.workspaceId, slug: 'acme' }
      },
      get currentId() {
        return session.workspaceId
      },
    }),
}))

const { useObjectsStore } = await import('../objects')

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

beforeEach(() => {
  vi.stubGlobal('localStorage', memoryStorage())
  session.userId = 4
  session.workspaceId = 8
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('чернетка нового обʼєкта', () => {
  it('повертається тій самій людині в тому самому просторі', () => {
    const store = useObjectsStore()

    store.saveDraft({ ...emptyObjectForm(), name: 'ЖК «Пасаж»', clientId: 3 })

    expect(localStorage.getItem('orenza.objects.draft.4.8')).not.toBeNull()
    expect(store.readDraft()).toMatchObject({ name: 'ЖК «Пасаж»', clientId: 3 })
  })

  it('не переїжджає в інший простір', () => {
    const store = useObjectsStore()

    store.saveDraft({ ...emptyObjectForm(), name: 'ЖК «Пасаж»', clientId: 3 })
    session.workspaceId = 9

    expect(store.readDraft()).toBeNull()
  })

  it('не дістається іншій людині на тому ж компʼютері', () => {
    const store = useObjectsStore()

    store.saveDraft({ ...emptyObjectForm(), name: 'ЖК «Пасаж»' })
    session.userId = 5

    expect(store.readDraft()).toBeNull()
  })

  it('старий спільний ключ прибирається при запуску', () => {
    localStorage.setItem('orenza.objects.draft', JSON.stringify({ name: 'Чужа чернетка' }))

    const store = useObjectsStore()

    expect(localStorage.getItem('orenza.objects.draft')).toBeNull()
    expect(store.readDraft()).toBeNull()
  })

  it('очищається лише для поточного простору', () => {
    const store = useObjectsStore()

    store.saveDraft({ ...emptyObjectForm(), name: 'Перший' })
    session.workspaceId = 9
    store.saveDraft({ ...emptyObjectForm(), name: 'Другий' })
    store.clearDraft()

    expect(localStorage.getItem('orenza.objects.draft.4.9')).toBeNull()
    expect(localStorage.getItem('orenza.objects.draft.4.8')).not.toBeNull()
  })
})
