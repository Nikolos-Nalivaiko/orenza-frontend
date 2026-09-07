import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, ApiError, API_URL, setAuthToken } from '@/lib/http'

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
})
