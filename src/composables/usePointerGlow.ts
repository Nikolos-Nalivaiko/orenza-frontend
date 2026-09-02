import { onBeforeUnmount, onMounted, type Ref } from 'vue'

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Тримає CSS-змінні --mx / --my з позицією курсора всередині елемента:
 * на них зав'язані підсвітка та паралакс панелі.
 */
export function usePointerGlow(target: Ref<HTMLElement | null>): void {
  function onMove(event: PointerEvent): void {
    const element = target.value

    if (element === null) {
      return
    }

    const rect = element.getBoundingClientRect()

    element.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}`)
    element.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}`)
  }

  function onLeave(): void {
    const element = target.value

    if (element === null) {
      return
    }

    element.style.setProperty('--mx', '50')
    element.style.setProperty('--my', '38')
  }

  onMounted(() => {
    if (target.value === null || prefersReducedMotion()) {
      return
    }

    target.value.addEventListener('pointermove', onMove)
    target.value.addEventListener('pointerleave', onLeave)
  })

  onBeforeUnmount(() => {
    target.value?.removeEventListener('pointermove', onMove)
    target.value?.removeEventListener('pointerleave', onLeave)
  })
}
