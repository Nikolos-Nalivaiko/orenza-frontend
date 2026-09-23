import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore, type AuthUser } from './auth'
import { useProgressStore } from './progress'
import { useWorkspacesStore } from './workspaces'
import { api, ApiError, download } from '@/lib/http'
import { todayIso } from '@/lib/objects'
import type { Workspace } from '@/lib/workspaces'
import {
  buildPasswordPayload,
  buildProfilePayload,
  buildWorkspacePayload,
  canManageWorkspace,
  exportFileName,
  type ExportSummary,
  profileFormFrom,
  workspaceFormFrom,
  type PasswordForm,
  type ProfileForm,
  type WorkspaceForm,
} from '@/lib/settings'

export type SettingsTask =
  | 'profile'
  | 'password'
  | 'sessions'
  | 'account-delete'
  | 'workspace'
  | 'export'
  | 'workspace-delete'

export interface SettingsResult {
  ok: boolean
  message: string | null
  fields: Record<string, string>
}

function saveFile(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()

  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const useSettingsStore = defineStore('settings', () => {
  const auth = useAuthStore()
  const workspaces = useWorkspacesStore()
  const progress = useProgressStore()

  const pending = ref<SettingsTask | null>(null)
  const profile = ref<ProfileForm>(profileFormFrom(auth.user))
  const exportedAt = ref<Record<number, Date>>({})
  const summaries = ref<Record<number, ExportSummary>>({})
  const summaryLoading = ref(false)
  const summaryError = ref<string | null>(null)

  watch(
    () => auth.user?.id,
    () => {
      profile.value = profileFormFrom(auth.user)
      exportedAt.value = {}
      summaries.value = {}
    },
  )

  const workspace = computed<WorkspaceForm>(() => workspaceFormFrom(workspaces.current))

  const canManage = computed(() => canManageWorkspace(workspaces.current, auth.user?.id ?? null))

  const ownedWorkspaces = computed(() =>
    workspaces.items.filter((item) => item.owner_id === auth.user?.id),
  )

  const lastExport = computed(() => {
    const id = workspaces.current?.id

    return id === undefined ? null : (exportedAt.value[id] ?? null)
  })

  const summary = computed(() => {
    const id = workspaces.current?.id

    return id === undefined ? null : (summaries.value[id] ?? null)
  })

  async function loadSummary(): Promise<void> {
    const current = workspaces.current

    if (current === null) {
      return
    }

    summaryLoading.value = true
    summaryError.value = null

    try {
      const data = await api.get<ExportSummary>(`/workspaces/${current.slug}/export/summary`)

      summaries.value = { ...summaries.value, [current.id]: data }
    } catch (cause) {
      summaryError.value =
        cause instanceof ApiError ? cause.message : 'Не вдалося порахувати обсяг даних.'
    } finally {
      summaryLoading.value = false
    }
  }

  async function run(task: SettingsTask, work: () => Promise<void>): Promise<SettingsResult> {
    pending.value = task

    try {
      await progress.track(work())

      return { ok: true, message: null, fields: {} }
    } catch (cause) {
      const fields: Record<string, string> = {}

      if (cause instanceof ApiError && cause.isValidation) {
        for (const field of Object.keys(cause.errors)) {
          const message = cause.fieldError(field)

          if (message !== undefined) {
            fields[field] = message
          }
        }
      }

      return {
        ok: false,
        message: cause instanceof Error ? cause.message : 'Не вдалося виконати дію.',
        fields,
      }
    } finally {
      pending.value = null
    }
  }

  function saveProfile(form: ProfileForm): Promise<SettingsResult> {
    return run('profile', async () => {
      const user = await api.patch<AuthUser>('/profile', buildProfilePayload(form))

      auth.setUser(user)
      profile.value = profileFormFrom(user)
    })
  }

  function changePassword(form: PasswordForm): Promise<SettingsResult> {
    return run('password', async () => {
      await api.put('/profile/password', buildPasswordPayload(form))
    })
  }

  function signOutOthers(): Promise<SettingsResult> {
    return run('sessions', async () => {
      await api.delete('/profile/sessions')
    })
  }

  function deleteAccount(password: string): Promise<SettingsResult> {
    return run('account-delete', async () => {
      await api.delete('/profile', { body: { password } })

      workspaces.clear()
      auth.clear()
    })
  }

  function saveWorkspace(form: WorkspaceForm): Promise<SettingsResult> {
    return run('workspace', async () => {
      const current = workspaces.current

      if (current === null) {
        throw new Error('Простір не обрано.')
      }

      workspaces.replace(
        await api.patch<Workspace>(`/workspaces/${current.slug}`, buildWorkspacePayload(form)),
      )
    })
  }

  function exportData(): Promise<SettingsResult> {
    return run('export', async () => {
      const current = workspaces.current

      if (current === null) {
        throw new Error('Простір не обрано.')
      }

      const archive = await download(`/workspaces/${current.slug}/export`)

      saveFile(archive, exportFileName(current.slug, todayIso()))

      exportedAt.value = { ...exportedAt.value, [current.id]: new Date() }
    })
  }

  function deleteWorkspace(name: string): Promise<SettingsResult> {
    return run('workspace-delete', async () => {
      const current = workspaces.current

      if (current === null) {
        throw new Error('Простір не обрано.')
      }

      await api.delete(`/workspaces/${current.slug}`, { body: { name: name.trim() } })

      workspaces.remove(current.id)

      if (auth.user !== null && auth.user.current_workspace_id === current.id) {
        auth.setUser({ ...auth.user, current_workspace_id: null })
      }
    })
  }

  return {
    pending,
    profile,
    workspace,
    canManage,
    ownedWorkspaces,
    lastExport,
    summary,
    summaryLoading,
    summaryError,
    loadSummary,
    saveProfile,
    changePassword,
    signOutOthers,
    deleteAccount,
    saveWorkspace,
    exportData,
    deleteWorkspace,
  }
})
