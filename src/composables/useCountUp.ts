import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

/** Плавно доводить число від 0 до target після монтування. */
export function useCountUp(target: number, duration = 1100): Ref<number> {
  const value = ref(0)
  let frame = 0

  onMounted(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      value.value = target

      return
    }

    const start = performance.now()

    const tick = (now: number): void => {
      const progress = Math.min((now - start) / duration, 1)
      // easeOutCubic — швидкий старт, м'яка зупинка.
      const eased = 1 - (1 - progress) ** 3

      value.value = target * eased

      if (progress < 1) {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
  })

  onBeforeUnmount(() => cancelAnimationFrame(frame))

  return value
}
