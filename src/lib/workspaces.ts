/**
 * Робочі простори. Структура повторює App\Http\Resources\WorkspaceResource,
 * правила створення — App\Http\Requests\Workspaces\StoreWorkspaceRequest
 * та App\Actions\Workspaces\CreateWorkspaceAction.
 */

export type WorkspaceType = 'personal' | 'company'

export interface Workspace {
  id: number
  type: { value: WorkspaceType; label: string }
  name: string
  slug: string
  owner_id: number
  created_at: string | null
}

/** Підписи типів для інтерфейсу — бекенд віддає label російською. */
export const WORKSPACE_TYPE_LABELS: Record<WorkspaceType, string> = {
  personal: 'Особистий',
  company: 'Компанія',
}

export const NAME_MIN = 2
export const NAME_MAX = 255

/** Межа довжини slug на бекенді — її тримається і локальний генератор. */
export const SLUG_MAX = 48

const TRANSLIT: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  ґ: 'g',
  д: 'd',
  е: 'e',
  є: 'ye',
  ё: 'yo',
  ж: 'zh',
  з: 'z',
  и: 'i',
  і: 'i',
  ї: 'yi',
  й: 'j',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}

/**
 * Приблизний аналог Str::slug. Форма адресу не питає — slug завжди генерує
 * бекенд із назви; локально це потрібно лише для тимчасового сховища.
 */
export function slugify(value: string): string {
  const transliterated = [...value.toLowerCase()].map((char) => TRANSLIT[char] ?? char).join('')

  return transliterated
    .replace(/['ʼ’`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/, '')
}

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
