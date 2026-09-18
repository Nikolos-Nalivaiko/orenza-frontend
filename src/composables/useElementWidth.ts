import { onBeforeUnmount, onMounted, ref, type Ref } from 'vue'

export function useElementWidth(
  target: Readonly<Ref<HTMLElement | null>>,
  fallback = 640,
): Ref<number> {
  const width = ref(fallback)
  let observer: ResizeObserver | null = null

  onMounted(() => {
    const element = target.value

    if (element === null) {
      return
    }

    width.value = element.clientWidth || fallback

    observer = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width

      if (next !== undefined && next > 0) {
        width.value = next
      }
    })

    observer.observe(element)
  })

  onBeforeUnmount(() => observer?.disconnect())

  return width
}
