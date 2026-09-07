import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore, type AuthUser } from './auth'
import { useProgressStore } from './progress'
import { api, ApiError } from '@/lib/http'
import { buildWorkspacePayload, type Workspace, type WorkspaceForm } from '@/lib/workspaces'

const STORAGE_KEY = 'orenza.workspaces'

interface StoredState {
  items: Workspace[]
  currentId: number | null
}

interface SwitchPayload {
  workspace: Workspace
  user: AuthUser
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
    // ignore
  }
}

function messageFor(cause: unknown, fallback: string): string {
  return cause instanceof ApiError ? cause.message : fallback
}

export const useWorkspacesStore = defineStore('workspaces', () => {
  const auth = useAuthStore()
  const progress = useProgressStore()
  const restored = read()

  const items = ref<Workspace[]>(restored.items)
  const currentId = ref<number | null>(
    auth.user?.current_workspace_id ?? restored.currentId ?? null,
  )

  const isLoading = ref(true)
  const isSaving = ref(false)
  const error = ref<string | null>(null)

  const current = computed(() => items.value.find((item) => item.id === currentId.value) ?? null)
  const isEmpty = computed(() => items.value.length === 0)
  const hasPersonal = computed(() => items.value.some((item) => item.type.value === 'personal'))

  function persist(): void {
    write({ items: items.value, currentId: currentId.value })
  }

  function reset(): void {
    error.value = null
  }

  async function fetchAll(): Promise<void> {
    isLoading.value = true
    error.value = null

    try {
      items.value = await progress.track(api.get<Workspace[]>('/workspaces'))

      const known = items.value.some((item) => item.id === currentId.value)

      if (!known) {
        currentId.value = items.value[0]?.id ?? null
      }

      persist()
    } catch (cause) {
      error.value = messageFor(cause, 'Не вдалося завантажити простори.')
    } finally {
      isLoading.value = false
    }
  }

  async function create(form: WorkspaceForm): Promise<Workspace | null> {
    isSaving.value = true
    error.value = null

    try {
      const workspace = await progress.track(
        api.post<Workspace>('/workspaces', buildWorkspacePayload(form)),
      )

      items.value = [...items.value, workspace]
      persist()

      return workspace
    } catch (cause) {
      error.value = messageFor(cause, 'Не вдалося створити простір.')

      return null
    } finally {
      isSaving.value = false
    }
  }

  async function select(id: number): Promise<void> {
    const workspace = items.value.find((item) => item.id === id)

    if (workspace === undefined) {
      return
    }

    const previous = currentId.value

    currentId.value = id
    persist()

    try {
      const payload = await api.put<SwitchPayload>(`/workspaces/${workspace.slug}/current`)

      auth.setUser(payload.user)
    } catch (cause) {
      currentId.value = previous
      persist()
      error.value = messageFor(cause, 'Не вдалося змінити простір.')
    }
  }

  function clear(): void {
    items.value = []
    currentId.value = null
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
    clear,
  }
})
