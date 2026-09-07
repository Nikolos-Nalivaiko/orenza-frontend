import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { ping, type ApiInfo } from '@/lib/health'
import { API_URL, ApiError } from '@/lib/http'

export type ApiStatus = 'unknown' | 'checking' | 'online' | 'offline'

export const useApiStore = defineStore('api', () => {
  const status = ref<ApiStatus>('unknown')
  const info = ref<ApiInfo | null>(null)
  const error = ref<string | null>(null)

  const isOffline = computed(() => status.value === 'offline')
  const isChecking = computed(() => status.value === 'checking')

  async function check(): Promise<boolean> {
    status.value = 'checking'
    error.value = null

    try {
      info.value = await ping()
      status.value = 'online'

      return true
    } catch (cause) {
      info.value = null
      status.value = 'offline'
      error.value =
        cause instanceof ApiError ? cause.message : 'Не вдалося перевірити звʼязок із сервером.'

      return false
    }
  }

  return { url: API_URL, status, info, error, isOffline, isChecking, check }
})
