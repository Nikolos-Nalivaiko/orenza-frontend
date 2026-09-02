import { onBeforeUnmount, ref, watch, type Ref } from 'vue'

/**
 * Тягне число до нового значення щоразу, коли джерело змінюється:
 * плитки дашборда мають «доїхати» до нових цифр, а не підмінити їх.
 */
export function useAnimatedNumber(source: Ref<number>, duration = 900): Ref<number> {
  const value = ref(0)
  let frame = 0

  function run(to: number): void {
    cancelAnimationFrame(frame)

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      value.value = to

      return
    }

    const from = value.value
    const start = performance.now()

    const tick = (now: number): void => {
      const progress = Math.min((now - start) / duration, 1)
      // easeOutCubic — швидкий старт, мʼяка зупинка.
      const eased = 1 - (1 - progress) ** 3

      value.value = from + (to - from) * eased

      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
  }

  watch(source, run, { immediate: true })

  onBeforeUnmount(() => cancelAnimationFrame(frame))

  return value
}
