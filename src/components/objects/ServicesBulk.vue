<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'
import {
  formatWorks,
  SERVICE_STATUS_ICONS,
  SERVICE_STATUSES,
  type ServiceStatus,
} from '@/lib/services'

/**
 * Масові дії. Реальна ситуація — бригада зайшла на обʼєкт і почала одразу
 * кілька видів робіт: відмічати їх по одному ніхто не буде.
 *
 * Панель липне до низу екрана: список довший за вікно, і кнопка під таблицею
 * була б за межами того місця, де людина щойно ставила галочки.
 */

defineProps<{ count: number }>()

const emit = defineEmits<{ status: [status: ServiceStatus]; clear: [] }>()
</script>

<template>
  <div class="bulk">
    <p class="bulk__count">Обрано {{ formatWorks(count) }}</p>

    <div class="bulk__actions">
      <span class="bulk__label">Змінити стадію:</span>

      <button
        v-for="status in SERVICE_STATUSES"
        :key="status.value"
        type="button"
        class="go"
        @click="emit('status', status.value)"
      >
        <AppIcon :name="SERVICE_STATUS_ICONS[status.value]" />
        {{ status.label }}
      </button>
    </div>

    <button type="button" class="drop" @click="emit('clear')">
      <AppIcon name="close" />
      Зняти вибір
    </button>
  </div>
</template>

<style scoped>
.bulk {
  position: sticky;
  bottom: 14px;
  z-index: 20;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px 22px;
  margin-top: 6px;
  padding: 12px 18px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-raised);
  box-shadow: var(--shadow-md);
}

.bulk__count {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.bulk__actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.bulk__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.go {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.go:hover {
  border-color: var(--brand);
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.go :deep(.icon) {
  width: 14px;
  height: 14px;
}

.drop {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-left: auto;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-muted);
  white-space: nowrap;
  transition: color 0.16s var(--ease);
}

.drop:hover {
  color: var(--ink);
}

.drop :deep(.icon) {
  width: 14px;
  height: 14px;
}

@media (width <= 720px) {
  .bulk {
    border-radius: var(--r-lg);
  }

  .drop {
    margin-left: 0;
  }
}
</style>
