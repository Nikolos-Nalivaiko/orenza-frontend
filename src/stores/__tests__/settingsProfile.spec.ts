import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const patchMock = vi.hoisted(() => vi.fn<(path: string, body?: unknown) => Promise<unknown>>())

vi.mock('@/lib/http', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/http')>()

  return { ...original, api: { ...original.api, patch: patchMock } }
})

const { useAuthStore } = await import('../auth')
const { useSettingsStore } = await import('../settings')
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

const user = {
  id: 4,
  first_name: 'Ада',
  last_name: 'Лавлейс',
  full_name: 'Ада Лавлейс',
  email: 'ada@example.com',
  phone: null,
  current_workspace_id: null,
  email_verified_at: null,
  created_at: '2026-01-01T00:00:00Z',
}

describe('settings.saveProfile', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
    vi.stubGlobal('sessionStorage', memoryStorage())
    localStorage.setItem('orenza.auth', JSON.stringify({ user, token: 'secret' }))
    patchMock.mockReset()
    setActivePinia(createPinia())
  })

  it('надсилає профіль на сервер і оновлює користувача', async () => {
    const auth = useAuthStore()
    const settings = useSettingsStore()

    patchMock.mockResolvedValue({
      ...user,
      first_name: 'Нікола',
      full_name: 'Нікола Лавлейс',
      phone: '+380671234567',
    })

    const result = await settings.saveProfile({
      firstName: ' Нікола ',
      lastName: 'Лавлейс',
      email: 'ADA@example.com',
      phone: '067 123 45 67',
    })

    expect(result.ok).toBe(true)
    expect(patchMock).toHaveBeenCalledWith('/profile', {
      first_name: 'Нікола',
      last_name: 'Лавлейс',
      email: 'ada@example.com',
      phone: '+380671234567',
    })
    expect(auth.user?.full_name).toBe('Нікола Лавлейс')
    expect(settings.profile.phone).toBe('+380671234567')
  })

  it('повертає помилки полів із відповіді сервера', async () => {
    const settings = useSettingsStore()

    patchMock.mockRejectedValue(
      new ApiError('Перевірте заповнені поля.', 422, 'validation_failed', {
        email: ['Ця пошта вже зареєстрована.'],
      }),
    )

    const result = await settings.saveProfile({
      firstName: 'Ада',
      lastName: 'Лавлейс',
      email: 'taken@example.com',
      phone: '',
    })

    expect(result.ok).toBe(false)
    expect(result.fields).toEqual({ email: 'Ця пошта вже зареєстрована.' })
    expect(settings.profile.email).toBe('ada@example.com')
  })
})
