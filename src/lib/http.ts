export const API_URL = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/+$/, '')

let authToken: string | null = null

export function setAuthToken(token: string | null): void {
  authToken = token
}

export interface ApiEnvelope<T> {
  data: T
  message?: string
  meta?: Record<string, unknown>
}

export type ApiErrors = Record<string, string[]>

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly errors: ApiErrors = {},
  ) {
    super(message)
    this.name = 'ApiError'
  }

  get isNetwork(): boolean {
    return this.status === 0
  }

  get isUnauthorized(): boolean {
    return this.status === 401
  }

  get isValidation(): boolean {
    return this.status === 422
  }

  fieldError(field: string): string | undefined {
    return this.errors[field]?.[0]
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  signal?: AbortSignal
}

interface ErrorPayload {
  message?: string
  error_code?: string
  errors?: ApiErrors
}

async function parse(response: Response): Promise<unknown> {
  if (response.status === 204) {
    return null
  }

  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options

  const headers: Record<string, string> = { Accept: 'application/json' }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  if (authToken !== null) {
    headers.Authorization = `Bearer ${authToken}`
  }

  let response: Response

  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      signal,
      credentials: 'omit',
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch (cause) {
    if (typeof cause === 'object' && cause !== null && (cause as Error).name === 'AbortError') {
      throw cause
    }

    throw new ApiError('Немає звʼязку із сервером.', 0, 'network')
  }

  const payload = await parse(response)

  if (!response.ok) {
    const error = (payload ?? {}) as ErrorPayload

    throw new ApiError(
      error.message ?? 'Сервер відповів помилкою.',
      response.status,
      error.error_code ?? 'error',
      error.errors ?? {},
    )
  }

  return (payload as ApiEnvelope<T> | null)?.data as T
}

export const api = {
  get: <T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(
    path: string,
    body?: unknown,
    options: Omit<RequestOptions, 'method'> = {},
  ): Promise<T> => request<T>(path, { ...options, method: 'POST', body }),

  put: <T>(
    path: string,
    body?: unknown,
    options: Omit<RequestOptions, 'method'> = {},
  ): Promise<T> => request<T>(path, { ...options, method: 'PUT', body }),

  patch: <T>(
    path: string,
    body?: unknown,
    options: Omit<RequestOptions, 'method'> = {},
  ): Promise<T> => request<T>(path, { ...options, method: 'PATCH', body }),

  delete: <T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
