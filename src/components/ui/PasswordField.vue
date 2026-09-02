<script setup lang="ts">
import { ref } from 'vue'
import TextField from './TextField.vue'

defineProps<{
  label: string
  autocomplete?: string
  error?: string
  hint?: string
  placeholder?: string
}>()

const model = defineModel<string>({ required: true })
const visible = ref(false)
</script>

<template>
  <TextField
    v-model="model"
    :label="label"
    :type="visible ? 'text' : 'password'"
    :autocomplete="autocomplete"
    :error="error"
    :hint="hint"
    :placeholder="placeholder ?? '••••••••'"
  >
    <template #suffix>
      <button
        type="button"
        class="reveal"
        :aria-label="visible ? 'Сховати пароль' : 'Показати пароль'"
        :aria-pressed="visible"
        @click="visible = !visible"
      >
        <svg v-if="!visible" viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M1.8 10S4.9 4.6 10 4.6 18.2 10 18.2 10 15.1 15.4 10 15.4 1.8 10 1.8 10Z"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <circle cx="10" cy="10" r="2.6" fill="none" stroke="currentColor" stroke-width="1.5" />
        </svg>
        <svg v-else viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M3.2 3.2l13.6 13.6M8.1 8.2A2.6 2.6 0 0 0 10 12.6c.7 0 1.4-.3 1.9-.8M6 5.6C7.2 5 8.5 4.6 10 4.6c5.1 0 8.2 5.4 8.2 5.4a15 15 0 0 1-2.7 3.3M4.5 7A15.6 15.6 0 0 0 1.8 10S4.9 15.4 10 15.4c.6 0 1.2-.1 1.7-.2"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
      </button>
    </template>
  </TextField>
</template>

<style scoped>
.reveal {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--ink-muted);
  transition:
    background-color 0.2s var(--ease),
    color 0.2s var(--ease);
}

.reveal:hover {
  background: var(--paper-sunk);
  color: var(--ink);
}

.reveal svg {
  width: 18px;
  height: 18px;
}
</style>
