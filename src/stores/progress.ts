import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

/**
 * Лічильник активних очікувань: запити до API, збереження форм.
 * Навігація рахується окремим прапорцем: під час редиректу з guard'а
 * beforeEach спрацьовує кілька разів, а afterEach — лише раз на завершену
 * навігацію, тож лічильник ніколи б не повернувся до нуля.
 * Смужка вгорі показується, поки триває навігація або є активні очікування.
 */
export const useProgressStore = defineStore('progress', () => {
  const active = ref(0)
  const navigating = ref(false)

  const isActive = computed(() => navigating.value || active.value > 0)

  function setNavigating(value: boolean): void {
    navigating.value = value
  }

  function start(): void {
    active.value += 1
  }

  function done(): void {
    active.value = Math.max(0, active.value - 1)
  }

  /** Обгортка навколо будь-якої асинхронної дії. */
  async function track<T>(work: Promise<T>): Promise<T> {
    start()

    try {
      return await work
    } finally {
      done()
    }
  }

  return { active, navigating, isActive, setNavigating, start, done, track }
})
