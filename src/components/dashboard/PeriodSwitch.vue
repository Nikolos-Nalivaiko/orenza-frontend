<script setup lang="ts">
import { computed } from 'vue'
import { PERIODS, type Period } from '@/lib/dashboard'

const props = defineProps<{ modelValue: Period }>()
const emit = defineEmits<{ 'update:modelValue': [Period] }>()

const index = computed(() => PERIODS.findIndex((item) => item.value === props.modelValue))

function pick(value: Period): void {
  if (value !== props.modelValue) {
    emit('update:modelValue', value)
  }
}
</script>

<template>
  <div
    class="seg"
    :style="{ '--n': PERIODS.length, '--i': Math.max(0, index) }"
    role="group"
    aria-label="Період"
  >
    <span class="seg__pill" aria-hidden="true" />

    <button
      v-for="item in PERIODS"
      :key="item.value"
      type="button"
      class="seg__btn"
      :class="{ 'seg__btn--on': item.value === modelValue }"
      :aria-pressed="item.value === modelValue"
      :title="item.hint"
      @click="pick(item.value)"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<style scoped>
.seg {
  position: relative;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 0;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-sunk);
}

/* Плашка їде під підписами — перемикання читається як рух, а не як перемальовка. */
.seg__pill {
  position: absolute;
  top: 3px;
  bottom: 3px;
  left: 3px;
  width: calc((100% - 6px) / var(--n));
  border-radius: 999px;
  background: var(--paper-raised);
  box-shadow: var(--shadow-sm);
  transform: translateX(calc(var(--i) * 100%));
  transition: transform 0.28s var(--ease);
}

.seg__btn {
  position: relative;
  padding: 6px 15px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--ink-faint);
  transition: color 0.2s var(--ease);
}

.seg__btn:hover {
  color: var(--ink-muted);
}

.seg__btn--on {
  color: var(--ink);
}
</style>
