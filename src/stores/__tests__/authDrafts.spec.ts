import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('@/lib/http', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/http')>()

  return {
    ...original,
    api: { ...original.api, post: vi.fn<() => Promise<null>>(async () => null) },
  }
})

const { useAuthStore } = await import('../auth')

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
  vi.stubGlobal('sessionStorage', memoryStorage())
  localStorage.setItem('orenza.auth', JSON.stringify({ user: { id: 4 }, token: 'secret' }))
  localStorage.setItem('orenza.objects.draft.4.8', JSON.stringify({ name: 'ЖК «Пасаж»' }))
  localStorage.setItem('orenza.objects.view', 'cards')
  setActivePinia(createPinia())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('вихід з акаунта', () => {
  it('стирає чернетки обʼєктів, але не налаштування вигляду', async () => {
    const auth = useAuthStore()

    await auth.logout()

    expect(localStorage.getItem('orenza.objects.draft.4.8')).toBeNull()
    expect(localStorage.getItem('orenza.auth')).toBeNull()
    expect(localStorage.getItem('orenza.objects.view')).toBe('cards')
  })
})
