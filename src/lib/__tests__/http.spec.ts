import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, API_URL, download, onUnauthorized, setAuthToken, upload } from '@/lib/http'

function respond(body: unknown, status = 200): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function mockFetch(response: Response | Error | DOMException): ReturnType<typeof vi.fn> {
  const spy = vi.fn<() => Promise<Response>>(() =>
    response instanceof Response ? Promise.resolve(response) : Promise.reject(response),
  )

  vi.stubGlobal('fetch', spy)

  return spy
}

afterEach(() => {
  vi.unstubAllGlobals()
  setAuthToken(null)
  onUnauthorized(null)
})

describe('request', () => {
  it('розпаковує конверт { data } і додає базову адресу', async () => {
    const fetchMock = mockFetch(respond({ data: { id: 7 }, message: 'Готово.' }))

    await expect(api.get('/ping')).resolves.toEqual({ id: 7 })
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${API_URL}/ping`)
  })

  it('підписує запит токеном сесії, коли він є', async () => {
    const fetchMock = mockFetch(respond({ data: null }))

    setAuthToken('secret')
    await api.get('/auth/me')

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    const headers = init.headers as Record<string, string>

    expect(headers.Authorization).toBe('Bearer secret')
  })

  it('надсилає тіло як JSON', async () => {
    const fetchMock = mockFetch(respond({ data: null }, 201))

    await api.post('/workspaces', { type: 'company' })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit

    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"type":"company"}')
  })

  it('перетворює конверт помилки на ApiError із полями', async () => {
    mockFetch(
      respond(
        {
          message: 'Перевірте поля.',
          error_code: 'validation_failed',
          errors: { email: ['Ця пошта вже зареєстрована.'] },
        },
        422,
      ),
    )

    const error = await api.post('/auth/register').catch((cause: unknown) => cause)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).isValidation).toBe(true)
    expect((error as ApiError).fieldError('email')).toBe('Ця пошта вже зареєстрована.')
  })

  it('падіння мережі стає помилкою зі статусом 0', async () => {
    mockFetch(new TypeError('Failed to fetch'))

    const error = await api.get('/ping').catch((cause: unknown) => cause)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).isNetwork).toBe(true)
  })

  it('скасований запит лишається AbortError, а не «немає звʼязку»', async () => {
    mockFetch(new DOMException('The user aborted a request.', 'AbortError'))

    const error = await api.get('/ping').catch((cause: unknown) => cause)

    expect(error).toBeInstanceOf(DOMException)
  })

  it('204 повертає порожню відповідь без падіння', async () => {
    mockFetch(new Response(null, { status: 204 }))

    await expect(api.delete('/workspaces/1')).resolves.toBeUndefined()
  })

  it('DELETE може нести тіло', async () => {
    const fetchMock = mockFetch(respond({ data: null }))

    await api.delete('/profile', { body: { password: 'secret' } })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit

    expect(init.method).toBe('DELETE')
    expect(init.body).toBe('{"password":"secret"}')
  })

  it('401 із відкликаним токеном повідомляє про завершену сесію', async () => {
    const handler = vi.fn<() => void>()

    mockFetch(respond({ message: 'Unauthenticated.' }, 401))
    onUnauthorized(handler)
    setAuthToken('revoked')

    await expect(api.get('/auth/me')).rejects.toBeInstanceOf(ApiError)
    expect(handler).toHaveBeenCalledOnce()
  })

  it('401 без токена не вважається завершеною сесією', async () => {
    const handler = vi.fn<() => void>()

    mockFetch(respond({ message: 'Невірний email або пароль.' }, 401))
    onUnauthorized(handler)

    await expect(api.post('/auth/login')).rejects.toBeInstanceOf(ApiError)
    expect(handler).not.toHaveBeenCalled()
  })
})

describe('download', () => {
  it('повертає файл як Blob і підписує запит токеном', async () => {
    const fetchMock = mockFetch(
      new Response('PK', { status: 200, headers: { 'Content-Type': 'application/zip' } }),
    )

    setAuthToken('secret')

    const blob = await download('/workspaces/acme/export')
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit

    expect(await blob.text()).toBe('PK')
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${API_URL}/workspaces/acme/export`)
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret')
  })

  it('помилку сервера перетворює на ApiError', async () => {
    mockFetch(respond({ message: 'Забагато запитів.', error_code: 'too_many_requests' }, 429))

    const error = await download('/workspaces/acme/export').catch((cause: unknown) => cause)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).message).toBe('Забагато запитів.')
  })
})

class FakeXhr {
  static last: FakeXhr | null = null

  method = ''
  url = ''
  headers: Record<string, string> = {}
  body: unknown = null
  status = 0
  responseText = ''

  private listeners = new Map<string, Array<(event?: unknown) => void>>()
  private uploadListeners = new Map<string, Array<(event: ProgressEvent) => void>>()

  upload = {
    addEventListener: (type: string, listener: (event: ProgressEvent) => void) => {
      this.uploadListeners.set(type, [...(this.uploadListeners.get(type) ?? []), listener])
    },
  }

  constructor() {
    FakeXhr.last = this
  }

  open(method: string, url: string): void {
    this.method = method
    this.url = url
  }

  setRequestHeader(name: string, value: string): void {
    this.headers[name] = value
  }

  addEventListener(type: string, listener: (event?: unknown) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  send(body: unknown): void {
    this.body = body
  }

  abort(): void {
    this.emit('abort')
  }

  progress(loaded: number, total: number): void {
    for (const listener of this.uploadListeners.get('progress') ?? []) {
      listener({ lengthComputable: true, loaded, total } as ProgressEvent)
    }
  }

  respond(status: number, body: unknown): void {
    this.status = status
    this.responseText = JSON.stringify(body)
    this.emit('load')
  }

  emit(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener()
    }
  }
}

describe('upload', () => {
  it('шле FormData з токеном і звітує про прогрес', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXhr)
    setAuthToken('secret')

    const progress: number[] = []
    const form = new FormData()

    form.append('photo', new File(['x'], 'photo.jpg', { type: 'image/jpeg' }))

    const pending = upload<{ id: number }>('/objects/1/photos', form, {
      onProgress: (fraction) => progress.push(fraction),
    })

    const xhr = FakeXhr.last as FakeXhr

    expect(xhr.method).toBe('POST')
    expect(xhr.url).toBe(`${API_URL}/objects/1/photos`)
    expect(xhr.headers.Authorization).toBe('Bearer secret')
    expect(xhr.body).toBe(form)

    xhr.progress(50, 100)
    xhr.respond(200, { data: { id: 1 } })

    await expect(pending).resolves.toEqual({ id: 1 })
    expect(progress).toEqual([0.5, 1])
  })

  it('перетворює помилку валідації на ApiError', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXhr)

    const pending = upload('/objects/1/photos', new FormData())

    FakeXhr.last?.respond(422, {
      message: 'Перевірте заповнені поля.',
      error_code: 'validation_failed',
      errors: { photo: ['Файл завеликий.'] },
    })

    const error = await pending.catch((cause: unknown) => cause)

    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).fieldError('photo')).toBe('Файл завеликий.')
  })

  it('скасування обриває запит', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXhr)

    const controller = new AbortController()
    const pending = upload('/objects/1/photos', new FormData(), { signal: controller.signal })

    controller.abort()

    const error = await pending.catch((cause: unknown) => cause)

    expect((error as DOMException).name).toBe('AbortError')
  })
})
