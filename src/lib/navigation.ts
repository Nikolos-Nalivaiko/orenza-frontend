import type { IconName } from '@/components/ui/icons'

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
      { name: 'objects', label: 'Обʼєкти', icon: 'building', soon: true },
      { name: 'estimates', label: 'Кошториси', icon: 'estimate', soon: true },
      { name: 'schedule', label: 'Графік робіт', icon: 'calendar', soon: true },
      { name: 'materials', label: 'Матеріали', icon: 'box', soon: true },
    ],
  },
  {
    title: 'Люди та гроші',
    items: [
      { name: 'team', label: 'Команда', icon: 'team', soon: true },
      { name: 'finance', label: 'Фінанси', icon: 'wallet', soon: true },
      { name: 'documents', label: 'Документи', icon: 'document', soon: true },
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
