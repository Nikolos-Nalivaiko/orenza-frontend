import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useProgressStore } from './progress'
import { api, ApiError, setAuthToken } from '@/lib/http'
import {
  buildLoginPayload,
  buildRegisterPayload,
  type Errors,
  type LoginForm,
  type RegisterForm,
} from '@/lib/validation'

export interface AuthUser {
  id: number
  first_name: string
  last_name: string
  full_name: string
  email: string
  phone: string | null
  current_workspace_id: number | null
  email_verified_at: string | null
  created_at: string
}

export interface AccessToken {
  token: string
  type: string
  expires_at: string | null
}

interface AuthPayload {
  user: AuthUser
  token: AccessToken
}

export type AuthStatus = 'idle' | 'pending'

const STORAGE_KEY = 'orenza.auth'

interface StoredSession {
  user: AuthUser
  token: string
}

interface RestoredSession extends StoredSession {
  remembered: boolean
}

const FIELD_MAP: Record<string, keyof RegisterForm> = {
  first_name: 'firstName',
  last_name: 'lastName',
  email: 'email',
  phone: 'phone',
  password: 'password',
  password_confirmation: 'passwordConfirmation',
}

function stores(): Storage[] {
  return [localStorage, sessionStorage]
}

function readSession(): RestoredSession | null {
  for (const storage of stores()) {
    try {
      const raw = storage.getItem(STORAGE_KEY)

      if (raw !== null) {
        return { ...(JSON.parse(raw) as StoredSession), remembered: storage === localStorage }
      }
    } catch {
      continue
    }
  }

  return null
}

function writeSession(session: StoredSession | null, remember = true): void {
  for (const storage of stores()) {
    try {
      storage.removeItem(STORAGE_KEY)
    } catch {
      continue
    }
  }

  if (session === null) {
    return
  }

  try {
    const storage = remember ? localStorage : sessionStorage

    storage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // ignore
  }
}

function messageFor(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

export const useAuthStore = defineStore('auth', () => {
  const progress = useProgressStore()
  const restored = readSession()

  const user = ref<AuthUser | null>(restored?.user ?? null)
  const token = ref<string | null>(restored?.token ?? null)
  const remembered = ref(restored?.remembered ?? true)

  setAuthToken(token.value)

  const status = ref<AuthStatus>('idle')
  const error = ref<string | null>(null)
  const fieldErrors = ref<Errors<RegisterForm>>({})

  const isAuthenticated = computed(() => user.value !== null)
  const isPending = computed(() => status.value === 'pending')

  function reset(): void {
    error.value = null
    fieldErrors.value = {}
  }

  function persist(payload: AuthPayload, remember: boolean): void {
    const session: StoredSession = { user: payload.user, token: payload.token.token }

    user.value = session.user
    token.value = session.token
    remembered.value = remember
    setAuthToken(session.token)
    writeSession(session, remember)
  }

  function setUser(next: AuthUser): void {
    user.value = next

    if (token.value !== null) {
      writeSession({ user: next, token: token.value }, remembered.value)
    }
  }

  function clear(): void {
    user.value = null
    token.value = null
    setAuthToken(null)
    writeSession(null)
  }

  function collectFieldErrors(cause: unknown): void {
    if (!(cause instanceof ApiError) || !cause.isValidation) {
      return
    }

    const collected: Errors<RegisterForm> = {}

    for (const [key, messages] of Object.entries(cause.errors)) {
      const field = FIELD_MAP[key]
      const message = messages[0]

      if (field !== undefined && message !== undefined) {
        collected[field] = message
      }
    }

    fieldErrors.value = collected
  }

  async function register(form: RegisterForm, remember = true): Promise<boolean> {
    status.value = 'pending'
    reset()

    try {
      const payload = await progress.track(
        api.post<AuthPayload>('/auth/register', buildRegisterPayload(form)),
      )

      persist(payload, remember)

      return true
    } catch (cause) {
      collectFieldErrors(cause)
      error.value = messageFor(cause, 'Не вдалося створити акаунт.')

      return false
    } finally {
      status.value = 'idle'
    }
  }

  async function login(form: LoginForm, remember = true): Promise<boolean> {
    status.value = 'pending'
    reset()

    try {
      const payload = await progress.track(
        api.post<AuthPayload>('/auth/login', buildLoginPayload(form)),
      )

      persist(payload, remember)

      return true
    } catch (cause) {
      collectFieldErrors(cause)
      error.value = messageFor(cause, 'Не вдалося увійти.')

      return false
    } finally {
      status.value = 'idle'
    }
  }

  async function logout(): Promise<void> {
    if (token.value !== null) {
      try {
        await api.post('/auth/logout')
      } catch {
        // ignore
      }
    }

    clear()
  }

  async function restore(): Promise<void> {
    if (token.value === null) {
      return
    }

    try {
      setUser(await api.get<AuthUser>('/auth/me'))
    } catch (cause) {
      if (cause instanceof ApiError && cause.isUnauthorized) {
        clear()
      }
    }
  }

  return {
    user,
    token,
    status,
    error,
    fieldErrors,
    isAuthenticated,
    isPending,
    reset,
    setUser,
    register,
    login,
    logout,
    restore,
  }
})
