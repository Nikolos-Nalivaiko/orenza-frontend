export const API_URL = (import.meta.env.VITE_API_URL ?? '/api/v1').replace(/\/+$/, '')

let authToken: string | null = null
let unauthorizedHandler: (() => void) | null = null

export function setAuthToken(token: string | null): void {
  authToken = token
}

export function onUnauthorized(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

function notifyUnauthorized(status: number, token: string | null): void {
  if (status === 401 && token !== null && token === authToken) {
    unauthorizedHandler?.()
  }
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
  return (await requestEnvelope<T>(path, options))?.data as T
}

async function requestEnvelope<T>(
  path: string,
  options: RequestOptions,
): Promise<ApiEnvelope<T> | null> {
  const { method = 'GET', body, signal } = options

  const headers: Record<string, string> = { Accept: 'application/json' }

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }

  const token = authToken

  if (token !== null) {
    headers.Authorization = `Bearer ${token}`
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
    notifyUnauthorized(response.status, token)

    throw errorFrom(response.status, payload)
  }

  return payload as ApiEnvelope<T> | null
}

function errorFrom(status: number, payload: unknown): ApiError {
  const error = (payload ?? {}) as ErrorPayload

  return new ApiError(
    error.message ?? 'Сервер відповів помилкою.',
    status,
    error.error_code ?? 'error',
    error.errors ?? {},
  )
}

export async function download(path: string, signal?: AbortSignal): Promise<Blob> {
  const token = authToken
  const headers: Record<string, string> = { Accept: 'application/octet-stream, application/json' }

  if (token !== null) {
    headers.Authorization = `Bearer ${token}`
  }

  let response: Response

  try {
    response = await fetch(`${API_URL}${path}`, { headers, signal, credentials: 'omit' })
  } catch (cause) {
    if (typeof cause === 'object' && cause !== null && (cause as Error).name === 'AbortError') {
      throw cause
    }

    throw new ApiError('Немає звʼязку із сервером.', 0, 'network')
  }

  if (!response.ok) {
    notifyUnauthorized(response.status, token)

    throw errorFrom(response.status, await parse(response))
  }

  return response.blob()
}

export interface UploadOptions {
  signal?: AbortSignal
  onProgress?: (fraction: number) => void
}

export function upload<T>(path: string, form: FormData, options: UploadOptions = {}): Promise<T> {
  const { signal, onProgress } = options

  return new Promise<T>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))

      return
    }

    const xhr = new XMLHttpRequest()

    const token = authToken

    xhr.open('POST', `${API_URL}${path}`)
    xhr.setRequestHeader('Accept', 'application/json')

    if (token !== null) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    }

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress?.(event.loaded / event.total)
      }
    })

    xhr.addEventListener('load', () => {
      let payload: unknown = null

      try {
        payload = xhr.responseText === '' ? null : JSON.parse(xhr.responseText)
      } catch {
        payload = null
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(1)
        resolve((payload as ApiEnvelope<T> | null)?.data as T)
      } else {
        notifyUnauthorized(xhr.status, token)
        reject(errorFrom(xhr.status, payload))
      }
    })

    xhr.addEventListener('error', () =>
      reject(new ApiError('Немає звʼязку із сервером.', 0, 'network')),
    )
    xhr.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))

    signal?.addEventListener('abort', () => xhr.abort(), { once: true })

    xhr.send(form)
  })
}

export interface ApiPage<T> {
  data: T[]
  meta: Record<string, unknown>
}

export const api = {
  get: <T>(path: string, options: Omit<RequestOptions, 'method' | 'body'> = {}): Promise<T> =>
    request<T>(path, { ...options, method: 'GET' }),

  page: async <T>(
    path: string,
    options: Omit<RequestOptions, 'method' | 'body'> = {},
  ): Promise<ApiPage<T>> => {
    const envelope = await requestEnvelope<T[]>(path, { ...options, method: 'GET' })

    return { data: envelope?.data ?? [], meta: envelope?.meta ?? {} }
  },

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

  delete: <T>(path: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
