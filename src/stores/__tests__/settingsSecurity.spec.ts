import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const putMock = vi.hoisted(() => vi.fn<(path: string, body?: unknown) => Promise<unknown>>())
const deleteMock = vi.hoisted(() =>
  vi.fn<(path: string, options?: { body?: unknown }) => Promise<unknown>>(),
)

vi.mock('@/lib/http', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/http')>()

  return { ...original, api: { ...original.api, put: putMock, delete: deleteMock } }
})

const { useSettingsStore } = await import('../settings')
const { useAuthStore } = await import('../auth')
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

describe('settings: безпека', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
    vi.stubGlobal('sessionStorage', memoryStorage())
    putMock.mockReset()
    deleteMock.mockReset()
    setActivePinia(createPinia())
  })

  it('змінює пароль на сервері', async () => {
    putMock.mockResolvedValue({ revoked_tokens: 2 })

    const result = await useSettingsStore().changePassword({
      current: 'old-secret',
      password: 'new-secret-123',
      confirmation: 'new-secret-123',
    })

    expect(result.ok).toBe(true)
    expect(putMock).toHaveBeenCalledWith('/profile/password', {
      current_password: 'old-secret',
      password: 'new-secret-123',
      password_confirmation: 'new-secret-123',
    })
  })

  it('невірний поточний пароль повертається як помилка поля', async () => {
    putMock.mockRejectedValue(
      new ApiError('Перевірте заповнені поля.', 422, 'validation_failed', {
        current_password: ['Невірний пароль.'],
      }),
    )

    const result = await useSettingsStore().changePassword({
      current: 'wrong',
      password: 'new-secret-123',
      confirmation: 'new-secret-123',
    })

    expect(result.ok).toBe(false)
    expect(result.fields).toEqual({ current_password: 'Невірний пароль.' })
  })

  it('завершує інші сеанси', async () => {
    deleteMock.mockResolvedValue({ revoked_tokens: 1 })

    const result = await useSettingsStore().signOutOthers()

    expect(result.ok).toBe(true)
    expect(deleteMock).toHaveBeenCalledWith('/profile/sessions')
  })

  it('обмеження частоти показує повідомлення сервера', async () => {
    deleteMock.mockRejectedValue(
      new ApiError('Забагато запитів. Спробуйте трохи пізніше.', 429, 'too_many_requests'),
    )

    const result = await useSettingsStore().signOutOthers()

    expect(result).toEqual({
      ok: false,
      message: 'Забагато запитів. Спробуйте трохи пізніше.',
      fields: {},
    })
  })

  it('видаляє акаунт із паролем і завершує сесію', async () => {
    deleteMock.mockResolvedValue(null)
    localStorage.setItem(
      'orenza.auth',
      JSON.stringify({ user: { id: 1, email: 'me@example.com' }, token: 'secret' }),
    )

    const auth = useAuthStore()
    const result = await useSettingsStore().deleteAccount('my-password')

    expect(result.ok).toBe(true)
    expect(deleteMock).toHaveBeenCalledWith('/profile', { body: { password: 'my-password' } })
    expect(auth.isAuthenticated).toBe(false)
    expect(localStorage.getItem('orenza.auth')).toBeNull()
  })

  it('невірний пароль при видаленні лишає користувача в системі', async () => {
    deleteMock.mockRejectedValue(
      new ApiError('Перевірте заповнені поля.', 422, 'validation_failed', {
        password: ['Невірний пароль.'],
      }),
    )
    localStorage.setItem(
      'orenza.auth',
      JSON.stringify({ user: { id: 1, email: 'me@example.com' }, token: 'secret' }),
    )

    const auth = useAuthStore()
    const result = await useSettingsStore().deleteAccount('wrong')

    expect(result.ok).toBe(false)
    expect(result.fields).toEqual({ password: 'Невірний пароль.' })
    expect(auth.isAuthenticated).toBe(true)
  })
})
