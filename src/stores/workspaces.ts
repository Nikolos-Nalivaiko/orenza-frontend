import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import { useProgressStore } from './progress'
import {
  buildWorkspacePayload,
  slugify,
  WORKSPACE_TYPE_LABELS,
  type Workspace,
  type WorkspaceForm,
} from '@/lib/workspaces'

/**
 * Поки в API є лише POST /api/v1/workspaces, список зберігаємо локально —
 * структура записів та правила створення ті самі, що й на бекенді.
 */
const STORAGE_KEY = 'orenza.workspaces'

interface StoredState {
  items: Workspace[]
  currentId: number | null
}

function read(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    return raw === null ? { items: [], currentId: null } : (JSON.parse(raw) as StoredState)
  } catch {
    return { items: [], currentId: null }
  }
}

function write(state: StoredState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Приватний режим — список просто не переживе перезавантаження.
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const useWorkspacesStore = defineStore('workspaces', () => {
  const auth = useAuthStore()
  const progress = useProgressStore()
  const restored = read()

  const items = ref<Workspace[]>(restored.items)
  const currentId = ref<number | null>(restored.currentId)

  /**
   * Стартуємо саме в стані завантаження. Відновлений із localStorage список
   * потрібен guard'у роутера синхронно, але показувати його як готовий не можна:
   * інакше перший кадр екрана — картки чи «порожньо», і лише наступний тік
   * замінює їх на скелетони. Виходить блимання та зайвий перехід заголовка.
   */
  const isLoading = ref(true)
  const isSaving = ref(false)
  const error = ref<string | null>(null)

  const current = computed(() => items.value.find((item) => item.id === currentId.value) ?? null)
  const isEmpty = computed(() => items.value.length === 0)

  /** Персональний простір може бути лише один — правило CreateWorkspaceAction. */
  const hasPersonal = computed(() => items.value.some((item) => item.type.value === 'personal'))

  function persist(): void {
    write({ items: items.value, currentId: currentId.value })
  }

  function reset(): void {
    error.value = null
  }

  /** Унікальний slug: base, base-2, base-3 — як у GenerateWorkspaceSlugAction. */
  function uniqueSlug(base: string): string {
    const taken = new Set(items.value.map((item) => item.slug))
    const seed = base === '' ? 'workspace' : base

    if (!taken.has(seed)) {
      return seed
    }

    let suffix = 2

    while (taken.has(`${seed}-${suffix}`)) {
      suffix += 1
    }

    return `${seed}-${suffix}`
  }

  async function fetchAll(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      // TODO: GET /api/v1/workspaces (ендпоінт ще не реалізовано на бекенді)
      await progress.track(delay(550))

      const stored = read()

      items.value = stored.items
      currentId.value = stored.currentId
    } finally {
      // Навіть якщо запит впаде, екран не має лишитись у скелетонах назавжди.
      isLoading.value = false
    }
  }

  async function create(form: WorkspaceForm): Promise<Workspace | null> {
    const payload = buildWorkspacePayload(form)

    isSaving.value = true
    error.value = null

    // TODO: POST /api/v1/workspaces
    await progress.track(delay(700))
    isSaving.value = false

    if (payload.type === 'personal' && hasPersonal.value) {
      error.value = 'У вас уже є особистий простір.'

      return null
    }

    // Для особистого простору бекенд бере повне імʼя власника як назву.
    const name = payload.name ?? auth.user?.full_name ?? ''

    if (name === '') {
      error.value = 'Простір компанії потребує назви.'

      return null
    }

    // Адресу генерує бекенд із назви — локально повторюємо ту саму логіку.
    const slug = uniqueSlug(slugify(name))

    const workspace: Workspace = {
      id: Math.max(0, ...items.value.map((item) => item.id)) + 1,
      type: { value: payload.type, label: WORKSPACE_TYPE_LABELS[payload.type] },
      name,
      slug,
      owner_id: auth.user?.id ?? 0,
      created_at: new Date().toISOString(),
    }

    items.value = [...items.value, workspace]
    currentId.value ??= workspace.id
    persist()

    return workspace
  }

  function select(id: number): void {
    // TODO: перемикання current_workspace_id на бекенді
    currentId.value = id
    persist()
  }

  return {
    items,
    currentId,
    current,
    isEmpty,
    isLoading,
    isSaving,
    error,
    hasPersonal,
    reset,
    fetchAll,
    create,
    select,
  }
})
