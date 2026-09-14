import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import { usePhotosStore } from './photos'
import { useProgressStore } from './progress'
import { useWorkspacesStore } from './workspaces'
import type { Material, MaterialPayload, MaterialStatus } from '@/lib/materials'
import {
  normalizeDiscount,
  normalizePayment,
  type Payment,
  type PaymentPayload,
  type PaymentStatus,
} from '@/lib/finance'
import {
  normalizeServiceWorker,
  type Service,
  type ServicePayload,
  type ServiceStatus,
  type ServiceWorkerPayload,
} from '@/lib/services'
import {
  buildObjectCorePayload,
  emptyObjectForm,
  normalizeClient,
  OBJECT_STATUS_LABELS,
  todayIso,
  type Client,
  type ConstructionObject,
  type ObjectCore,
  type ObjectDateField,
  type ObjectForm,
  type ObjectStatus,
} from '@/lib/objects'
import { buildClientPayload, type ClientForm } from '@/lib/clients'
import { CENTER_FOCUS, clampFocus, type CoverFocus } from '@/lib/cover'
import { objectDraftKey } from '@/lib/drafts'
import { api, ApiError, upload } from '@/lib/http'

const VIEW_KEY = 'orenza.objects.view'

function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))

    return true
  } catch {
    return false
  }
}

/** Таблиця чи картки — вибір людини, тож переживає перезавантаження. */
export type ObjectsView = 'table' | 'cards'

function readView(): ObjectsView {
  try {
    return localStorage.getItem(VIEW_KEY) === 'cards' ? 'cards' : 'table'
  } catch {
    return 'table'
  }
}

function merged(current: Material[], updated: Material[]): Material[] {
  const byId = new Map(updated.map((item) => [item.id, item]))

  return current.map((item) => byId.get(item.id) ?? item)
}

export const useObjectsStore = defineStore('objects', () => {
  const progress = useProgressStore()
  const workspaces = useWorkspacesStore()
  const auth = useAuthStore()

  const links = ref<Record<number, number | null>>({})

  for (const stale of [
    'orenza.clients',
    'orenza.objects',
    'orenza.objects.activity',
    'orenza.objects.extras',
    'orenza.objects.draft',
  ]) {
    try {
      localStorage.removeItem(stale)
    } catch {}
  }

  const items = ref<ConstructionObject[]>([])
  const clients = ref<Client[]>([])

  function resolveClient(id: number | null): Client | null {
    return id === null ? null : (clients.value.find((item) => item.id === id) ?? null)
  }

  function fromApi(core: ObjectCore): ConstructionObject {
    links.value[core.id] = core.client?.id ?? null

    return {
      ...core,
      client: core.client === null ? null : normalizeClient(core.client),
    }
  }

  watch(clients, () => {
    items.value = items.value.map((object) => ({
      ...object,
      client: resolveClient(links.value[object.id] ?? null),
    }))
  })

  const isLoading = ref(true)
  const isOpening = ref(false)
  /** Список бодай раз доїхав: картку обʼєкта відкривають і прямим посиланням. */
  const loaded = ref(false)
  const isLoadingClients = ref(true)
  const isSaving = ref(false)
  const error = ref<string | null>(null)

  const view = ref<ObjectsView>(readView())

  const count = computed(() => items.value.length)

  /** Обʼєкти поточного простору — саме їх показує список. */
  const current = computed(() =>
    items.value.filter((item) => item.workspace_id === workspaces.current?.id),
  )

  function setView(next: ObjectsView): void {
    view.value = next

    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      // див. write()
    }
  }

  function objectsPath(): string | null {
    const slug = workspaces.current?.slug

    return slug === undefined ? null : `/workspaces/${slug}/objects`
  }

  async function load(): Promise<void> {
    const path = objectsPath()

    if (path === null) {
      isLoading.value = false
      loaded.value = true

      return
    }

    isLoading.value = true
    error.value = null

    try {
      const list = await progress.track(api.get<ObjectCore[]>(`${path}?archived=1`))

      items.value = list.map(fromApi)
    } catch (cause) {
      error.value = clientError(cause, 'Не вдалося завантажити обʼєкти.')
    } finally {
      isLoading.value = false
      loaded.value = true
    }
  }

  let pending: Promise<void> | null = null

  function fetchObjects(): Promise<void> {
    pending ??= load().finally(() => {
      pending = null
    })

    return pending
  }

  watch(
    () => workspaces.currentId,
    (id) => {
      items.value = []
      links.value = {}
      clients.value = []
      error.value = null
      loaded.value = false
      isLoadingClients.value = true

      if (id !== null) {
        void fetchObjects()
        void fetchClients()
      }
    },
  )

  function find(id: number): ConstructionObject | null {
    return items.value.find((item) => item.id === id) ?? null
  }

  async function loadObject(id: number): Promise<void> {
    const path = objectsPath()

    if (path === null) {
      return
    }

    const cold = find(id) === null

    isOpening.value = cold
    error.value = null

    try {
      const core = await progress.track(api.get<ObjectCore>(`${path}/${id}`))

      if (objectsPath() !== path) {
        return
      }

      const object = fromApi(core)

      items.value =
        find(id) === null
          ? [...items.value, object]
          : items.value.map((item) => (item.id === id ? object : item))
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404) {
        items.value = items.value.filter((item) => item.id !== id)
      } else {
        error.value = clientError(cause, 'Не вдалося відкрити обʼєкт.')
      }
    } finally {
      isOpening.value = false
    }
  }

  const opening = new Map<number, Promise<void>>()

  function fetchObject(id: number): Promise<void> {
    const running = opening.get(id)

    if (running !== undefined) {
      return running
    }

    const request = loadObject(id).finally(() => {
      opening.delete(id)
    })

    opening.set(id, request)

    return request
  }

  function patch(id: number, changes: Partial<ConstructionObject>): void {
    items.value = items.value.map((item) => (item.id === id ? { ...item, ...changes } : item))
  }

  function apply(next: ConstructionObject): void {
    items.value = items.value.map((item) => (item.id === next.id ? next : item))
  }

  async function sync(
    id: number,
    changes: Record<string, unknown>,
    fallback: string,
  ): Promise<void> {
    const path = objectsPath()
    const before = find(id)

    if (path === null || before === null) {
      return
    }

    error.value = null

    try {
      const updated = await progress.track(api.patch<ObjectCore>(`${path}/${id}`, changes))

      apply(fromApi(updated))
    } catch (cause) {
      apply(before)
      error.value = clientError(cause, fallback)
    }
  }

  /* ── Точкові правки картки ───────────────────────────────────── */

  async function setStatus(id: number, value: ObjectStatus): Promise<void> {
    const object = find(id)

    if (object === null || object.status.value === value) {
      return
    }

    const changes: Record<string, unknown> = { status: value }
    const today = todayIso()

    if ((value === 'in_progress' || value === 'done') && object.actual_started_at === null) {
      changes.actual_started_at = today
    }

    if (value === 'done' && object.actual_finished_at === null) {
      changes.actual_finished_at = today
    }

    patch(id, { status: { value, label: OBJECT_STATUS_LABELS[value] } })

    await sync(id, changes, 'Не вдалося змінити статус.')
  }

  async function setArchived(id: number, archived: boolean): Promise<void> {
    patch(id, { archived_at: archived ? new Date().toISOString() : null })

    await sync(id, { archived }, 'Не вдалося змінити архів.')
  }

  async function setDescription(id: number, value: string): Promise<void> {
    const object = find(id)
    const next = value.trim() === '' ? null : value.trim()

    if (object === null || object.description === next) {
      return
    }

    patch(id, { description: next })

    await sync(id, { description: next }, 'Не вдалося зберегти опис.')
  }

  async function setDate(id: number, field: ObjectDateField, value: string): Promise<void> {
    const object = find(id)
    const next = value === '' ? null : value

    if (object === null || object[field] === next) {
      return
    }

    patch(id, { [field]: next })

    await sync(id, { [field]: next }, 'Не вдалося зберегти дату.')
  }

  /** Знижку зберігаємо так, як її ввели: відсотком або сумою, не обома. */
  async function setDiscount(
    id: number,
    percent: number | null,
    amount: number | null,
  ): Promise<void> {
    const object = find(id)

    if (
      object === null ||
      (object.discount_percent === percent && object.discount_amount === amount)
    ) {
      return
    }

    patch(id, { discount_percent: percent, discount_amount: amount })

    await sync(
      id,
      { discount_percent: percent, discount_amount: amount },
      'Не вдалося зберегти знижку.',
    )
  }

  /* ── Матеріали обʼєкта ───────────────────────────────────────── */

  function materialsPath(id: number): string | null {
    const path = objectsPath()

    return path === null ? null : `${path}/${id}/materials`
  }

  function applyMaterials(id: number, materials: Material[]): void {
    patch(id, { materials })
  }

  async function addMaterial(id: number, payload: MaterialPayload): Promise<void> {
    const path = materialsPath(id)
    const object = find(id)

    if (path === null || object === null) {
      return
    }

    error.value = null

    try {
      const created = await progress.track(api.post<Material>(path, payload))

      applyMaterials(id, [...object.materials, created])
    } catch (cause) {
      error.value = clientError(cause, 'Не вдалося додати матеріал.')
    }
  }

  /**
   * Статус міняють і поштучно, і цілою фурою — тож приймаємо список. Позиції,
   * які вже стоять у цьому статусі, зміненими не рахуються.
   */
  async function setMaterialStatus(
    id: number,
    materialIds: number[],
    value: MaterialStatus,
  ): Promise<void> {
    const path = materialsPath(id)
    const object = find(id)

    if (path === null || object === null) {
      return
    }

    const changed = object.materials.filter(
      (item) => materialIds.includes(item.id) && item.status.value !== value,
    )

    if (changed.length === 0) {
      return
    }

    error.value = null

    try {
      const updated = await progress.track(
        api.patch<Material[]>(`${path}/status`, { ids: materialIds, status: value }),
      )

      applyMaterials(id, merged(object.materials, updated))
    } catch (cause) {
      error.value = clientError(cause, 'Не вдалося змінити статус матеріалів.')
    }
  }

  /** Погодження замовником — прапорець, який ставлять і знімають на ходу. */
  async function setMaterialApproved(
    id: number,
    materialId: number,
    approved: boolean,
  ): Promise<void> {
    const path = materialsPath(id)
    const object = find(id)

    if (path === null || object === null) {
      return
    }

    error.value = null

    try {
      const updated = await progress.track(
        api.patch<Material>(`${path}/${materialId}`, { approved_by_client: approved }),
      )

      applyMaterials(id, merged(object.materials, [updated]))
    } catch (cause) {
      error.value = clientError(cause, 'Не вдалося зберегти погодження.')
    }
  }

  async function removeMaterial(id: number, materialId: number): Promise<void> {
    const path = materialsPath(id)
    const object = find(id)
    const material = object?.materials.find((item) => item.id === materialId) ?? null

    if (path === null || object === null || material === null) {
      return
    }

    error.value = null

    try {
      await progress.track(api.delete(`${path}/${materialId}`))
    } catch (cause) {
      error.value = clientError(cause, 'Не вдалося прибрати матеріал.')

      return
    }

    applyMaterials(
      id,
      object.materials.filter((item) => item.id !== materialId),
    )
  }

  /* ── Роботи обʼєкта ──────────────────────────────────────────── */

  function servicesPath(id: number): string | null {
    const path = objectsPath()

    return path === null ? null : `${path}/${id}/services`
  }

  function applyServices(id: number, services: Service[]): void {
    patch(id, { services })
  }

  function mergedServices(current: Service[], updated: Service[]): Service[] {
    const byId = new Map(updated.map((item) => [item.id, item]))

    return current.map((item) => byId.get(item.id) ?? item)
  }

  async function addService(id: number, payload: ServicePayload): Promise<void> {
    const path = servicesPath(id)
    const object = find(id)

    if (path === null || object === null) {
      return
    }

    error.value = null

    try {
      const created = await progress.track(api.post<Service>(path, payload))

      applyServices(id, [...object.services, created])
    } catch (cause) {
      error.value = clientError(cause, 'Не вдалося додати роботу.')
    }
  }

  async function patchService(
    id: number,
    serviceId: number,
    changes: Record<string, unknown>,
    fallback: string,
  ): Promise<Service | null> {
    const path = servicesPath(id)
    const object = find(id)

    if (path === null || object === null) {
      return null
    }

    error.value = null

    try {
      const updated = await progress.track(api.patch<Service>(`${path}/${serviceId}`, changes))

      applyServices(id, mergedServices(object.services, [updated]))

      return updated
    } catch (cause) {
      error.value = clientError(cause, fallback)

      return null
    }
  }

  /**
   * Стадію міняють і поштучно, і на цілу бригаду, яка зайшла на обʼєкт, — тож
   * приймаємо список. Роботи, які вже стоять у цій стадії, зміненими не
   * рахуються.
   */
  async function setServiceStatus(
    id: number,
    serviceIds: number[],
    value: ServiceStatus,
  ): Promise<void> {
    const path = servicesPath(id)
    const object = find(id)

    if (path === null || object === null) {
      return
    }

    const changed = object.services.filter(
      (item) => serviceIds.includes(item.id) && item.status.value !== value,
    )

    if (changed.length === 0) {
      return
    }

    error.value = null

    try {
      const updated = await progress.track(
        api.patch<Service[]>(`${path}/status`, { ids: serviceIds, status: value }),
      )

      applyServices(id, mergedServices(object.services, updated))
    } catch (cause) {
      error.value = clientError(cause, 'Не вдалося змінити статус робіт.')
    }
  }

  async function setServiceFact(
    id: number,
    serviceId: number,
    volume: number | null,
  ): Promise<void> {
    const object = find(id)
    const service = object?.services.find((item) => item.id === serviceId) ?? null

    if (service === null || service.actual_volume === volume) {
      return
    }

    await patchService(id, serviceId, { actual_volume: volume }, 'Не вдалося зберегти факт-обсяг.')
  }

  async function setServiceWorkers(
    id: number,
    serviceId: number,
    workers: ServiceWorkerPayload[],
  ): Promise<void> {
    const object = find(id)
    const service = object?.services.find((item) => item.id === serviceId) ?? null

    if (service === null) {
      return
    }

    await patchService(id, serviceId, { workers }, 'Не вдалося зберегти виконавців.')
  }

  async function removeService(id: number, serviceId: number): Promise<void> {
    const path = servicesPath(id)
    const object = find(id)
    const service = object?.services.find((item) => item.id === serviceId) ?? null

    if (path === null || object === null || service === null) {
      return
    }

    error.value = null

    try {
      await progress.track(api.delete(`${path}/${serviceId}`))
    } catch (cause) {
      error.value = clientError(cause, 'Не вдалося прибрати роботу.')

      return
    }

    applyServices(
      id,
      object.services.filter((item) => item.id !== serviceId),
    )
  }

  /* ── Платежі обʼєкта ─────────────────────────────────────────── */

  function paymentsPath(id: number): string | null {
    const path = objectsPath()

    return path === null ? null : `${path}/${id}/payments`
  }

  async function addPayment(id: number, payload: PaymentPayload): Promise<void> {
    const path = paymentsPath(id)
    const object = find(id)

    if (path === null || object === null) {
      return
    }

    error.value = null

    try {
      const created = await progress.track(api.post<Payment>(path, payload))

      patch(id, { payments: [...object.payments, created] })
    } catch (cause) {
      error.value = clientError(cause, 'Не вдалося додати платіж.')
    }
  }

  async function savePayment(
    id: number,
    paymentId: number,
    changes: Record<string, unknown>,
    fallback: string,
  ): Promise<Payment | null> {
    const path = paymentsPath(id)
    const object = find(id)

    if (path === null || object === null) {
      return null
    }

    error.value = null

    try {
      const updated = await progress.track(api.patch<Payment>(`${path}/${paymentId}`, changes))

      patch(id, {
        payments: object.payments.map((item) => (item.id === paymentId ? updated : item)),
      })

      return updated
    } catch (cause) {
      error.value = clientError(cause, fallback)

      return null
    }
  }

  /**
   * Правка платежу: сума з датою й коментар. Помилку в них помічають уже
   * після збереження — і виправити її має бути дешевше, ніж завести платіж
   * наново. Опис, який колись прийшов із форми створення обʼєкта, лишаємо як
   * є: тут його не показують, тож і затирати його порожнім значенням нема за
   * чим.
   */
  async function updatePayment(
    id: number,
    paymentId: number,
    payload: PaymentPayload,
  ): Promise<void> {
    const object = find(id)
    const before = object?.payments.find((item) => item.id === paymentId) ?? null

    if (before === null) {
      return
    }

    await savePayment(id, paymentId, { ...payload }, 'Не вдалося зберегти платіж.')
  }

  /** Гроші прийшли — платіж із очікуваного стає отриманим, і навпаки. */
  async function setPaymentStatus(
    id: number,
    paymentId: number,
    value: PaymentStatus,
    date?: string,
  ): Promise<void> {
    const object = find(id)
    const payment = object?.payments.find((item) => item.id === paymentId) ?? null

    if (payment === null || payment.status.value === value) {
      return
    }

    const changes: Record<string, unknown> = { status: value }

    if (value === 'paid' && payment.paid_at === null && date !== undefined) {
      changes.paid_at = date
    }

    await savePayment(id, paymentId, changes, 'Не вдалося змінити статус платежу.')
  }

  async function removePayment(id: number, paymentId: number): Promise<void> {
    const path = paymentsPath(id)
    const object = find(id)
    const payment = object?.payments.find((item) => item.id === paymentId) ?? null

    if (path === null || object === null || payment === null) {
      return
    }

    error.value = null

    try {
      await progress.track(api.delete(`${path}/${paymentId}`))
    } catch (cause) {
      error.value = clientError(cause, 'Не вдалося прибрати платіж.')

      return
    }

    patch(id, { payments: object.payments.filter((item) => item.id !== paymentId) })
  }

  async function remove(id: number): Promise<boolean> {
    const path = objectsPath()

    if (path === null) {
      return false
    }

    error.value = null

    try {
      await progress.track(api.delete(`${path}/${id}`))
    } catch (cause) {
      error.value = clientError(cause, 'Не вдалося видалити обʼєкт.')

      return false
    }

    items.value = items.value.filter((item) => item.id !== id)
    usePhotosStore().forget(id)

    return true
  }

  /* ── Обкладинка ───────────────────────────────────────────────── */

  const coverProgress = ref<number | null>(null)
  const coverError = ref<string | null>(null)
  const isSavingCover = ref(false)

  function coverPath(id: number): string | null {
    const path = objectsPath()

    return path === null ? null : `${path}/${id}/cover`
  }

  function applyCover(core: ObjectCore): void {
    const object = fromApi(core)

    items.value = items.value.map((item) => (item.id === object.id ? object : item))
  }

  async function uploadCover(
    id: number,
    file: File,
    focus: CoverFocus = CENTER_FOCUS,
  ): Promise<boolean> {
    const path = coverPath(id)

    if (path === null) {
      return false
    }

    const { x, y } = clampFocus(focus)
    const form = new FormData()

    form.append('cover', file)
    form.append('focus_x', String(x))
    form.append('focus_y', String(y))

    coverError.value = null
    coverProgress.value = 0
    isSavingCover.value = true

    try {
      const updated = await progress.track(
        upload<ObjectCore>(path, form, {
          onProgress: (fraction) => {
            coverProgress.value = fraction
          },
        }),
      )

      applyCover(updated)

      return true
    } catch (cause) {
      coverError.value =
        cause instanceof ApiError
          ? (cause.fieldError('cover') ?? cause.message)
          : 'Не вдалося завантажити обкладинку.'

      return false
    } finally {
      coverProgress.value = null
      isSavingCover.value = false
    }
  }

  async function setCoverFocus(id: number, focus: CoverFocus): Promise<boolean> {
    const path = coverPath(id)
    const object = find(id)

    if (path === null || object === null || object.cover === null) {
      return false
    }

    const next = clampFocus(focus)

    coverError.value = null
    isSavingCover.value = true

    try {
      const updated = await progress.track(
        api.patch<ObjectCore>(path, { focus_x: next.x, focus_y: next.y }),
      )

      applyCover(updated)

      return true
    } catch (cause) {
      coverError.value = clientError(cause, 'Не вдалося зберегти кадрування.')

      return false
    } finally {
      isSavingCover.value = false
    }
  }

  async function removeCover(id: number): Promise<boolean> {
    const path = coverPath(id)

    if (path === null) {
      return false
    }

    coverError.value = null
    isSavingCover.value = true

    try {
      applyCover(await progress.track(api.delete<ObjectCore>(path)))

      return true
    } catch (cause) {
      coverError.value = clientError(cause, 'Не вдалося прибрати обкладинку.')

      return false
    } finally {
      isSavingCover.value = false
    }
  }

  function resetCoverError(): void {
    coverError.value = null
  }

  function reset(): void {
    error.value = null
  }

  function findClient(id: number | null): Client | null {
    return id === null ? null : (clients.value.find((client) => client.id === id) ?? null)
  }

  function clientsPath(): string | null {
    const slug = workspaces.current?.slug

    return slug === undefined ? null : `/workspaces/${slug}/clients`
  }

  function clientError(cause: unknown, fallback: string): string {
    return cause instanceof ApiError ? cause.message : fallback
  }

  async function fetchClients(): Promise<void> {
    const path = clientsPath()

    if (path === null) {
      isLoadingClients.value = false

      return
    }

    isLoadingClients.value = true

    try {
      const list = await progress.track(api.get<Client[]>(path))

      clients.value = list.map(normalizeClient)
    } catch (cause) {
      error.value = clientError(cause, 'Не вдалося завантажити замовників.')
    } finally {
      isLoadingClients.value = false
    }
  }

  async function createClient(form: ClientForm): Promise<Client | null> {
    const path = clientsPath()

    if (path === null) {
      return null
    }

    isSaving.value = true
    error.value = null

    try {
      const created = await progress.track(api.post<Client>(path, buildClientPayload(form)))
      const client = normalizeClient(created)

      clients.value = [...clients.value, client]

      return client
    } catch (cause) {
      error.value = clientError(cause, 'Не вдалося зберегти замовника.')

      return null
    } finally {
      isSaving.value = false
    }
  }

  function applyClient(next: Client): void {
    clients.value = clients.value.map((item) => (item.id === next.id ? next : item))
  }

  async function patchClient(id: number, changes: Record<string, unknown>): Promise<void> {
    const path = clientsPath()
    const client = findClient(id)

    if (path === null || client === null) {
      return
    }

    error.value = null

    try {
      const updated = await progress.track(api.patch<Client>(`${path}/${id}`, changes))

      applyClient(normalizeClient(updated))
    } catch (cause) {
      error.value = clientError(cause, 'Не вдалося зберегти зміни.')
    }
  }

  async function updateClient(id: number, form: ClientForm): Promise<void> {
    await patchClient(id, { ...buildClientPayload(form) })
  }

  async function setClientNotes(id: number, notes: string): Promise<void> {
    await patchClient(id, { notes: notes.trim() })
  }

  async function setClientDiscount(id: number, discount: number): Promise<void> {
    await patchClient(id, { discount })
  }

  async function deleteClient(id: number): Promise<boolean> {
    const path = clientsPath()

    if (path === null) {
      return false
    }

    error.value = null

    try {
      await progress.track(api.delete(`${path}/${id}`))

      clients.value = clients.value.filter((item) => item.id !== id)

      return true
    } catch (cause) {
      error.value = clientError(cause, 'Не вдалося видалити замовника.')

      return false
    }
  }

  async function create(form: ObjectForm): Promise<ConstructionObject | null> {
    const path = objectsPath()

    if (path === null) {
      error.value = 'Спочатку оберіть робочий простір.'

      return null
    }

    isSaving.value = true
    error.value = null

    try {
      const created = await progress.track(api.post<ObjectCore>(path, buildObjectCorePayload(form)))

      items.value = [...items.value, fromApi(created)]

      clearDraft()

      if (form.cover !== null) {
        const uploaded = await uploadCover(created.id, form.cover.file, form.cover.focus)

        if (!uploaded) {
          error.value = `Обʼєкт створено, але обкладинку не завантажено: ${coverError.value ?? 'спробуйте ще раз з картки обʼєкта.'}`
        }
      }

      return find(created.id)
    } catch (cause) {
      error.value = clientError(cause, 'Не вдалося створити обʼєкт.')

      return null
    } finally {
      isSaving.value = false
    }
  }

  /* ── Чернетка форми ──────────────────────────────────────────── */

  function draftKey(): string | null {
    return objectDraftKey(auth.user?.id, workspaces.currentId)
  }

  function readDraft(): ObjectForm | null {
    const key = draftKey()

    if (key === null) {
      return null
    }

    try {
      const raw = localStorage.getItem(key)

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
        discount: normalizeDiscount(draft.discount),
        payments: (draft.payments ?? []).map(normalizePayment),
      }
    } catch {
      return null
    }
  }

  function saveDraft(form: ObjectForm): void {
    const key = draftKey()

    if (key !== null) {
      write(key, { ...form, cover: null })
    }
  }

  function clearDraft(): void {
    const key = draftKey()

    if (key === null) {
      return
    }

    try {
      localStorage.removeItem(key)
    } catch {
      return
    }
  }

  return {
    items,
    current,
    clients,
    count,
    view,
    isLoading,
    isOpening,
    isLoadingClients,
    isSaving,
    error,
    loaded,
    reset,
    setView,
    fetchObjects,
    fetchObject,
    find,
    setStatus,
    setArchived,
    setDescription,
    setDate,
    setDiscount,
    addMaterial,
    setMaterialStatus,
    setMaterialApproved,
    removeMaterial,
    addService,
    setServiceStatus,
    setServiceFact,
    setServiceWorkers,
    removeService,
    addPayment,
    updatePayment,
    setPaymentStatus,
    removePayment,
    remove,
    coverProgress,
    coverError,
    isSavingCover,
    uploadCover,
    setCoverFocus,
    removeCover,
    resetCoverError,
    findClient,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
    setClientNotes,
    setClientDiscount,
    create,
    readDraft,
    saveDraft,
    clearDraft,
  }
})
