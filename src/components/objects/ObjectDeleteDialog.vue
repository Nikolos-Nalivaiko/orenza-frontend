<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'

defineProps<{
  name: string
  /**
   * Обʼєкт уже має історію — матеріали, роботи чи платежі. Такий не видаляємо
   * взагалі: втратити кошторис через один клік дорожче, ніж зайвий запис.
   */
  blocked: boolean
}>()

const emit = defineEmits<{ confirm: []; archive: []; close: [] }>()

const titleId = useId()

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close')
  }
}

const bodyOverflow = ref('')

onMounted(() => {
  bodyOverflow.value = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.body.style.overflow = bodyOverflow.value
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <span class="dialog__icon" :class="{ 'dialog__icon--warn': blocked }" aria-hidden="true">
        <AppIcon :name="blocked ? 'alert' : 'trash'" />
      </span>

      <h2 :id="titleId" class="display dialog__title">
        {{ blocked ? 'Цей обʼєкт краще архівувати' : `Видалити «${name}»?` }}
      </h2>

      <p class="dialog__text">
        <template v-if="blocked">
          В обʼєкті вже є матеріали, роботи або платежі. Видалення забрало б із собою всю цю
          історію, тож ми його не пропонуємо — архів прибере обʼєкт зі списку, лишивши дані на
          місці.
        </template>
        <template v-else>
          Обʼєкт порожній: ні матеріалів, ні робіт, ні платежів. Видалення остаточне — повернути
          його буде нізвідки.
        </template>
      </p>

      <div class="dialog__actions">
        <button type="button" class="btn btn--ghost" @click="emit('close')">Скасувати</button>

        <button v-if="blocked" type="button" class="btn btn--ink" @click="emit('archive')">
          Архівувати
        </button>
        <button v-else type="button" class="btn btn--danger" @click="emit('confirm')">
          Видалити обʼєкт
        </button>
      </div>
    </div>
  </div>
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
  background: rgb(9 13 10 / 46%);
  backdrop-filter: blur(6px);
}

.dialog {
  display: grid;
  justify-items: start;
  gap: 12px;
  width: min(440px, 100%);
  padding: 28px;
  border-radius: var(--r-xl);
  background: var(--paper-raised);
  box-shadow: var(--shadow-lg);
}

.dialog__icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: var(--danger-tint);
  color: var(--danger);
}

.dialog__icon--warn {
  background: var(--amber-tint);
  color: var(--amber);
}

.dialog__icon :deep(.icon) {
  width: 21px;
  height: 21px;
}

.dialog__title {
  font-size: 21px;
}

.dialog__text {
  max-width: 46ch;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--ink-muted);
}

.dialog__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
}

.btn--danger {
  --btn-bg: var(--danger);
  --btn-fg: #fff;
}

.btn--danger:hover:not(:disabled) {
  --btn-bg: #b02c19;
}
</style>
