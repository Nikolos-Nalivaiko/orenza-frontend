<script setup lang="ts">
import { computed, useId } from 'vue'

const props = withDefaults(
  defineProps<{
    label: string
    placeholder?: string
    error?: string
    hint?: string
    optional?: boolean
    rows?: number
    /** Довжина, з якої лічильник починає підсвічуватись. */
    max?: number
  }>(),
  { rows: 4 },
)

const model = defineModel<string>({ required: true })

const id = useId()
const errorId = computed(() => `${id}-error`)
const hintId = computed(() => `${id}-hint`)

const length = computed(() => model.value.trim().length)
const over = computed(() => props.max !== undefined && length.value > props.max)

const describedBy = computed(() => {
  if (props.error !== undefined && props.error !== '') {
    return errorId.value
  }

  return props.hint === undefined || props.hint === '' ? undefined : hintId.value
})
</script>

<template>
  <div class="field" :class="{ 'field--invalid': error }">
    <label class="field__label" :for="id">
      {{ label }}
      <span v-if="optional" class="field__optional">необовʼязково</span>
    </label>

    <div class="field__shell">
      <span class="field__accent" aria-hidden="true" />

      <textarea
        :id="id"
        v-model="model"
        class="field__input"
        :rows="rows"
        :placeholder="placeholder"
        :aria-invalid="error ? true : undefined"
        :aria-describedby="describedBy"
      />
    </div>

    <div class="field__foot">
      <p v-if="error" :id="errorId" class="field__error" role="alert">
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
      <p v-else-if="hint" :id="hintId" class="field__hint">{{ hint }}</p>
      <span v-else />

      <!-- Лічильник зʼявляється лише коли є що рахувати — порожнє поле не тисне. -->
      <span
        v-if="max !== undefined && length > 0"
        class="field__count"
        :class="{ 'is-over': over }"
      >
        {{ length }} / {{ max }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.field {
  display: grid;
  gap: 7px;
}

.field__label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.field__optional {
  padding: 2px 7px;
  border-radius: 999px;
  background: var(--paper-sunk);
  color: var(--ink-faint);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.field__shell {
  position: relative;
  overflow: hidden;
  padding: 12px 16px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-raised);
  transition:
    border-color 0.2s var(--ease),
    box-shadow 0.2s var(--ease),
    background-color 0.2s var(--ease);
}

.field__shell:hover {
  border-color: var(--line-strong);
}

.field__accent {
  position: absolute;
  inset: auto auto auto 0;
  width: 3px;
  height: 0;
  background: var(--brand);
  transition: height 0.25s var(--ease);
}

.field__shell:focus-within {
  border-color: rgb(56 176 0 / 55%);
  box-shadow: 0 0 0 4px var(--brand-glow);
}

.field__shell:focus-within .field__accent {
  height: 60%;
}

.field__input {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  font-size: 15px;
  line-height: 1.55;
  letter-spacing: -0.01em;
  outline: none;
  resize: vertical;
}

.field__input::placeholder {
  color: var(--ink-faint);
}

.field__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.field__error,
.field__hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
}

.field__error {
  color: var(--danger);
}

.field__error svg {
  flex: none;
  width: 14px;
  height: 14px;
}

.field__hint {
  color: var(--ink-faint);
}

.field__count {
  flex: none;
  font-size: 12px;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.field__count.is-over {
  color: var(--danger);
  font-weight: 600;
}

.field--invalid .field__shell {
  border-color: rgb(200 52 31 / 45%);
  background: var(--danger-tint);
}

.field--invalid .field__accent {
  background: var(--danger);
}

.field--invalid .field__shell:focus-within {
  box-shadow: 0 0 0 4px rgb(200 52 31 / 14%);
}
</style>
