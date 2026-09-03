<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, useTemplateRef } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount, parseAmount } from '@/lib/amount'
import type { Service } from '@/lib/services'

/**
 * «Скільки по факту?» — питання, яке має прозвучати в момент, коли роботу
 * закривають, а не колись потім. Статус на «виконано» переводять щодня,
 * а повертаються дозаповнити цифри — майже ніколи.
 *
 * Вікно навмисно крихітне: одне поле, дві підказки й кнопка.
 */

const props = defineProps<{
  service: Service
  /** Вікно відкрилось саме через переведення в «Виконано». */
  closing: boolean
}>()

const emit = defineEmits<{ save: [volume: number | null]; close: [] }>()

const titleId = useId()

const field = useTemplateRef<HTMLInputElement>('field')

const draft = ref(props.service.actual_volume === null ? '' : String(props.service.actual_volume))
const problem = ref('')

const parsed = computed(() => parseAmount(draft.value))

/** Сума роботи одразу перераховується — саме заради неї факт і вносять. */
const total = computed(() => {
  const volume = parsed.value ?? props.service.planned_volume

  return (props.service.client_price ?? 0) * volume
})

const shift = computed(() => {
  const value = parsed.value

  return value === null ? null : value - props.service.planned_volume
})

function save(): void {
  const raw = draft.value.trim()

  if (raw === '') {
    emit('save', null)

    return
  }

  const value = parsed.value

  if (value === null) {
    problem.value = 'Тільки число'

    return
  }

  if (value < 0) {
    problem.value = 'Не менше нуля'

    return
  }

  emit('save', value)
}

function fillPlan(): void {
  draft.value = String(props.service.planned_volume)
  problem.value = ''
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close')
  }
}

const bodyOverflow = ref('')

onMounted(async () => {
  bodyOverflow.value = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKeydown)

  await nextTick()
  field.value?.focus()
  field.value?.select()
})

onBeforeUnmount(() => {
  document.body.style.overflow = bodyOverflow.value
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <form
      class="dialog"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @submit.prevent="save"
    >
      <header class="dialog__head">
        <div class="dialog__intro">
          <h2 :id="titleId" class="display dialog__title">Скільки по факту?</h2>
          <p class="dialog__sub">{{ service.name }}</p>
        </div>

        <button type="button" class="dialog__close" aria-label="Закрити" @click="emit('close')">
          <AppIcon name="close" />
        </button>
      </header>

      <p v-if="closing" class="hint">
        Робота йде в «Виконано» — внесіть фактичний обсяг, і сума перерахується за ним. Можна
        пропустити: тоді рахуємо за планом.
      </p>

      <label class="field">
        <span class="field__label">Обсяг за фактом, {{ service.unit }}</span>

        <div class="field__row">
          <input
            ref="field"
            v-model="draft"
            class="ctl ctl--num field__input"
            :class="{ 'ctl--bad': problem }"
            type="text"
            inputmode="decimal"
            :placeholder="String(service.planned_volume)"
            @input="problem = ''"
          />

          <button type="button" class="quick" @click="fillPlan">Як у плані</button>
        </div>

        <span v-if="problem" class="field__bad">{{ problem }}</span>
      </label>

      <dl class="sums">
        <div class="sum">
          <dt>План</dt>
          <dd>{{ formatAmount(service.planned_volume) }} {{ service.unit }}</dd>
        </div>

        <div v-if="shift !== null && shift !== 0" class="sum">
          <dt>Різниця</dt>
          <dd :class="shift > 0 ? 'is-up' : 'is-down'">
            {{ shift > 0 ? '+' : '−' }}{{ formatAmount(Math.abs(shift)) }} {{ service.unit }}
          </dd>
        </div>

        <div class="sum sum--lead">
          <dt>Сума клієнту</dt>
          <dd>{{ formatAmount(total) }} ₴</dd>
        </div>
      </dl>

      <footer class="dialog__foot">
        <button type="submit" class="btn btn--primary btn--sm">Зберегти</button>
        <button type="button" class="btn btn--ghost btn--sm" @click="emit('close')">
          {{ closing ? 'Пропустити' : 'Скасувати' }}
        </button>

        <span class="dialog__hint">Enter — зберегти</span>
      </footer>
    </form>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 45;
  display: grid;
  place-items: center;
  padding: 20px;
  overflow-y: auto;
  background: rgb(9 13 10 / 46%);
  backdrop-filter: blur(6px);
}

.dialog {
  display: grid;
  gap: 16px;
  width: min(440px, 100%);
  padding: 26px 28px;
  border-radius: var(--r-xl);
  background: var(--paper-raised);
  box-shadow: var(--shadow-lg);
}

.dialog__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.dialog__intro {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.dialog__title {
  font-size: 19px;
}

.dialog__sub {
  font-size: 12.5px;
  color: var(--ink-muted);
}

.dialog__close {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--ink-faint);
  transition:
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.dialog__close:hover {
  background: var(--paper-sunk);
  color: var(--ink);
}

.dialog__close :deep(.icon) {
  width: 16px;
  height: 16px;
}

.hint {
  padding: 10px 14px;
  border-radius: var(--r-sm);
  background: var(--brand-tint);
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--brand-strong);
}

.field {
  display: grid;
  gap: 7px;
}

.field__label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.field__row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.field__input {
  height: 44px;
  font-size: 16px;
  font-weight: 600;
}

.field__bad {
  font-size: 11.5px;
  color: var(--danger);
}

/* Найчастіший факт — рівно те, що планували: не змушуємо це передруковувати. */
.quick {
  flex: none;
  padding: 0 14px;
  height: 44px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-xs);
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-muted);
  white-space: nowrap;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.quick:hover {
  border-style: solid;
  border-color: var(--brand);
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.sums {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px 22px;
  margin: 0;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.sum {
  display: grid;
  gap: 4px;
}

.sum dt {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.sum dd {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

.sum--lead {
  margin-left: auto;
  text-align: right;
}

.sum--lead dd {
  font-size: 18px;
  color: var(--ink);
}

.is-up {
  color: var(--brand-strong);
}

.is-down {
  color: var(--danger);
}

.dialog__foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.dialog__hint {
  margin-left: auto;
  font-size: 11.5px;
  color: var(--ink-faint);
}
</style>
