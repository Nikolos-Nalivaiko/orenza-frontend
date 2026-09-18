import type { ConstructionObject, Client } from '@/lib/objects'
import { isBlankPhone, isCompletePhone, phoneDigits } from '@/lib/phone'
import {
  isEmail,
  normaliseEmail,
  PASSWORD_MIN,
  PHONE_ERROR,
  toInternationalPhone,
  type Errors,
} from '@/lib/validation'
import { NAME_MAX, NAME_MIN, type Workspace, type WorkspaceType } from '@/lib/workspaces'

export type SettingsPage = 'account' | 'workspace'

export type SettingsSectionId =
  'profile' | 'security' | 'account-danger' | 'general' | 'data' | 'workspace-danger'

export interface SettingsSection {
  id: SettingsSectionId
  label: string
  danger?: boolean
}

export interface SettingsGroup {
  page: SettingsPage
  route: string
  title: string
  sections: readonly SettingsSection[]
}

export const SETTINGS_GROUPS: readonly SettingsGroup[] = [
  {
    page: 'account',
    route: 'settings',
    title: 'Акаунт',
    sections: [
      { id: 'profile', label: 'Профіль' },
      { id: 'security', label: 'Безпека' },
      { id: 'account-danger', label: 'Видалення акаунта', danger: true },
    ],
  },
  {
    page: 'workspace',
    route: 'settings-workspace',
    title: 'Простір',
    sections: [
      { id: 'general', label: 'Простір' },
      { id: 'data', label: 'Дані та експорт' },
      { id: 'workspace-danger', label: 'Видалення простору', danger: true },
    ],
  },
]

export interface SettingsMenuItem extends SettingsSection {
  page: SettingsPage
  route: string
}

const MENU_ORDER: readonly SettingsSectionId[] = [
  'profile',
  'security',
  'general',
  'data',
  'workspace-danger',
  'account-danger',
]

export const SETTINGS_MENU: readonly SettingsMenuItem[] = MENU_ORDER.flatMap((id) =>
  SETTINGS_GROUPS.flatMap((group) =>
    group.sections
      .filter((section) => section.id === id)
      .map((section) => ({ ...section, page: group.page, route: group.route })),
  ),
)

export function groupOf(page: SettingsPage): SettingsGroup {
  return SETTINGS_GROUPS.find((group) => group.page === page) ?? SETTINGS_GROUPS[0]!
}

export function sectionAnchor(id: SettingsSectionId): string {
  return `settings-${id}`
}

export interface ProfileSource {
  first_name: string
  last_name: string
  email: string
  phone: string | null
}

export interface ProfileForm {
  firstName: string
  lastName: string
  email: string
  phone: string
}

export function profileFormFrom(user: ProfileSource | null): ProfileForm {
  return {
    firstName: user?.first_name ?? '',
    lastName: user?.last_name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
  }
}

export function validateProfile(form: ProfileForm): Errors<ProfileForm> {
  const errors: Errors<ProfileForm> = {}

  if (form.firstName.trim() === '') {
    errors.firstName = 'Вкажіть імʼя'
  }

  if (form.lastName.trim() === '') {
    errors.lastName = 'Вкажіть прізвище'
  }

  if (form.email.trim() === '') {
    errors.email = 'Вкажіть пошту — нею ви входите'
  } else if (!isEmail(form.email)) {
    errors.email = 'Схоже на помилку в адресі'
  }

  if (!isBlankPhone(form.phone) && !isCompletePhone(form.phone)) {
    errors.phone = PHONE_ERROR
  }

  return errors
}

export function sameProfile(left: ProfileForm, right: ProfileForm): boolean {
  return (
    left.firstName.trim() === right.firstName.trim() &&
    left.lastName.trim() === right.lastName.trim() &&
    normaliseEmail(left.email) === normaliseEmail(right.email) &&
    phoneDigits(left.phone) === phoneDigits(right.phone)
  )
}

export function emailChanged(before: ProfileForm, after: ProfileForm): boolean {
  return normaliseEmail(before.email) !== normaliseEmail(after.email)
}

export interface ProfilePayload {
  first_name: string
  last_name: string
  email: string
  phone: string | null
}

export function buildProfilePayload(form: ProfileForm): ProfilePayload {
  const phone = toInternationalPhone(form.phone)

  return {
    first_name: form.firstName.trim(),
    last_name: form.lastName.trim(),
    email: normaliseEmail(form.email),
    phone: phone === '' ? null : phone,
  }
}

export function initialsOf(form: ProfileForm): string {
  const first = form.firstName.trim()[0] ?? ''
  const last = form.lastName.trim()[0] ?? ''

  return `${first}${last}`.toUpperCase() || 'O'
}

export function fullNameOf(form: ProfileForm): string {
  return `${form.firstName.trim()} ${form.lastName.trim()}`.trim()
}

export interface PasswordForm {
  current: string
  password: string
  confirmation: string
}

export function emptyPasswordForm(): PasswordForm {
  return { current: '', password: '', confirmation: '' }
}

export function isPasswordFormTouched(form: PasswordForm): boolean {
  return form.current !== '' || form.password !== '' || form.confirmation !== ''
}

export function validatePasswordForm(form: PasswordForm): Errors<PasswordForm> {
  const errors: Errors<PasswordForm> = {}

  if (form.current === '') {
    errors.current = 'Введіть поточний пароль'
  }

  if (form.password.length < PASSWORD_MIN) {
    errors.password = `Мінімум ${PASSWORD_MIN} символів`
  } else if (form.current !== '' && form.password === form.current) {
    errors.password = 'Новий пароль збігається з поточним'
  }

  if (form.confirmation !== form.password) {
    errors.confirmation = 'Паролі не збігаються'
  }

  return errors
}

export interface PasswordPayload {
  current_password: string
  password: string
  password_confirmation: string
}

export function buildPasswordPayload(form: PasswordForm): PasswordPayload {
  return {
    current_password: form.current,
    password: form.password,
    password_confirmation: form.confirmation,
  }
}

export interface AccountTypeInfo {
  label: string
  description: string
}

export const ACCOUNT_TYPE_INFO: Record<WorkspaceType, AccountTypeInfo> = {
  personal: {
    label: 'Приватна особа',
    description: 'Обʼєкти, замовники й графік — без розділу «Команда».',
  },
  company: {
    label: 'Компанія',
    description: 'Усе, що в приватної особи, плюс команда й виконавці на роботах.',
  },
}

export interface WorkspaceForm {
  name: string
}

export function workspaceFormFrom(workspace: Workspace | null): WorkspaceForm {
  return { name: workspace?.name ?? '' }
}

export function validateWorkspaceForm(form: WorkspaceForm): Errors<WorkspaceForm> {
  const errors: Errors<WorkspaceForm> = {}
  const name = form.name.trim()

  if (name === '') {
    errors.name = 'Вкажіть назву простору'
  } else if (name.length < NAME_MIN) {
    errors.name = `Мінімум ${NAME_MIN} символи`
  } else if (name.length > NAME_MAX) {
    errors.name = `Максимум ${NAME_MAX} символів`
  }

  return errors
}

export function sameWorkspace(left: WorkspaceForm, right: WorkspaceForm): boolean {
  return left.name.trim() === right.name.trim()
}

export function buildWorkspacePayload(form: WorkspaceForm): WorkspaceForm {
  return { name: form.name.trim() }
}

export function canManageWorkspace(workspace: Workspace | null, userId: number | null): boolean {
  return workspace !== null && userId !== null && workspace.owner_id === userId
}

export function isWorkspaceDeleteConfirmed(typed: string, name: string): boolean {
  return name.trim() !== '' && typed.trim() === name.trim()
}

export interface ExportSummary {
  objects: number
  archived: number
  clients: number
  employees: number
  materials: number
  services: number
  payments: number
}

export function exportSummary(
  objects: ConstructionObject[],
  clients: Client[],
  employees: number,
): ExportSummary {
  return {
    objects: objects.length,
    archived: objects.filter((object) => object.archived_at !== null).length,
    clients: clients.length,
    employees,
    materials: objects.reduce((sum, object) => sum + object.materials.length, 0),
    services: objects.reduce((sum, object) => sum + object.services.length, 0),
    payments: objects.reduce((sum, object) => sum + object.payments.length, 0),
  }
}

export interface ExportFile {
  name: string
  description: string
}

export function exportFiles(team: boolean): ExportFile[] {
  return [
    { name: 'objects.csv', description: 'Обʼєкти: адреси, статуси, дати, знижки' },
    { name: 'clients.csv', description: 'Замовники: контакти й нотатки' },
    { name: 'materials.csv', description: 'Матеріали за обʼєктами' },
    { name: 'services.csv', description: 'Роботи за обʼєктами' },
    { name: 'payments.csv', description: 'Платежі: суми, статуси, дати' },
    ...(team ? [{ name: 'employees.csv', description: 'Команда: люди, ролі, контакти' }] : []),
    { name: 'data.json', description: 'Повна копія зі звʼязками між записами' },
  ]
}

export function exportFileName(slug: string, today: string, extension = 'zip'): string {
  return `orenza-${slug}-${today}.${extension}`
}

export function isDeleteConfirmed(password: string, agreed: boolean): boolean {
  return password !== '' && agreed
}

export function formatUnits(count: number, one: string, few: string, many: string): string {
  const tail = count % 100 >= 11 && count % 100 <= 14 ? 0 : count % 10

  if (tail === 1) {
    return `${count} ${one}`
  }

  return tail >= 2 && tail <= 4 ? `${count} ${few}` : `${count} ${many}`
}

const longDateFormat = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export function formatLongDate(iso: string | null | undefined): string {
  if (iso === null || iso === undefined) {
    return ''
  }

  const date = new Date(iso)

  return Number.isNaN(date.getTime()) ? '' : longDateFormat.format(date).replace(/\s*р\.$/, '')
}
