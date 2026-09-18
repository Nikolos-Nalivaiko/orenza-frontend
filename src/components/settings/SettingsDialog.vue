<script setup lang="ts">
import { onBeforeUnmount, onMounted, useId, useTemplateRef } from 'vue'

const props = defineProps<{
  title: string
  busy: boolean
  error: string | null
}>()

const emit = defineEmits<{ submit: []; close: [] }>()

const titleId = useId()
const dialog = useTemplateRef<HTMLElement>('dialog')

let bodyOverflow = ''

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && !props.busy) {
    emit('close')

    return
  }

  if (event.key !== 'Tab' || dialog.value === null) {
    return
  }

  const focusable = [
    ...dialog.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href]',
    ),
  ]

  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (first === undefined || last === undefined) {
    return
  }

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  bodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKeydown)
  dialog.value?.querySelector<HTMLInputElement>('input')?.focus()
})

onBeforeUnmount(() => {
  document.body.style.overflow = bodyOverflow
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <Teleport to="body">
    <div class="overlay" @click.self="!busy && emit('close')">
      <form
        ref="dialog"
        class="dialog"
        role="alertdialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        novalidate
        @submit.prevent="emit('submit')"
      >
        <header class="dialog__head">
          <h2 :id="titleId" class="dialog__title">{{ title }}</h2>
        </header>

        <div class="dialog__body">
          <slot />

          <p v-if="error" class="dialog__error" role="alert">{{ error }}</p>
        </div>

        <footer class="dialog__foot">
          <slot name="actions" />
        </footer>
      </form>
    </div>
  </Teleport>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 20px;
  overflow-y: auto;
  background: rgb(9 13 10 / 52%);
  animation: overlay-in 0.16s ease-out;
}

.dialog {
  display: grid;
  width: min(500px, 100%);
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--paper-raised);
  box-shadow: 0 30px 60px -30px rgb(12 17 14 / 55%);
  animation: dialog-in 0.2s var(--ease);
}

@keyframes overlay-in {
  from {
    opacity: 0;
  }
}

@keyframes dialog-in {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}

.dialog__head {
  padding: 18px 24px;
  border-bottom: 1px solid var(--line);
}

.dialog__title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.015em;
  overflow-wrap: anywhere;
}

.dialog__body {
  display: grid;
  gap: 16px;
  padding: 20px 24px 22px;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--ink-muted);
}

.dialog__error {
  padding: 10px 12px;
  border-left: 2px solid var(--danger);
  background: var(--danger-tint);
  color: var(--danger);
  font-size: 13px;
}

.dialog__foot {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 24px;
  border-top: 1px solid var(--line);
  background: var(--paper);
}

.dialog__foot :deep(.btn) {
  min-height: 38px;
  padding: 0 14px;
  border-radius: var(--r-xs);
  font-size: 13.5px;
  box-shadow: none;
}

.dialog__foot :deep(.btn:hover:not(:disabled)) {
  transform: none;
}

.dialog__foot :deep(.btn--danger) {
  --btn-bg: var(--danger);
  --btn-fg: #fff;
}

.dialog__foot :deep(.btn--danger:hover:not(:disabled)) {
  --btn-bg: #b02c19;
}

.dialog__foot :deep(.spinner) {
  width: 13px;
  height: 13px;
}

@media (width <= 560px) {
  .dialog__head,
  .dialog__body,
  .dialog__foot {
    padding-inline: 18px;
  }

  .dialog__foot :deep(.btn) {
    flex: 1;
  }
}
</style>
