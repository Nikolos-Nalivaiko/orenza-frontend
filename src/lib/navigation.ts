import type { IconName } from '@/components/ui/icons'
import type { WorkspaceFeatures } from '@/lib/workspaces'

/**
 * Меню воркспейсу. Один опис на застосунок: із нього збирається і бічна
 * панель, і заголовок екрана, і мобільна шухляда — щоб пункт не довелось
 * додавати у трьох місцях.
 */
export interface NavItem {
  /** Імʼя маршруту — воно ж ключ пункту. */
  name: string
  label: string
  icon: IconName
  requires?: keyof WorkspaceFeatures
  /** Розділи, яких ще немає в бекенді, показуємо як «незабаром». */
  soon?: boolean
  /** Лічильник праворуч від назви (наприклад, прострочені задачі). */
  badge?: number
}

export interface NavGroup {
  title: string | null
  items: NavItem[]
}

export const NAV: NavGroup[] = [
  {
    title: null,
    items: [{ name: 'dashboard', label: 'Дашборд', icon: 'dashboard' }],
  },
  {
    title: 'Робота',
    items: [
      { name: 'objects', label: 'Обʼєкти', icon: 'building' },
      { name: 'schedule', label: 'Графік робіт', icon: 'calendar' },
    ],
  },
  {
    title: 'Люди та гроші',
    items: [
      { name: 'clients', label: 'Замовники', icon: 'user' },
      { name: 'team', label: 'Команда', icon: 'team', requires: 'team' },
      { name: 'finance', label: 'Фінанси', icon: 'wallet', soon: true },
    ],
  },
]

export const NAV_FOOTER: NavItem[] = [
  { name: 'settings', label: 'Налаштування', icon: 'settings', soon: true },
]

export const NAV_ITEMS: NavItem[] = [...NAV.flatMap((group) => group.items), ...NAV_FOOTER]

export function findNavItem(name: string): NavItem | null {
  return NAV_ITEMS.find((item) => item.name === name) ?? null
}

export function isAllowed(item: NavItem, features: WorkspaceFeatures): boolean {
  return item.requires === undefined || features[item.requires]
}

export function navFor(features: WorkspaceFeatures): NavGroup[] {
  return NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => isAllowed(item, features)),
  })).filter((group) => group.items.length > 0)
}
