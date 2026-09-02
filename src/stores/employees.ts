import { ref } from 'vue'
import { defineStore } from 'pinia'
import { useProgressStore } from './progress'
import { DEMO_EMPLOYEES, type Employee } from '@/lib/employees'

/**
 * Співробітники простору. Ендпоінта ще немає — список приходить із демоданих,
 * але через ту саму асинхронну загрузку, що й у решти довідників.
 */
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

      items.value = [...DEMO_EMPLOYEES]
    } finally {
      // Навіть якщо запит впаде, селект не має лишитись у скелетоні назавжди.
      isLoading.value = false
    }
  }

  return { items, isLoading, find, fetchEmployees }
})
