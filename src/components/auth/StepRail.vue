<script setup lang="ts">
defineProps<{ steps: string[]; current: number }>()

defineEmits<{ jump: [index: number] }>()
</script>

<template>
  <ol class="rail" :aria-label="`Крок ${current + 1} з ${steps.length}`">
    <li
      v-for="(step, index) in steps"
      :key="step"
      class="rail__item"
      :class="{
        'rail__item--done': index < current,
        'rail__item--now': index === current,
      }"
    >
      <button
        type="button"
        class="rail__btn"
        :disabled="index >= current"
        :aria-current="index === current ? 'step' : undefined"
        @click="$emit('jump', index)"
      >
        <span class="rail__dot">
          <svg v-if="index < current" viewBox="0 0 14 14" aria-hidden="true">
            <path
              d="M3 7.3l2.6 2.6L11 4.4"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span v-else>{{ index + 1 }}</span>
        </span>
        <span class="rail__label">{{ step }}</span>
      </button>

      <span class="rail__track" aria-hidden="true"><span class="rail__fill" /></span>
    </li>
  </ol>
</template>

<style scoped>
.rail {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.rail__item {
  display: grid;
  gap: 8px;
}

.rail__btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
}

.rail__btn:disabled {
  cursor: default;
}

.rail__dot {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--line-strong);
  border-radius: 50%;
  background: var(--paper-raised);
  font-size: 11px;
  font-weight: 700;
  color: var(--ink-faint);
  transition:
    background-color 0.25s var(--ease),
    border-color 0.25s var(--ease),
    color 0.25s var(--ease);
}

.rail__dot svg {
  width: 12px;
  height: 12px;
}

.rail__label {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-faint);
  letter-spacing: -0.01em;
  transition: color 0.25s var(--ease);
}

.rail__track {
  display: block;
  height: 3px;
  border-radius: 999px;
  background: var(--paper-sunk);
  overflow: hidden;
}

.rail__fill {
  display: block;
  height: 100%;
  width: 0;
  border-radius: inherit;
  background: var(--brand);
  transition: width 0.45s var(--ease);
}

.rail__item--now .rail__dot {
  border-color: var(--ink);
  background: var(--ink);
  color: #fff;
}

.rail__item--now .rail__label {
  color: var(--ink);
}

.rail__item--now .rail__fill {
  width: 45%;
}

.rail__item--done .rail__dot {
  border-color: var(--brand);
  background: var(--brand);
  color: #08210a;
}

.rail__item--done .rail__label {
  color: var(--ink-muted);
}

.rail__item--done .rail__fill {
  width: 100%;
}
</style>
