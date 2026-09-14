/**
 * Робочі простори. Структура повторює App\Http\Resources\WorkspaceResource,
 * правила створення — App\Http\Requests\Workspaces\StoreWorkspaceRequest
 * та App\Actions\Workspaces\CreateWorkspaceAction.
 */

export type WorkspaceType = 'personal' | 'company'

export interface WorkspaceFeatures {
  team: boolean
}

export interface Workspace {
  id: number
  type: { value: WorkspaceType; label: string }
  features: WorkspaceFeatures
  name: string
  slug: string
  owner_id: number
  created_at: string | null
}

export function workspaceFeatures(workspace: Workspace | null): WorkspaceFeatures {
  if (workspace === null) {
    return { team: false }
  }

  return workspace.features ?? { team: workspace.type.value === 'company' }
}

/** Підписи типів для інтерфейсу — бекенд віддає label російською. */
export const WORKSPACE_TYPE_LABELS: Record<WorkspaceType, string> = {
  personal: 'Особистий',
  company: 'Компанія',
}

export const NAME_MIN = 2
export const NAME_MAX = 255

export interface WorkspaceForm {
  type: WorkspaceType
  name: string
}

export type WorkspaceErrors = Partial<Record<keyof WorkspaceForm, string>>

export function validateWorkspaceForm(form: WorkspaceForm): WorkspaceErrors {
  const errors: WorkspaceErrors = {}
  const name = form.name.trim()

  if (form.type === 'company' && name === '') {
    errors.name = 'Вкажіть назву компанії'
  } else if (name !== '' && name.length < NAME_MIN) {
    errors.name = `Мінімум ${NAME_MIN} символи`
  } else if (name.length > NAME_MAX) {
    errors.name = `Максимум ${NAME_MAX} символів`
  }

  return errors
}

/**
 * Тіло запиту POST /api/v1/workspaces. Поле slug не надсилаємо —
 * GenerateWorkspaceSlugAction збере адресу з назви.
 */
export interface WorkspacePayload {
  type: WorkspaceType
  name?: string
}

export function buildWorkspacePayload(form: WorkspaceForm): WorkspacePayload {
  const name = form.name.trim()

  return {
    type: form.type,
    ...(name === '' ? {} : { name }),
  }
}

const dateFormat = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatCreatedAt(iso: string | null): string {
  if (iso === null) {
    return ''
  }

  const date = new Date(iso)

  // Прибираємо хвіст «р.» — у підписі картки він лише додає перенос рядка.
  return Number.isNaN(date.getTime()) ? '' : dateFormat.format(date).replace(/\s*р\.$/, '')
}

/** Монограма для плитки картки: перші літери двох слів назви. */
export function monogram(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)

  if (words.length === 0) {
    return 'O'
  }

  const first = words[0]?.[0] ?? ''
  const second = words.length > 1 ? (words[1]?.[0] ?? '') : ''

  return `${first}${second}`.toUpperCase()
}
