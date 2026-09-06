import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useProgressStore } from './progress'
import {
  buildEmployeePayload,
  DEMO_EMPLOYEES,
  normalizeEmployee,
  type Employee,
  type EmployeeForm,
  type EmployeeStatus,
} from '@/lib/employees'

/**
 * Співробітники простору. Ендпоінта ще немає — список приходить із демоданих,
 * але через ту саму асинхронну загрузку, що й у решти довідників.
 *
 * Правки з картки живуть у localStorage: структура записів і правила ті самі,
 * що поїдуть на бекенд, тож зміниться лише джерело.
 */
const STORAGE_KEY = 'orenza.employees'

function readList(): Employee[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    return raw === null ? [] : (JSON.parse(raw) as Employee[])
  } catch {
    return []
  }
}

function write(items: Employee[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Приватний режим або переповнена квота: правка просто не переживе
    // перезавантаження — окремої помилки це не варте.
  }
}

export const useEmployeesStore = defineStore('employees', () => {
  const progress = useProgressStore()

  const items = ref<Employee[]>([])

  // Поки нічого не питали, список вважаємо таким, що вантажиться: інакше
  // селект встиг би блимнути порожнім станом.
  const isLoading = ref(true)

  function find(id: number | null): Employee | null {
    return id === null ? null : (items.value.find((item) => item.id === id) ?? null)
  }

  async function fetchEmployees(): Promise<void> {
    isLoading.value = true

    try {
      // TODO: GET /api/v1/workspaces/{id}/employees
      await progress.track(new Promise((resolve) => setTimeout(resolve, 380)))

      const stored = readList().map(normalizeEmployee)

      // Демолюди сіються один раз — далі це звичайні записи, яким правлять
      // контакти й статус нарівні з власними.
      const seeded = DEMO_EMPLOYEES.filter((demo) => !stored.some((item) => item.id === demo.id))

      items.value = [...seeded, ...stored].sort((left, right) => left.id - right.id)

      if (seeded.length > 0) {
        write(items.value)
      }
    } finally {
      // Навіть якщо запит впаде, селект не має лишитись у скелетоні назавжди.
      isLoading.value = false
    }
  }

  function patch(id: number, changes: Partial<Employee>): void {
    const employee = find(id)

    if (employee === null) {
      return
    }

    items.value = items.value.map((item) => (item.id === id ? { ...item, ...changes } : item))
    write(items.value)
  }

  /** Контакти й спеціальність — те, за чим людину впізнають і набирають. */
  function updateEmployee(id: number, form: EmployeeForm): void {
    patch(id, buildEmployeePayload(form))
  }

  /**
   * Людина пішла чи у відпустці — вона не зникає, а стає неактивною: історія
   * робіт і нарахувань лишається, у нові бригади її просто не пропонують.
   */
  function setEmployeeStatus(id: number, status: EmployeeStatus): void {
    patch(id, { status })
  }

  /** Опис людини: як із нею працювати. Один текст, а не стрічка подій. */
  function setEmployeeNotes(id: number, notes: string): void {
    patch(id, { notes: notes.trim() })
  }

  return {
    items,
    isLoading,
    find,
    fetchEmployees,
    updateEmployee,
    setEmployeeStatus,
    setEmployeeNotes,
  }
})
