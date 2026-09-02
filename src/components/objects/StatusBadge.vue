<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { OBJECT_STATUSES, type ObjectStatus } from '@/lib/objects'

const props = defineProps<{ status: ObjectStatus; label: string }>()

const icon = computed(
  () => OBJECT_STATUSES.find((item) => item.value === props.status)?.icon ?? 'calendar',
)
</script>

<template>
  <span class="badge" :class="`badge--${status}`">
    <AppIcon :name="icon" />
    {{ label }}
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 8px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--paper-sunk);
  color: var(--ink-muted);
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
}

.badge :deep(.icon) {
  width: 13px;
  height: 13px;
}

/* Кольором світиться лише те, що потребує уваги: робота йде, робота стоїть. */
.badge--in_progress {
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.badge--paused {
  background: var(--amber-tint);
  color: var(--amber);
}

.badge--done {
  background: transparent;
  border-color: var(--line);
  color: var(--ink-faint);
}
</style>
