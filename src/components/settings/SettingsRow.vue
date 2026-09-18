<script setup lang="ts">
defineProps<{ label: string; hint?: string }>()
</script>

<template>
  <div class="row">
    <div class="row__meta">
      <p class="row__label">{{ label }}</p>
      <p v-if="hint || $slots.hint" class="row__hint">
        <slot name="hint">{{ hint }}</slot>
      </p>
    </div>

    <div class="row__control"><slot /></div>
  </div>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: minmax(200px, 1fr) minmax(0, 2fr);
  gap: 12px 48px;
  padding: 22px 24px;
}

.row + .row {
  border-top: 1px solid var(--line);
}

.row__meta {
  display: grid;
  align-content: start;
  gap: 4px;
  padding-top: 2px;
}

.row__label {
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ink);
}

.row__hint {
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--ink-faint);
}

.row__control {
  display: grid;
  align-content: start;
  gap: 14px;
  min-width: 0;
}

@media (width <= 760px) {
  .row {
    grid-template-columns: minmax(0, 1fr);
    padding: 18px;
  }
}
</style>
