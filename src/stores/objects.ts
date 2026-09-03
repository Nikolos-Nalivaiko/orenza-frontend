import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useProgressStore } from './progress'
import { useWorkspacesStore } from './workspaces'
import { formatAmount } from '@/lib/amount'
import {
  formatPositions,
  MATERIAL_BUYER_LABELS,
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
  buildObjectPayload,
  DEMO_CLIENTS,
  demoObjects,
  emptyObjectForm,
  formatDay,
  formatDiscount,
  isDemoObject,
  OBJECT_STATUS_LABELS,
  type Client,
  type ConstructionObject,
  type ObjectDateField,
  type ObjectForm,
  type ObjectStatus,
} from '@/lib/objects'
import { transition, type ActivityKind, type ActivityRecord } from '@/lib/activity'
import { photosOf, type ObjectPhoto } from '@/lib/photos'

/**
 * Поки ендпоінтів обʼєктів немає, створене живе в localStorage — структура
 * записів і правила ті самі, що поїдуть на бекенд.
 */
const STORAGE_KEY = 'orenza.objects'
const CLIENTS_KEY = 'orenza.clients'
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

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

export const useObjectsStore = defineStore('objects', () => {
  const progress = useProgressStore()
  const workspaces = useWorkspacesStore()

  const items = ref<ConstructionObject[]>(readList<ConstructionObject>(STORAGE_KEY, []))
  const clients = ref<Client[]>([])

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

  /**
   * Обкладинки — data-URL на кілька мегабайтів; у сховищі тримати їх немає
   * сенсу, тож локальний список зберігаємо без них.
   */
  function persist(): void {
    write(
      STORAGE_KEY,
      items.value.map((item) => ({ ...item, cover: null })),
    )
  }

  /** Стільки ж, скільки й у решті сторів: запит буде тут, дані — уже в формі. */
  async function fetchObjects(): Promise<void> {
    isLoading.value = true

    try {
      // TODO: GET /api/v1/workspaces/{id}/objects
      await progress.track(delay(460))

      const raw = readStorage(STORAGE_KEY)
      const workspaceId = workspaces.current?.id ?? null

      // Демообʼєкти сіються один раз — далі вони звичайні записи, які можна
      // редагувати, архівувати й видаляти, як і власні.
      if (raw === null && workspaceId !== null) {
        items.value = demoObjects(workspaceId)
        persist()

        return
      }

      items.value = readList<ConstructionObject>(STORAGE_KEY, [])
    } finally {
      isLoading.value = false
      loaded.value = true
    }
  }

  function find(id: number): ConstructionObject | null {
    return items.value.find((item) => item.id === id) ?? null
  }

  /** Точкова правка обʼєкта зі списку: статус, готовність, архів. */
  function patch(id: number, changes: Partial<ConstructionObject>): void {
    items.value = items.value.map((item) => (item.id === id ? { ...item, ...changes } : item))
    persist()
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

  function setStatus(id: number, value: ObjectStatus): void {
    const object = find(id)

    patch(id, { status: { value, label: OBJECT_STATUS_LABELS[value] } })

    if (object !== null && object.status.value !== value) {
      log(
        id,
        'status',
        'Змінено статус',
        transition(object.status.label, OBJECT_STATUS_LABELS[value]),
      )
    }
  }

  function setArchived(id: number, archived: boolean): void {
    patch(id, { archived_at: archived ? new Date().toISOString() : null })
    log(id, 'object', archived ? 'Обʼєкт в архіві' : 'Обʼєкт повернуто з архіву')
  }

  function setDescription(id: number, value: string): void {
    const object = find(id)
    const next = value.trim() === '' ? null : value.trim()

    if (object === null || object.description === next) {
      return
    }

    patch(id, { description: next })
    log(id, 'object', next === null ? 'Опис прибрано' : 'Оновлено опис')
  }

  /**
   * Планові дати — домовленість із замовником, тож їхню зміну фіксуємо
   * окремим записом. Фактичні самі по собі події стрічки: вони приїдуть туди
   * з обʼєкта, і другий запис був би дублем.
   */
  function setDate(id: number, field: ObjectDateField, value: string): void {
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
  }

  /** Знижку зберігаємо так, як її ввели: відсотком або сумою, не обома. */
  function setDiscount(id: number, percent: number | null, amount: number | null): void {
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
  }

  /* ── Матеріали обʼєкта ───────────────────────────────────────── */

  /**
   * Поява матеріалу в журнал не пишеться: стрічка виводить її з самого
   * обʼєкта (див. lib/activity). А от рух по стадіях і зникнення позиції з
   * даних не відновити — їх фіксуємо.
   */
  function addMaterial(id: number, payload: MaterialPayload): void {
    const object = find(id)

    if (object === null) {
      return
    }

    patch(id, { materials: [...object.materials, toMaterial(payload, nextId(object.materials))] })
  }

  /** Спільна правка позицій; поштучна зміна — той самий шлях зі списку з одного. */
  function updateMaterials(
    id: number,
    materialIds: number[],
    change: (material: Material) => Material,
  ): void {
    const object = find(id)

    if (object === null) {
      return
    }

    patch(id, {
      materials: object.materials.map((item) =>
        materialIds.includes(item.id) ? change(item) : item,
      ),
    })
  }

  /**
   * Статус міняють і поштучно, і цілою фурою — тож приймаємо список. Позиції,
   * які вже стоять у цьому статусі, не рахуються зміненими: вони не мають
   * потрапляти ні в стрічку, ні в підпис «оновлено N позицій».
   */
  function setMaterialStatus(id: number, materialIds: number[], value: MaterialStatus): void {
    const object = find(id)

    if (object === null) {
      return
    }

    const changed = object.materials.filter(
      (item) => materialIds.includes(item.id) && item.status.value !== value,
    )

    if (changed.length === 0) {
      return
    }

    const label = MATERIAL_STATUS_LABELS[value]

    updateMaterials(id, materialIds, (item) => ({ ...item, status: { value, label } }))

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
  function setMaterialApproved(id: number, materialId: number, approved: boolean): void {
    updateMaterials(id, [materialId], (item) => ({ ...item, approved_by_client: approved }))
  }

  function removeMaterial(id: number, materialId: number): void {
    const object = find(id)
    const material = object?.materials.find((item) => item.id === materialId) ?? null

    if (object === null || material === null) {
      return
    }

    patch(id, { materials: object.materials.filter((item) => item.id !== materialId) })
    log(
      id,
      'material',
      'Прибрано матеріал',
      `${material.name}, ${formatAmount(material.quantity)} ${material.unit}`,
    )
  }

  /* ── Роботи обʼєкта ──────────────────────────────────────────── */

  /**
   * Поява роботи в журнал не пишеться — стрічка виводить її з обʼєкта. А от
   * рух по стадіях, факт-обсяг і склад бригади не відновити з даних, тож їх
   * фіксуємо окремими записами.
   */
  function addService(id: number, payload: ServicePayload): void {
    const object = find(id)

    if (object === null) {
      return
    }

    patch(id, { services: [...object.services, toService(payload, nextId(object.services))] })
  }

  function updateServices(
    id: number,
    serviceIds: number[],
    change: (service: Service) => Service,
  ): void {
    const object = find(id)

    if (object === null) {
      return
    }

    patch(id, {
      services: object.services.map((item) => (serviceIds.includes(item.id) ? change(item) : item)),
    })
  }

  /**
   * Стадію міняють і поштучно, і на цілу бригаду, яка зайшла на обʼєкт, — тож
   * приймаємо список. Роботи, які вже стоять у цій стадії, зміненими не
   * рахуються: вони не мають потрапляти ні в стрічку, ні в підпис.
   */
  function setServiceStatus(id: number, serviceIds: number[], value: ServiceStatus): void {
    const object = find(id)

    if (object === null) {
      return
    }

    const changed = object.services.filter(
      (item) => serviceIds.includes(item.id) && item.status.value !== value,
    )

    if (changed.length === 0) {
      return
    }

    const label = SERVICE_STATUS_LABELS[value]

    updateServices(id, serviceIds, (item) => ({ ...item, status: { value, label } }))

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
  function setServiceFact(id: number, serviceId: number, volume: number | null): void {
    const object = find(id)
    const service = object?.services.find((item) => item.id === serviceId) ?? null

    if (service === null || service.actual_volume === volume) {
      return
    }

    updateServices(id, [serviceId], (item) => ({ ...item, actual_volume: volume }))

    log(
      id,
      'service',
      volume === null ? 'Прибрано факт-обсяг' : 'Внесено факт-обсяг',
      volume === null
        ? service.name
        : `${service.name}: ${formatAmount(volume)} ${service.unit} з ${formatAmount(service.planned_volume)}`,
    )
  }

  function setServiceWorkers(id: number, serviceId: number, workers: ServiceWorkerPayload[]): void {
    const object = find(id)
    const service = object?.services.find((item) => item.id === serviceId) ?? null

    if (service === null) {
      return
    }

    updateServices(id, [serviceId], (item) => ({ ...item, workers }))

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

  function removeService(id: number, serviceId: number): void {
    const object = find(id)
    const service = object?.services.find((item) => item.id === serviceId) ?? null

    if (object === null || service === null) {
      return
    }

    patch(id, { services: object.services.filter((item) => item.id !== serviceId) })
    log(
      id,
      'service',
      'Прибрано роботу',
      `${service.name}, ${formatAmount(service.planned_volume)} ${service.unit}`,
    )
  }

  function remove(id: number): void {
    items.value = items.value.filter((item) => item.id !== id)
    persist()

    // Разом з обʼєктом їде і все, що до нього кріпилось.
    activity.value = activity.value.filter((record) => record.object_id !== id)
    photos.value = photos.value.filter((photo) => photo.object_id !== id)

    write(ACTIVITY_KEY, activity.value)
    write(PHOTOS_KEY, photos.value)
  }

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
      // Персональну знижку заводять у довіднику замовників, не з форми обʼєкта.
      discount: 0,
    }

    clients.value = [...clients.value, client]
    write(
      CLIENTS_KEY,
      clients.value.filter((item) => !DEMO_CLIENTS.some((demo) => demo.id === item.id)),
    )

    return client
  }

  /** Позиція матеріалу у вигляді, у якому її поверне бекенд. */
  function toMaterial(payload: MaterialPayload, id: number): Material {
    return {
      id,
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
  function toService(payload: ServicePayload, id: number): Service {
    return {
      id,
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

    // Демообʼєкти живуть у власному діапазоні id — нумерацію створених вони
    // не зсувають.
    const own = items.value.filter((item) => !isDemoObject(item.id))

    const object: ConstructionObject = {
      id: Math.max(0, ...own.map((item) => item.id)) + 1,
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
      materials: (payload.materials ?? []).map((item, index) => toMaterial(item, index + 1)),
      services: (payload.services ?? []).map((item, index) => toService(item, index + 1)),
      discount_percent: payload.discount_percent ?? null,
      discount_amount: payload.discount_amount ?? null,
      payments: (payload.payments ?? []).map(toPayment),
      archived_at: null,
      created_at: new Date().toISOString(),
    }

    items.value = [...items.value, object]

    persist()
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
    addClient,
    create,
    readDraft,
    saveDraft,
    clearDraft,
  }
})
