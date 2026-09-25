<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'
import type { ObjectStatus } from '@/lib/objects'

withDefaults(defineProps<{ status: ObjectStatus; size?: number }>(), { size: 40 })
</script>

<template>
  <span
    class="oicon"
    :class="`oicon--${status}`"
    :style="{ '--size': `${size}px` }"
    aria-hidden="true"
  >
    <AppIcon name="site" />
  </span>
</template>

<style scoped>
.oicon {
  display: grid;
  flex: none;
  place-items: center;
  width: var(--size);
  height: var(--size);
  border: 1px solid transparent;
  border-radius: calc(var(--size) / 3);
  background: var(--paper-sunk);
  color: var(--ink-muted);
}

.oicon :deep(.icon) {
  width: 50%;
  height: 50%;
}

.oicon--in_progress {
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.oicon--paused {
  background: var(--amber-tint);
  color: var(--amber);
}

.oicon--done {
  background: transparent;
  border-color: var(--line);
  color: var(--ink-faint);
}
</style>
