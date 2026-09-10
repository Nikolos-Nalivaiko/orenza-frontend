<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import { formatObjects } from '@/lib/clients'

const props = defineProps<{
  name: string
  objects: number
  due: number
  saving?: boolean
  serverError?: string | null
}>()

const emit = defineEmits<{ confirm: []; close: [] }>()

const titleId = useId()

const linked = computed(() => props.objects > 0)
const debt = computed(() => props.due > 0.01)

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape' && props.saving !== true) {
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
  <div class="overlay" @click.self="saving !== true && emit('close')">
    <div class="dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <span class="dialog__icon" :class="{ 'dialog__icon--warn': linked }" aria-hidden="true">
        <AppIcon :name="linked ? 'alert' : 'trash'" />
      </span>

      <h2 :id="titleId" class="display dialog__title">Видалити «{{ name }}»?</h2>

      <p class="dialog__text">
        <template v-if="objects === 1">
          Обʼєкт замовника лишиться на місці, але без замовника: імʼя й телефон зникнуть з його
          картки.
        </template>
        <template v-else-if="linked">
          У замовника {{ formatObjects(objects) }} — вони лишаться на місці, але без замовника: імʼя
          й телефон зникнуть з їхніх карток.
        </template>
        <template v-else>
          Замовника ще не привʼязано до жодного обʼєкта — з ним зникнуть лише контакти, знижка й
          нотатки.
        </template>
        Видалення остаточне: повернути замовника буде нізвідки.
      </p>

      <!-- Борг зникає разом з людиною — це те, про що шкодують уже потім. -->
      <p v-if="debt" class="dialog__debt">
        <AppIcon name="wallet" />
        <span>
          За замовником рахується <strong>{{ formatAmount(due) }} ₴</strong> — після видалення цей
          борг не буде з кого спитати.
        </span>
      </p>

      <p v-if="serverError" class="dialog__error" role="alert">{{ serverError }}</p>

      <div class="dialog__actions">
        <button type="button" class="btn btn--ghost" :disabled="saving" @click="emit('close')">
          Скасувати
        </button>

        <button type="button" class="btn btn--danger" :disabled="saving" @click="emit('confirm')">
          <span v-if="saving" class="spinner" aria-hidden="true" />
          <span>{{ saving ? 'Видаляємо…' : 'Видалити замовника' }}</span>
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
  overflow-wrap: anywhere;
}

.dialog__text {
  max-width: 46ch;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--ink-muted);
}

.dialog__debt {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-sunk);
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink-muted);
}

.dialog__debt :deep(.icon) {
  flex: none;
  width: 16px;
  height: 16px;
  color: var(--ink-faint);
}

.dialog__debt strong {
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.dialog__error {
  width: 100%;
  padding: 12px 14px;
  border: 1px solid rgb(200 52 31 / 30%);
  border-radius: var(--r-md);
  background: var(--danger-tint);
  color: var(--danger);
  font-size: 13px;
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

.spinner {
  width: 14px;
  height: 14px;
}
</style>
