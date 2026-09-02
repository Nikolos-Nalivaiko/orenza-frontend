<script setup lang="ts">
withDefaults(defineProps<{ title: string; hint?: string; dim?: boolean; flush?: boolean }>(), {
  hint: '',
  dim: false,
  flush: false,
})
</script>

<template>
  <section class="panel" :class="{ 'panel--dim': dim, 'panel--flush': flush }">
    <header class="panel__head">
      <div class="panel__text">
        <h2 class="panel__title">{{ title }}</h2>
        <p v-if="hint" class="panel__hint">{{ hint }}</p>
      </div>

      <div class="panel__action">
        <slot name="action" />
      </div>
    </header>

    <div class="panel__body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.panel {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 16px;
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
  transition:
    opacity 0.24s var(--ease),
    border-color 0.22s var(--ease);
}

/*
 * Під час перезапиту карта лишається на місці й лише блідне: скелетон тут
 * зламав би розкладку та зʼїв контекст, який читач уже тримає в голові.
 */
.panel--dim {
  opacity: 0.45;
  pointer-events: none;
}

/* Рядки на всю ширину карти — але не за її заокруглені кути. */
.panel--flush {
  overflow: hidden;
}

.panel--flush .panel__body {
  margin: 0 -20px -20px;
}

.panel__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.panel__text {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.panel__title {
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.panel__hint {
  font-size: 12px;
  color: var(--ink-faint);
}

.panel__action {
  flex: none;
}

.panel__body {
  min-width: 0;
}
</style>
