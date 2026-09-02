<script setup lang="ts">
import { useId } from 'vue'

defineProps<{ error?: string }>()

const model = defineModel<boolean>({ required: true })
const id = useId()
</script>

<template>
  <div class="check" :class="{ 'check--invalid': error }">
    <label class="check__row" :for="id">
      <input :id="id" v-model="model" type="checkbox" class="check__input" />
      <span class="check__box" aria-hidden="true">
        <svg viewBox="0 0 14 14">
          <path
            d="M3 7.3l2.6 2.6L11 4.4"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
      <span class="check__text"><slot /></span>
    </label>

    <p v-if="error" class="check__error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.check {
  display: grid;
  gap: 6px;
}

.check__row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 11px;
  align-items: start;
  cursor: pointer;
}

.check__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.check__box {
  display: grid;
  place-items: center;
  width: 21px;
  height: 21px;
  margin-top: 1px;
  border: 1px solid var(--line-strong);
  border-radius: 7px;
  background: var(--paper-raised);
  color: transparent;
  transition:
    background-color 0.18s var(--ease),
    border-color 0.18s var(--ease),
    color 0.18s var(--ease);
}

.check__box svg {
  width: 12px;
  height: 12px;
}

.check__input:checked + .check__box {
  border-color: var(--brand);
  background: var(--brand);
  color: #08210a;
}

.check__input:focus-visible + .check__box {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

.check__text {
  font-size: 13px;
  line-height: 1.45;
  color: var(--ink-muted);
}

.check__error {
  padding-left: 32px;
  font-size: 12.5px;
  color: var(--danger);
}

.check--invalid .check__box {
  border-color: rgb(200 52 31 / 55%);
}
</style>
