import { afterEach, describe, expect, it, vi } from 'vitest'
import { API_URL, ApiError } from '../http'
import { fetchTrack, normalizeTrack, type TrackResource } from '../track'

function resource(overrides: Partial<TrackResource> = {}): TrackResource {
  return {
    name: 'ЖК «Пасаж»',
    address: 'вул. Стеценка, 12 · Київ',
    description: 'Монолітний каркас',
    status: { value: 'in_progress', label: 'В роботі' },
    readiness: 0.75,
    works: { done: 1, total: 2 },
    started_at: '2026-06-01',
    finished_at: '2026-10-14',
    actual_started_at: '2026-06-08',
    actual_finished_at: null,
    finished: false,
    materials: [
      {
        id: 1,
        name: 'Бетон В25',
        quantity: 100,
        unit: 'м³',
        status: { value: 'delivered', label: 'Доставлено' },
      },
    ],
    services: [
      {
        id: 3,
        name: 'Монолітні роботи',
        description: null,
        unit: 'м³',
        planned_volume: 100,
        actual_volume: 50,
        status: { value: 'in_progress', label: 'В роботі' },
        total: 100_000,
      },
    ],
    money: {
      client: 460_000,
      paid: 100_000,
      due: 360_000,
      progress: 0.2174,
      state: { value: 'partial', label: 'Оплачено частково' },
    },
    payments: [{ id: 5, date: '2026-08-01', amount: 100_000, received: true, note: 'Аванс' }],
    ...overrides,
  }
}

function respond(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('normalizeTrack', () => {
  it('переводить відповідь API у поля сторінки', () => {
    const view = normalizeTrack(resource())

    expect(view.photos).toEqual([])
    expect(view.plannedStart).toBe('2026-06-01')
    expect(view.plannedFinish).toBe('2026-10-14')
    expect(view.readiness).toBe(0.75)
    expect(view.works).toEqual({ done: 1, total: 2 })
    expect(view.materials[0]).toEqual({
      id: 1,
      name: 'Бетон В25',
      quantity: 100,
      unit: 'м³',
      status: { value: 'delivered', label: 'Доставлено' },
    })
    expect(view.services[0]).toMatchObject({ plannedVolume: 100, actualVolume: 50, total: 100_000 })
    expect(view.money).toEqual({
      client: 460_000,
      paid: 100_000,
      due: 360_000,
      progress: 0.2174,
      state: 'partial',
    })
    expect(view.payments).toEqual([
      { id: 5, date: '2026-08-01', amount: 100_000, received: true, note: 'Аванс' },
    ])
  })

  it('передає фото з майданчика для переглядача', () => {
    const photos = [
      {
        id: 4,
        thumb: 'https://cdn.test/4-thumb.webp',
        full: 'https://cdn.test/4-full.webp',
        width: 1600,
        height: 1200,
        color: '#8a7f6a',
        at: '2026-08-01T10:00:00+00:00',
      },
    ]

    expect(normalizeTrack(resource({ photos })).photos).toEqual(photos)
  })

  it('не показує фактичні дати, поки обʼєкт не завершено', () => {
    const going = normalizeTrack(resource())
    const done = normalizeTrack(resource({ finished: true, actual_finished_at: '2026-09-30' }))

    expect(going.actualStart).toBeNull()
    expect(going.actualFinish).toBeNull()
    expect(done.actualStart).toBe('2026-06-08')
    expect(done.actualFinish).toBe('2026-09-30')
  })
})

describe('fetchTrack', () => {
  it('запитує публічну сторінку за токеном', async () => {
    const fetchMock = vi.fn<() => Promise<Response>>(() =>
      Promise.resolve(respond({ data: resource() })),
    )

    vi.stubGlobal('fetch', fetchMock)

    const view = await fetchTrack('abc123')

    expect(fetchMock.mock.calls[0]).toEqual([`${API_URL}/track/abc123`, expect.anything()])
    expect(view.name).toBe('ЖК «Пасаж»')
  })

  it('віддає 404, коли посилання більше не діє', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<() => Promise<Response>>(() =>
        Promise.resolve(respond({ message: 'Сторінка недоступна.', error_code: 'not_found' }, 404)),
      ),
    )

    const failure = await fetchTrack('gone').catch((cause: unknown) => cause)

    expect(failure).toBeInstanceOf(ApiError)
    expect((failure as ApiError).status).toBe(404)
  })
})
