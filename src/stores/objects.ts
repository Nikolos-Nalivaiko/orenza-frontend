import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useProgressStore } from './progress'
import { useWorkspacesStore } from './workspaces'
import {
  MATERIAL_BUYER_LABELS,
  MATERIAL_STATUS_LABELS,
  type Material,
  type MaterialPayload,
} from '@/lib/materials'
import {
  normalizePayment,
  PAYMENT_STATUS_LABELS,
  type Payment,
  type PaymentPayload,
} from '@/lib/finance'
import {
  normalizeServiceWorker,
  SERVICE_STATUS_LABELS,
  type Service,
  type ServicePayload,
} from '@/lib/services'
import {
  buildObjectPayload,
  DEMO_CLIENTS,
  emptyObjectForm,
  OBJECT_STATUS_LABELS,
  type Client,
  type ConstructionObject,
  type ObjectForm,
} from '@/lib/objects'

/**
 * Поки ендпоінтів обʼєктів немає, створене живе в localStorage — структура
 * записів і правила ті самі, що поїдуть на бекенд.
 */
const STORAGE_KEY = 'orenza.objects'
const CLIENTS_KEY = 'orenza.clients'
const DRAFT_KEY = 'orenza.objects.draft'

function readList<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key)

    return raw === null ? fallback : (JSON.parse(raw) as T[])
  } catch {
    return fallback
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Приватний режим або переповнене сховище — дані просто не переживуть
    // перезавантаження, показувати помилку за це не варто.
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const useObjectsStore = defineStore('objects', () => {
  const progress = useProgressStore()
  const workspaces = useWorkspacesStore()

  const items = ref<ConstructionObject[]>(readList<ConstructionObject>(STORAGE_KEY, []))
  const clients = ref<Client[]>([])

  const isLoadingClients = ref(true)
  const isSaving = ref(false)
  const error = ref<string | null>(null)

  const count = computed(() => items.value.length)

  function reset(): void {
    error.value = null
  }

  function findClient(id: number | null): Client | null {
    return id === null ? null : (clients.value.find((client) => client.id === id) ?? null)
  }

  async function fetchClients(): Promise<void> {
    isLoadingClients.value = true

    try {
      // TODO: GET /api/v1/workspaces/{id}/clients
      await progress.track(delay(420))

      const stored = readList<Client>(CLIENTS_KEY, [])

      clients.value = [...DEMO_CLIENTS, ...stored]
    } finally {
      // Навіть якщо запит впаде, селект не має лишитись у скелетоні назавжди.
      isLoadingClients.value = false
    }
  }

  /** Замовника можна завести прямо з форми обʼєкта — щоб не кидати введене. */
  function addClient(name: string): Client {
    const client: Client = {
      id: Math.max(100, ...clients.value.map((item) => item.id)) + 1,
      name: name.trim(),
      contact: 'Створено з картки обʼєкта',
      phone: '',
    }

    clients.value = [...clients.value, client]
    write(
      CLIENTS_KEY,
      clients.value.filter((item) => !DEMO_CLIENTS.some((demo) => demo.id === item.id)),
    )

    return client
  }

  /** Позиція матеріалу у вигляді, у якому її поверне бекенд. */
  function toMaterial(payload: MaterialPayload, index: number): Material {
    return {
      id: index + 1,
      name: payload.name,
      unit: payload.unit,
      quantity: payload.quantity,
      buyer: { value: payload.buyer, label: MATERIAL_BUYER_LABELS[payload.buyer] },
      cost_price: payload.cost_price ?? null,
      client_price: payload.client_price ?? null,
      status: { value: payload.status, label: MATERIAL_STATUS_LABELS[payload.status] },
      approved_by_client: payload.approved_by_client,
    }
  }

  /** Послуга у вигляді, у якому її поверне бекенд. */
  function toService(payload: ServicePayload, index: number): Service {
    return {
      id: index + 1,
      name: payload.name,
      description: payload.description ?? null,
      unit: payload.unit,
      planned_volume: payload.planned_volume,
      actual_volume: payload.actual_volume ?? null,
      client_price: payload.client_price ?? null,
      status: { value: payload.status, label: SERVICE_STATUS_LABELS[payload.status] },
      workers: payload.workers ?? [],
    }
  }

  /** Платіж у вигляді, у якому його поверне бекенд. */
  function toPayment(payload: PaymentPayload, index: number): Payment {
    return {
      id: index + 1,
      name: payload.name,
      description: payload.description ?? null,
      amount: payload.amount,
      status: { value: payload.status, label: PAYMENT_STATUS_LABELS[payload.status] },
      paid_at: payload.paid_at ?? null,
    }
  }

  async function create(form: ObjectForm): Promise<ConstructionObject | null> {
    const payload = buildObjectPayload(form)

    isSaving.value = true
    error.value = null

    try {
      // TODO: POST /api/v1/workspaces/{id}/objects
      await progress.track(delay(760))
    } finally {
      isSaving.value = false
    }

    const workspaceId = workspaces.current?.id ?? null

    if (workspaceId === null) {
      error.value = 'Спочатку оберіть робочий простір.'

      return null
    }

    const object: ConstructionObject = {
      id: Math.max(0, ...items.value.map((item) => item.id)) + 1,
      workspace_id: workspaceId,
      name: payload.name,
      description: payload.description ?? null,
      address: payload.address,
      client: findClient(form.clientId),
      status: { value: payload.status, label: OBJECT_STATUS_LABELS[payload.status] },
      started_at: payload.started_at ?? null,
      finished_at: payload.finished_at ?? null,
      actual_started_at: payload.actual_started_at ?? null,
      actual_finished_at: payload.actual_finished_at ?? null,
      cover: payload.cover ?? null,
      materials: (payload.materials ?? []).map(toMaterial),
      services: (payload.services ?? []).map(toService),
      payments: (payload.payments ?? []).map(toPayment),
      created_at: new Date().toISOString(),
    }

    items.value = [...items.value, object]

    // Обкладинки — data-URL на кілька мегабайтів; у сховищі тримати їх немає
    // сенсу, тож локальний список зберігаємо без них.
    write(
      STORAGE_KEY,
      items.value.map((item) => ({ ...item, cover: null })),
    )
    clearDraft()

    return object
  }

  /* ── Чернетка форми ──────────────────────────────────────────── */

  function readDraft(): ObjectForm | null {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)

      if (raw === null) {
        return null
      }

      // Ключі беремо з порожньої форми: старі чернетки не мають ламати екран.
      const draft = { ...emptyObjectForm(), ...(JSON.parse(raw) as Partial<ObjectForm>) }

      // Виконавці колись були вписаним текстом, тепер — вибором зі списку,
      // а фінансового блоку в старих чернетках не було взагалі.
      return {
        ...draft,
        services: draft.services.map((service) => ({
          ...service,
          workers: (service.workers ?? []).map(normalizeServiceWorker),
        })),
        payments: (draft.payments ?? []).map(normalizePayment),
      }
    } catch {
      return null
    }
  }

  /** Обкладинку в чернетку не кладемо — вона не влізе в квоту localStorage. */
  function saveDraft(form: ObjectForm): void {
    write(DRAFT_KEY, { ...form, cover: null })
  }

  function clearDraft(): void {
    try {
      localStorage.removeItem(DRAFT_KEY)
    } catch {
      // див. write()
    }
  }

  return {
    items,
    clients,
    count,
    isLoadingClients,
    isSaving,
    error,
    reset,
    findClient,
    fetchClients,
    addClient,
    create,
    readDraft,
    saveDraft,
    clearDraft,
  }
})
