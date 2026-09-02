import { onBeforeUnmount, watch, type Ref } from 'vue'

/**
 * Закриває спливний блок кліком поза ним або клавішею Esc.
 * Слухачі вішаються лише поки блок відкритий — щоб не тримати їх дарма.
 */
export function useDismissable(root: Ref<HTMLElement | null>, open: Ref<boolean>): void {
  function onPointerDown(event: PointerEvent): void {
    const element = root.value

    if (element !== null && !element.contains(event.target as Node)) {
      open.value = false
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      open.value = false
    }
  }

  function bind(): void {
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
  }

  function unbind(): void {
    document.removeEventListener('pointerdown', onPointerDown)
    document.removeEventListener('keydown', onKeyDown)
  }

  watch(open, (value) => (value ? bind() : unbind()))

  onBeforeUnmount(unbind)
}
