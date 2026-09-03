<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import {
  SERVICE_STATUS_ICONS,
  SERVICE_STATUSES,
  type ServicesSummary,
  type ServiceStatus,
} from '@/lib/services'

/**
 * Зведення по роботах — один тонкий рядок, підпис до таблиці під ним.
 *
 * Друга половина рядка — стадії робіт. Вони ж і фільтр: показувати ті самі
 * три статуси ще раз у панелі інструментів немає сенсу, а «що ще не почали» —
 * найчастіший погляд на цей екран.
 */

defineProps<{
  summary: ServicesSummary
  statuses: ServiceStatus[]
  /** Приватний простір: виконавців немає, тож ні ЗП, ні профіту. */
  solo: boolean
}>()

const emit = defineEmits<{ stage: [status: ServiceStatus] }>()
</script>

<template>
  <div class="ssum">
    <dl class="figs">
      <div class="fig">
        <dt>Робіт</dt>
        <dd>{{ summary.total }}</dd>
      </div>

      <div class="fig">
        <dt>Сума для клієнта</dt>
        <dd>{{ formatAmount(summary.revenue) }} ₴</dd>
      </div>

      <template v-if="!solo">
        <div class="fig">
          <dt>ЗП виконавцям</dt>
          <dd>{{ formatAmount(summary.cost) }} ₴</dd>
        </div>

        <div class="fig fig--profit" :class="{ 'fig--minus': summary.profit < 0 }">
          <dt>Профіт</dt>
          <dd>{{ formatAmount(summary.profit) }} ₴</dd>
        </div>
      </template>
    </dl>

    <div class="stages" role="group" aria-label="Фільтр за стадією роботи">
      <button
        v-for="status in SERVICE_STATUSES"
        :key="status.value"
        type="button"
        class="stage"
        :class="[`stage--${status.value}`, { 'stage--on': statuses.includes(status.value) }]"
        :aria-pressed="statuses.includes(status.value)"
        :title="`Показати тільки «${status.label}»`"
        @click="emit('stage', status.value)"
      >
        <AppIcon :name="SERVICE_STATUS_ICONS[status.value]" class="stage__icon" />
        {{ status.label }}
        <span class="stage__count">{{ summary.byStatus[status.value] }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.ssum {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px 32px;
}

/* ── Цифри ─────────────────────────────────────────────────────── */

.figs {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 10px 30px;
  margin: 0;
}

.fig {
  display: flex;
  align-items: baseline;
  gap: 9px;
  white-space: nowrap;
}

.fig dt {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.fig dd {
  margin: 0;
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
}

.fig--profit dd {
  color: var(--brand-strong);
}

.fig--minus dd {
  color: var(--danger);
}

/* ── Стадії ────────────────────────────────────────────────────── */

.stages {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.stage {
  --tone: var(--ink-muted);
  --tone-tint: var(--paper-sunk);

  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 13px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-raised);
  color: var(--ink-muted);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.stage:hover {
  border-color: var(--line-strong);
  color: var(--ink);
}

/* Колір стадії вмикається лише на увімкненому фільтрі — інакше три
   різнокольорові плашки поруч читаються як світлофор без сенсу. */
.stage--planned {
  --tone: var(--amber);
  --tone-tint: var(--amber-tint);
}

.stage--in_progress {
  --tone: var(--c-4);
  --tone-tint: var(--c-4-soft);
}

.stage--done {
  --tone: var(--brand-strong);
  --tone-tint: var(--brand-tint);
}

.stage--on {
  border-color: var(--tone);
  background: var(--tone-tint);
  color: var(--tone);
}

.stage__icon {
  width: 14px;
  height: 14px;
  color: var(--ink-faint);
}

.stage--on .stage__icon {
  color: inherit;
}

.stage__count {
  min-width: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 11px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.stage--on .stage__count {
  background: rgb(255 255 255 / 55%);
}
</style>
