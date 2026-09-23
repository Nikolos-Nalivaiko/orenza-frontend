import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { Workspace } from '@/lib/workspaces'

const getMock = vi.hoisted(() => vi.fn<(path: string) => Promise<unknown>>())
const downloadMock = vi.hoisted(() => vi.fn<(path: string) => Promise<Blob>>())

vi.mock('@/lib/http', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/http')>()

  return { ...original, api: { ...original.api, get: getMock }, download: downloadMock }
})

const { useSettingsStore } = await import('../settings')
const { useWorkspacesStore } = await import('../workspaces')
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

const budmaister: Workspace = {
  id: 1,
  type: { value: 'company', label: 'Компанія' },
  features: { team: true },
  name: 'БудМайстер',
  slug: 'budmaister',
  owner_id: 7,
  created_at: null,
}

const summary = {
  objects: 4,
  archived: 1,
  clients: 3,
  employees: 2,
  materials: 10,
  services: 6,
  payments: 5,
}

describe('settings: дані та експорт', () => {
  const clicked: string[] = []

  beforeEach(() => {
    vi.stubGlobal('localStorage', memoryStorage())
    vi.stubGlobal('sessionStorage', memoryStorage())
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn<() => string>(() => 'blob:export'),
      revokeObjectURL: vi.fn<() => void>(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this.download)
    })
    clicked.length = 0
    getMock.mockReset()
    downloadMock.mockReset()
    setActivePinia(createPinia())

    const workspaces = useWorkspacesStore()

    workspaces.items = [budmaister]
    workspaces.currentId = budmaister.id
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('бере обсяг даних із сервера', async () => {
    getMock.mockResolvedValue(summary)

    const settings = useSettingsStore()

    await settings.loadSummary()

    expect(getMock).toHaveBeenCalledWith('/workspaces/budmaister/export/summary')
    expect(settings.summary).toEqual(summary)
    expect(settings.summaryError).toBeNull()
  })

  it('помилка підрахунку показує повідомлення', async () => {
    getMock.mockRejectedValue(new ApiError('Немає звʼязку із сервером.', 0, 'network'))

    const settings = useSettingsStore()

    await settings.loadSummary()

    expect(settings.summary).toBeNull()
    expect(settings.summaryError).toBe('Немає звʼязку із сервером.')
  })

  it('завантажує архів із сервера й зберігає його як zip', async () => {
    downloadMock.mockResolvedValue(new Blob(['PK'], { type: 'application/zip' }))

    const settings = useSettingsStore()
    const result = await settings.exportData()

    expect(result.ok).toBe(true)
    expect(downloadMock).toHaveBeenCalledWith('/workspaces/budmaister/export')
    expect(clicked).toHaveLength(1)
    expect(clicked[0]).toMatch(/^orenza-budmaister-\d{4}-\d{2}-\d{2}\.zip$/)
    expect(settings.lastExport).toBeInstanceOf(Date)
  })

  it('помилка експорту не зберігає файл', async () => {
    downloadMock.mockRejectedValue(
      new ApiError('Забагато запитів. Спробуйте трохи пізніше.', 429, 'too_many_requests'),
    )

    const settings = useSettingsStore()
    const result = await settings.exportData()

    expect(result).toEqual({
      ok: false,
      message: 'Забагато запитів. Спробуйте трохи пізніше.',
      fields: {},
    })
    expect(clicked).toHaveLength(0)
    expect(settings.lastExport).toBeNull()
  })
})
