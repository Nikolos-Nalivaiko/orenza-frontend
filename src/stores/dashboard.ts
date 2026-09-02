import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { useProgressStore } from './progress'
import { demoDashboard, type DashboardData, type Period } from '@/lib/dashboard'

const STORAGE_KEY = 'orenza.dashboard.period'

function readPeriod(): Period {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)

    return raw === 'week' || raw === 'month' || raw === 'quarter' ? raw : 'week'
  } catch {
    return 'week'
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export const useDashboardStore = defineStore('dashboard', () => {
  const progress = useProgressStore()

  const period = ref<Period>(readPeriod())
  const data = ref<DashboardData | null>(null)

  /** Перше завантаження показує скелетони. */
  const isLoading = ref(true)

  /**
   * Зміна періоду — не перше завантаження: карти лишаються на місці й лише
   * приглушуються. Інакше дашборд «стрибає» на кожен клік по перемикачу.
   */
  const isRefetching = ref(false)

  const hasData = computed(() => data.value !== null)

  async function load(next: Period = period.value): Promise<void> {
    const first = data.value === null

    period.value = next

    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Приватний режим — вибір періоду просто не переживе перезавантаження.
    }

    if (first) {
      isLoading.value = true
    } else {
      isRefetching.value = true
    }

    try {
      // TODO: GET /api/v1/workspaces/{id}/dashboard?period=…
      await progress.track(delay(first ? 620 : 380))

      data.value = demoDashboard(next)
    } finally {
      isLoading.value = false
      isRefetching.value = false
    }
  }

  /** Локальне відмічання — до появи PATCH /api/v1/tasks/{id}. */
  function toggleTask(id: number): void {
    const task = data.value?.tasks.find((item) => item.id === id)

    if (task !== undefined) {
      task.done = !task.done
    }
  }

  return { period, data, isLoading, isRefetching, hasData, load, toggleTask }
})
