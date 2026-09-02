<script setup lang="ts">
import { computed, useId } from 'vue'
import { formatDay, todayIso } from '@/lib/objects'

const props = defineProps<{
  label: string
  error?: string
  hint?: string
  optional?: boolean
  /** Межі беремо з сусіднього поля пари: кінець не може бути раніше початку. */
  min?: string
  max?: string
}>()

const model = defineModel<string>({ required: true })

const id = useId()
const errorId = computed(() => `${id}-error`)
const hintId = computed(() => `${id}-hint`)

const filled = computed(() => model.value !== '')

/**
 * Нативний date-input показує дату в локалі браузера, а вона не завжди
 * українська — тож підпис дублюємо своїм форматом.
 */
const readable = computed(() => formatDay(model.value))

const describedBy = computed(() => {
  if (props.error !== undefined && props.error !== '') {
    return errorId.value
  }

  return props.hint === undefined || props.hint === '' ? undefined : hintId.value
})
</script>

<template>
  <div class="date" :class="{ 'date--invalid': error, 'date--filled': filled }">
    <div class="date__top">
      <label class="date__label" :for="id">
        {{ label }}
        <span v-if="optional" class="date__optional">необовʼязково</span>
      </label>

      <div class="date__tools">
        <button type="button" class="date__tool" @click="model = todayIso()">Сьогодні</button>
        <button v-if="filled" type="button" class="date__tool" @click="model = ''">Очистити</button>
      </div>
    </div>

    <div class="date__shell">
      <span class="date__accent" aria-hidden="true" />

      <input
        :id="id"
        v-model="model"
        class="date__input"
        type="date"
        :min="min"
        :max="max"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="describedBy"
      />

      <span v-if="readable" class="date__readable">{{ readable }}</span>
    </div>

    <p v-if="error" :id="errorId" class="date__error" role="alert">
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.6" />
        <path
          d="M8 4.6v4.2M8 11.2h.01"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
        />
      </svg>
      {{ error }}
    </p>
    <p v-else-if="hint" :id="hintId" class="date__hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.date {
  display: grid;
  gap: 7px;
  min-width: 0;

  /* Дубль дати ховаємо за шириною самого поля, а не екрана: у парі дат
     воно вужче за вікно. */
  container-type: inline-size;
}

/* Швидкі дії переносяться під підпис, коли поле вузьке, — інакше вони
   задають полю мінімальну ширину й пара дат вилазить за карту. */
.date__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 10px;
}

.date__label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.date__optional {
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--paper-sunk);
  color: var(--ink-faint);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

/* Швидкі дії тихі, поки поле не чіпають — вони підказка, а не заклик. */
.date__tools {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.18s var(--ease);
}

.date:hover .date__tools,
.date:focus-within .date__tools {
  opacity: 1;
}

.date__tool {
  padding: 2px 7px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-faint);
  font-size: 11px;
  font-weight: 600;
  transition:
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.date__tool:hover {
  background: var(--paper-sunk);
  color: var(--ink);
}

.date__shell {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  overflow: hidden;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-raised);
  transition:
    border-color 0.2s var(--ease),
    box-shadow 0.2s var(--ease),
    background-color 0.2s var(--ease);
}

.date__shell:hover {
  border-color: var(--line-strong);
}

.date__accent {
  position: absolute;
  inset: auto auto auto 0;
  width: 3px;
  height: 0;
  background: var(--brand);
  transition: height 0.25s var(--ease);
}

.date__shell:focus-within {
  border-color: rgb(56 176 0 / 55%);
  box-shadow: 0 0 0 4px var(--brand-glow);
}

.date__shell:focus-within .date__accent {
  height: 60%;
}

.date__input {
  width: 100%;
  min-width: 0;
  flex: 1 1 0;
  min-height: 52px;
  border: 0;
  background: transparent;
  font-size: 15px;
  letter-spacing: -0.01em;
  outline: none;
  color: var(--ink-faint);
}

.date--filled .date__input {
  color: var(--ink);
}

.date__input::-webkit-calendar-picker-indicator {
  opacity: 0.45;
  cursor: pointer;
}

.date__input::-webkit-calendar-picker-indicator:hover {
  opacity: 1;
}

.date__readable {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--paper-sunk);
  color: var(--ink-muted);
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
}

.date__error,
.date__hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
}

.date__error {
  color: var(--danger);
}

.date__error svg {
  flex: none;
  width: 14px;
  height: 14px;
}

.date__hint {
  color: var(--ink-faint);
}

.date--invalid .date__shell {
  border-color: rgb(200 52 31 / 45%);
  background: var(--danger-tint);
}

.date--invalid .date__accent {
  background: var(--danger);
}

.date--invalid .date__shell:focus-within {
  box-shadow: 0 0 0 4px rgb(200 52 31 / 14%);
}

@container (width < 260px) {
  .date__readable {
    display: none;
  }
}
</style>
