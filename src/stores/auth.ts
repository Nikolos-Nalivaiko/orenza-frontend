import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useProgressStore } from './progress'
import { setAuthToken } from '@/lib/http'
import {
  buildLoginPayload,
  buildRegisterPayload,
  type LoginForm,
  type RegisterForm,
  type RegisterPayload,
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

export type AuthStatus = 'idle' | 'pending'

const STORAGE_KEY = 'orenza.auth'

const TAKEN_EMAIL = 'taken@orenza.ua'

interface StoredSession {
  user: AuthUser
  token: string
}

function readSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    return raw === null ? null : (JSON.parse(raw) as StoredSession)
  } catch {
    return null
  }
}

function writeSession(session: StoredSession | null): void {
  try {
    if (session === null) {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    }
  } catch {
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function capitalise(value: string): string {
  return value === '' ? value : value[0]!.toUpperCase() + value.slice(1)
}

function userFromPayload(payload: Partial<RegisterPayload> & { email: string }): AuthUser {
  const [local = 'користувач'] = payload.email.split('@')
  const first = capitalise(payload.first_name ?? local)
  const last = payload.last_name ?? ''

  return {
    id: 1,
    first_name: first,
    last_name: last,
    full_name: `${first} ${last}`.trim(),
    email: payload.email,
    phone: payload.phone ?? null,
    current_workspace_id: null,
    email_verified_at: null,
    created_at: new Date().toISOString(),
  }
}

export const useAuthStore = defineStore('auth', () => {
  const progress = useProgressStore()
  const restored = readSession()

  const user = ref<AuthUser | null>(restored?.user ?? null)
  const token = ref<string | null>(restored?.token ?? null)

  setAuthToken(token.value)
  const status = ref<AuthStatus>('idle')
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => user.value !== null)
  const isPending = computed(() => status.value === 'pending')

  function reset(): void {
    error.value = null
  }

  function persist(nextUser: AuthUser): void {
    const session: StoredSession = { user: nextUser, token: `session-${Date.now()}` }

    user.value = session.user
    token.value = session.token
    setAuthToken(session.token)
    writeSession(session)
  }

  async function register(form: RegisterForm): Promise<boolean> {
    const payload = buildRegisterPayload(form)

    status.value = 'pending'
    error.value = null

    // TODO: POST /api/v1/auth/register
    await progress.track(delay(900))
    status.value = 'idle'

    if (payload.email === TAKEN_EMAIL) {
      error.value = 'Ця пошта вже зареєстрована. Спробуйте увійти.'

      return false
    }

    persist(userFromPayload(payload))

    return true
  }

  async function login(form: LoginForm): Promise<boolean> {
    const payload = buildLoginPayload(form)

    status.value = 'pending'
    error.value = null

    // TODO: POST /api/v1/auth/login
    await progress.track(delay(800))
    status.value = 'idle'

    if (payload.password.length < 8) {
      error.value = 'Невірна пошта або пароль.'

      return false
    }

    persist(userFromPayload({ email: payload.email }))

    return true
  }

  function logout(): void {
    // TODO: POST /api/v1/auth/logout
    user.value = null
    token.value = null
    setAuthToken(null)
    writeSession(null)
  }

  return {
    user,
    token,
    status,
    error,
    isAuthenticated,
    isPending,
    reset,
    register,
    login,
    logout,
  }
})
