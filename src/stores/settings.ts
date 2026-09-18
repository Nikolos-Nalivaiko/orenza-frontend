import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { useAuthStore } from './auth'
import { useEmployeesStore } from './employees'
import { useObjectsStore } from './objects'
import { useProgressStore } from './progress'
import { useWorkspacesStore } from './workspaces'
import { todayIso } from '@/lib/objects'
import {
  canManageWorkspace,
  exportFileName,
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
}

const PREVIEW_DELAY = 750

const PREVIEW_BLOCKED = 'Запрацює після підключення бекенду — зараз це попередній перегляд.'

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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
  const objects = useObjectsStore()
  const employees = useEmployeesStore()
  const progress = useProgressStore()

  const pending = ref<SettingsTask | null>(null)
  const profile = ref<ProfileForm>(profileFormFrom(auth.user))
  const workspaceForms = ref<Record<number, WorkspaceForm>>({})
  const exportedAt = ref<Record<number, Date>>({})

  watch(
    () => auth.user?.id,
    () => {
      profile.value = profileFormFrom(auth.user)
      workspaceForms.value = {}
      exportedAt.value = {}
    },
  )

  const workspace = computed<WorkspaceForm>(() => {
    const id = workspaces.current?.id

    return (
      (id === undefined ? undefined : workspaceForms.value[id]) ??
      workspaceFormFrom(workspaces.current)
    )
  })

  const canManage = computed(() => canManageWorkspace(workspaces.current, auth.user?.id ?? null))

  const ownedWorkspaces = computed(() =>
    workspaces.items.filter((item) => item.owner_id === auth.user?.id),
  )

  const lastExport = computed(() => {
    const id = workspaces.current?.id

    return id === undefined ? null : (exportedAt.value[id] ?? null)
  })

  async function run(task: SettingsTask, work: () => Promise<void>): Promise<SettingsResult> {
    pending.value = task

    try {
      await progress.track(work())

      return { ok: true, message: null }
    } catch (cause) {
      return {
        ok: false,
        message: cause instanceof Error ? cause.message : 'Не вдалося виконати дію.',
      }
    } finally {
      pending.value = null
    }
  }

  function saveProfile(form: ProfileForm): Promise<SettingsResult> {
    return run('profile', async () => {
      await pause(PREVIEW_DELAY)
      profile.value = { ...form }
    })
  }

  function changePassword(form: PasswordForm): Promise<SettingsResult> {
    return run('password', async () => {
      await pause(PREVIEW_DELAY)

      if (form.current === form.password) {
        throw new Error('Новий пароль збігається з поточним.')
      }
    })
  }

  function signOutOthers(): Promise<SettingsResult> {
    return run('sessions', () => pause(PREVIEW_DELAY))
  }

  function deleteAccount(): Promise<SettingsResult> {
    return run('account-delete', async () => {
      await pause(PREVIEW_DELAY)
      throw new Error(PREVIEW_BLOCKED)
    })
  }

  function saveWorkspace(form: WorkspaceForm): Promise<SettingsResult> {
    return run('workspace', async () => {
      await pause(PREVIEW_DELAY)

      const id = workspaces.current?.id

      if (id !== undefined) {
        workspaceForms.value = { ...workspaceForms.value, [id]: { name: form.name.trim() } }
      }
    })
  }

  function exportData(): Promise<SettingsResult> {
    return run('export', async () => {
      await pause(PREVIEW_DELAY * 1.6)

      const current = workspaces.current

      if (current === null) {
        throw new Error('Простір не обрано.')
      }

      const snapshot = {
        exported_at: new Date().toISOString(),
        workspace: current,
        objects: objects.current,
        clients: objects.clients,
        employees: employees.items,
      }

      saveFile(
        new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }),
        exportFileName(current.slug, todayIso(), 'json'),
      )

      exportedAt.value = { ...exportedAt.value, [current.id]: new Date() }
    })
  }

  function deleteWorkspace(): Promise<SettingsResult> {
    return run('workspace-delete', async () => {
      await pause(PREVIEW_DELAY)
      throw new Error(PREVIEW_BLOCKED)
    })
  }

  return {
    pending,
    profile,
    workspace,
    canManage,
    ownedWorkspaces,
    lastExport,
    saveProfile,
    changePassword,
    signOutOthers,
    deleteAccount,
    saveWorkspace,
    exportData,
    deleteWorkspace,
  }
})
