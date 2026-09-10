import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useProgressStore } from './progress'
import { useWorkspacesStore } from './workspaces'
import { formatAmount } from '@/lib/amount'
import {
  formatPositions,
  MATERIAL_STATUS_LABELS,
  type Material,
  type MaterialPayload,
  type MaterialStatus,
} from '@/lib/materials'
import {
  normalizeDiscount,
  normalizePayment,
  PAYMENT_STATUS_LABELS,
  type Payment,
  type PaymentPayload,
  type PaymentStatus,
} from '@/lib/finance'
import {
  formatWorks,
  normalizeServiceWorker,
  SERVICE_STATUS_LABELS,
  type Service,
  type ServicePayload,
  type ServiceStatus,
  type ServiceWorkerPayload,
} from '@/lib/services'
import {
  buildObjectCorePayload,
  buildObjectPayload,
  emptyObjectForm,
  formatDay,
  formatDiscount,
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
import { api, ApiError } from '@/lib/http'
import { transition, type ActivityKind, type ActivityRecord } from '@/lib/activity'
import { photosOf, type ObjectPhoto } from '@/lib/photos'

const EXTRAS_KEY = 'orenza.objects.extras'
const DRAFT_KEY = 'orenza.objects.draft'
const VIEW_KEY = 'orenza.objects.view'
const ACTIVITY_KEY = 'orenza.objects.activity'
const PHOTOS_KEY = 'orenza.objects.photos'

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function readList<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = readStorage(key)

    return raw === null ? fallback : (JSON.parse(raw) as T[])
  } catch {
    return fallback
  }
}

/** false — записати не вдалося: приватний режим або переповнена квота. */
function write(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))

    return true
  } catch {
    // Дані просто не переживуть перезавантаження. Для більшості записів це не
    // варте окремої помилки — виняток лише фото, там про це кажемо вголос.
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

interface ObjectExtras {
  cover: string | null
}

function emptyExtras(): ObjectExtras {
  return { cover: null }
}

function merged(current: Material[], updated: Material[]): Material[] {
  const byId = new Map(updated.map((item) => [item.id, item]))

  return current.map((item) => byId.get(item.id) ?? item)
}

export const useObjectsStore = defineStore('objects', () => {
  const progress = useProgressStore()
  const workspaces = useWorkspacesStore()

  const links = ref<Record<number, number | null>>({})

  for (const stale of ['orenza.clients', 'orenza.objects']) {
    try {
      localStorage.removeItem(stale)
    } catch {}
  }

  const extras = ref<Record<number, ObjectExtras>>(readExtras())
  const items = ref<ConstructionObject[]>([])
  const clients = ref<Client[]>([])

  function readExtras(): Record<number, ObjectExtras> {
    return {}
  }

  function extrasOf(id: number): ObjectExtras {
    return extras.value[id] ?? emptyExtras()
  }

  function resolveClient(id: number | null): Client | null {
    return id === null ? null : (clients.value.find((item) => item.id === id) ?? null)
  }

  function fromApi(core: ObjectCore): ConstructionObject {
    links.value[core.id] = core.client?.id ?? null

    return {
      ...core,
      client: core.client === null ? null : normalizeClient(core.client),
      ...extrasOf(core.id),
    }
  }

  watch(clients, () => {
    items.value = items.value.map((object) => ({
      ...object,
      client: resolveClient(links.value[object.id] ?? null),
    }))
  })

  /** Журнал дій — те, чого з самого обʼєкта не відновити. Див. lib/activity. */
  const activity = ref<ActivityRecord[]>(readList<ActivityRecord>(ACTIVITY_KEY, []))
  const photos = ref<ObjectPhoto[]>(readList<ObjectPhoto>(PHOTOS_KEY, []))

  /** Знімки не влізли у сховище — вони живуть лише до перезавантаження. */
  const photosVolatile = ref(false)

  const isLoading = ref(true)
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

  function persist(): void {
    const map: Record<number, Omit<ObjectExtras, 'cover'>> = {}

    for (const item of items.value) {
      const kept = {
        discount_percent: item.discount_percent,
        discount_amount: item.discount_amount,
        payments: item.payments,
      }

      map[item.id] = kept
      extras.value[item.id] = { cover: item.cover, ...kept }
    }

    write(EXTRAS_KEY, map)
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

  /**
   * Публічна сторінка знаходить обʼєкт лише за токеном: id туди не потрапляє
   * взагалі, тож і перебирати нічого.
   */
  function findByToken(token: string): ConstructionObject | null {
    return items.value.find((item) => item.public_token === token) ?? null
  }

  async function fetchTrack(): Promise<void> {
    isLoading.value = false
    loaded.value = true
  }

  function patch(id: number, changes: Partial<ConstructionObject>): void {
    items.value = items.value.map((item) => (item.id === id ? { ...item, ...changes } : item))
    persist()
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

  /* ── Стрічка подій ───────────────────────────────────────────── */

  function nextId(rows: { id: number }[]): number {
    return Math.max(0, ...rows.map((row) => row.id)) + 1
  }

  /** Запис у журнал. Автоподії сюди не пишемо — вони виводяться з обʼєкта. */
  function log(
    objectId: number,
    kind: ActivityKind,
    text: string,
    detail: string | null = null,
  ): void {
    activity.value = [
      ...activity.value,
      {
        id: nextId(activity.value),
        object_id: objectId,
        kind,
        text,
        detail,
        at: new Date().toISOString(),
      },
    ]

    write(ACTIVITY_KEY, activity.value)
  }

  function activityOf(id: number): ActivityRecord[] {
    return activity.value.filter((record) => record.object_id === id)
  }

  function addNote(id: number, text: string): void {
    const note = text.trim()

    if (note !== '') {
      log(id, 'note', note)
    }
  }

  function removeRecord(recordId: number): void {
    activity.value = activity.value.filter((record) => record.id !== recordId)
    write(ACTIVITY_KEY, activity.value)
  }

  /* ── Фото ────────────────────────────────────────────────────── */

  function objectPhotos(id: number): ObjectPhoto[] {
    return photosOf(photos.value, id)
  }

  function persistPhotos(): void {
    photosVolatile.value = !write(PHOTOS_KEY, photos.value)
  }

  function addPhoto(id: number, src: string, name: string): void {
    photos.value = [
      ...photos.value,
      { id: nextId(photos.value), object_id: id, src, name, at: new Date().toISOString() },
    ]

    persistPhotos()
  }

  function removePhoto(photoId: number): void {
    photos.value = photos.value.filter((photo) => photo.id !== photoId)
    persistPhotos()
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
    log(
      id,
      'status',
      'Змінено статус',
      transition(object.status.label, OBJECT_STATUS_LABELS[value]),
    )

    await sync(id, changes, 'Не вдалося змінити статус.')
  }

  async function setArchived(id: number, archived: boolean): Promise<void> {
    patch(id, { archived_at: archived ? new Date().toISOString() : null })
    log(id, 'object', archived ? 'Обʼєкт в архіві' : 'Обʼєкт повернуто з архіву')

    await sync(id, { archived }, 'Не вдалося змінити архів.')
  }

  async function setDescription(id: number, value: string): Promise<void> {
    const object = find(id)
    const next = value.trim() === '' ? null : value.trim()

    if (object === null || object.description === next) {
      return
    }

    patch(id, { description: next })
    log(id, 'object', next === null ? 'Опис прибрано' : 'Оновлено опис')

    await sync(id, { description: next }, 'Не вдалося зберегти опис.')
  }

  /**
   * Планові дати — домовленість із замовником, тож їхню зміну фіксуємо
   * окремим записом. Фактичні самі по собі події стрічки: вони приїдуть туди
   * з обʼєкта, і другий запис був би дублем.
   */
  async function setDate(id: number, field: ObjectDateField, value: string): Promise<void> {
    const object = find(id)
    const next = value === '' ? null : value

    if (object === null || object[field] === next) {
      return
    }

    patch(id, { [field]: next })

    if (field === 'started_at' || field === 'finished_at') {
      log(
        id,
        'object',
        field === 'started_at' ? 'Змінено плановий початок' : 'Змінено плановий дедлайн',
        transition(formatDay(object[field] ?? ''), formatDay(next ?? '')),
      )
    }

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
    log(
      id,
      'object',
      'Змінено знижку',
      transition(
        formatDiscount(object.discount_percent, object.discount_amount),
        formatDiscount(percent, amount),
      ),
    )

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

  /**
   * Поява матеріалу в журнал не пишеться: стрічка виводить її з самого
   * обʼєкта (див. lib/activity). А от рух по стадіях і зникнення позиції з
   * даних не відновити — їх фіксуємо.
   */
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
   * які вже стоять у цьому статусі, не рахуються зміненими: вони не мають
   * потрапляти ні в стрічку, ні в підпис «оновлено N позицій».
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

      return
    }

    const label = MATERIAL_STATUS_LABELS[value]

    // Одна позиція — видно, звідки й куди вона пішла; десяток з однієї
    // поставки йде одним записом, інакше стрічка стає журналом складу.
    const single = changed.length === 1 ? changed[0] : undefined

    log(
      id,
      'material',
      single === undefined ? 'Оновлено статуси матеріалів' : 'Змінено статус матеріалу',
      single === undefined
        ? `${formatPositions(changed.length)} → ${label}`
        : `${single.name}: ${transition(single.status.label, label)}`,
    )
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
    log(
      id,
      'material',
      'Прибрано матеріал',
      `${material.name}, ${formatAmount(material.quantity)} ${material.unit}`,
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

  /**
   * Поява роботи в журнал не пишеться — стрічка виводить її з обʼєкта. А от
   * рух по стадіях, факт-обсяг і склад бригади не відновити з даних, тож їх
   * фіксуємо окремими записами.
   */
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
   * рахуються: вони не мають потрапляти ні в стрічку, ні в підпис.
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

      return
    }

    const label = SERVICE_STATUS_LABELS[value]
    const single = changed.length === 1 ? changed[0] : undefined

    log(
      id,
      'service',
      single === undefined ? 'Оновлено статуси робіт' : 'Змінено статус роботи',
      single === undefined
        ? `${formatWorks(changed.length)} → ${label}`
        : `${single.name}: ${transition(single.status.label, label)}`,
    )
  }

  /** Факт-обсяг — те, за чим рахують гроші: його поява варта запису. */
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

    const saved = await patchService(
      id,
      serviceId,
      { actual_volume: volume },
      'Не вдалося зберегти факт-обсяг.',
    )

    if (saved === null) {
      return
    }

    log(
      id,
      'service',
      volume === null ? 'Прибрано факт-обсяг' : 'Внесено факт-обсяг',
      volume === null
        ? service.name
        : `${service.name}: ${formatAmount(volume)} ${service.unit} з ${formatAmount(service.planned_volume)}`,
    )
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

    const saved = await patchService(id, serviceId, { workers }, 'Не вдалося зберегти виконавців.')

    if (saved === null) {
      return
    }

    const wage = workers.reduce((sum, worker) => sum + worker.volume * worker.rate, 0)

    log(
      id,
      'service',
      workers.length === 0 ? 'Знято виконавців' : 'Оновлено виконавців',
      workers.length === 0
        ? service.name
        : `${service.name}: ${workers.length} чол., ЗП ${formatAmount(wage)} ₴`,
    )
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
    log(
      id,
      'service',
      'Прибрано роботу',
      `${service.name}, ${formatAmount(service.planned_volume)} ${service.unit}`,
    )
  }

  /* ── Платежі обʼєкта ─────────────────────────────────────────── */

  function paymentsPath(id: number): string | null {
    const path = objectsPath()

    return path === null ? null : `${path}/${id}/payments`
  }

  /**
   * Гроші замовника: і те, що вже прийшло, і те, чого ще чекаємо. Кожен рух
   * тут — подія, за якою потім звіряються, тож у стрічку йде все.
   */
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
      log(
        id,
        'payment',
        created.status.value === 'paid' ? 'Отримано платіж' : 'Заплановано платіж',
        `${formatAmount(created.amount)} ₴${created.paid_at === null ? '' : `, ${formatDay(created.paid_at)}`}`,
      )
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

    const after = await savePayment(id, paymentId, { ...payload }, 'Не вдалося зберегти платіж.')

    if (after === null) {
      return
    }

    // У стрічку йде та зміна, заради якої платіж і відкривали: спочатку
    // гроші, потім стан, і лише потім — підпис.
    if (before.amount !== after.amount) {
      log(
        id,
        'payment',
        'Виправлено суму платежу',
        transition(`${formatAmount(before.amount)} ₴`, `${formatAmount(after.amount)} ₴`),
      )

      return
    }

    if (before.status.value !== after.status.value) {
      log(
        id,
        'payment',
        'Змінено статус платежу',
        `${formatAmount(after.amount)} ₴: ${transition(before.status.label, after.status.label)}`,
      )

      return
    }

    log(id, 'payment', 'Виправлено платіж', `${formatAmount(after.amount)} ₴, ${after.name}`)
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

    const saved = await savePayment(id, paymentId, changes, 'Не вдалося змінити статус платежу.')

    if (saved === null) {
      return
    }

    log(
      id,
      'payment',
      value === 'paid' ? 'Отримано платіж' : 'Змінено статус платежу',
      `${formatAmount(payment.amount)} ₴: ${transition(payment.status.label, PAYMENT_STATUS_LABELS[value])}`,
    )
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
    log(id, 'payment', 'Прибрано платіж', `${formatAmount(payment.amount)} ₴`)
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

    // Разом з обʼєктом їде і все, що до нього кріпилось.
    delete extras.value[id]
    activity.value = activity.value.filter((record) => record.object_id !== id)
    photos.value = photos.value.filter((photo) => photo.object_id !== id)

    persist()
    write(ACTIVITY_KEY, activity.value)
    write(PHOTOS_KEY, photos.value)

    return true
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

      const payload = buildObjectPayload(form)

      extras.value[created.id] = { cover: payload.cover ?? null }

      const object = fromApi(created)

      items.value = [...items.value, object]

      persist()
      clearDraft()

      return object
    } catch (cause) {
      error.value = clientError(cause, 'Не вдалося створити обʼєкт.')

      return null
    } finally {
      isSaving.value = false
    }
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
        discount: normalizeDiscount(draft.discount),
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
    current,
    clients,
    count,
    view,
    isLoading,
    isLoadingClients,
    isSaving,
    error,
    loaded,
    reset,
    setView,
    fetchObjects,
    fetchTrack,
    find,
    findByToken,
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
    photosVolatile,
    activityOf,
    addNote,
    removeRecord,
    objectPhotos,
    addPhoto,
    removePhoto,
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
