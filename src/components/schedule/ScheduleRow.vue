<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import {
  EVENT_KIND_ICONS,
  EVENT_KIND_LABELS,
  formatShortDay,
  formatWhen,
  type ScheduleEvent,
} from '@/lib/schedule'

/**
 * Один рядок графіка. Подія завжди веде в обʼєкт: графік лише нагадує, що
 * сьогодні важливо, а правлять дати й платежі там, де їх завели.
 */
defineProps<{
  event: ScheduleEvent
  /** Дата в самому рядку — там, де над ним немає заголовка дня. */
  withDate?: boolean
}>()
</script>

<template>
  <li
    class="ev"
    :class="[`ev--${event.kind}`, { 'ev--late': event.overdue, 'ev--today': event.daysLeft === 0 }]"
  >
    <span class="ev__icon" aria-hidden="true">
      <AppIcon :name="EVENT_KIND_ICONS[event.kind]" />
    </span>

    <div class="ev__main">
      <p class="ev__title">{{ event.title }}</p>

      <p class="ev__meta">
        <span class="ev__kind">{{ EVENT_KIND_LABELS[event.kind] }}</span>
        <RouterLink class="ev__obj" :to="{ name: 'object', params: { id: event.object.id } }">
          {{ event.object.name }}
        </RouterLink>
        <span v-if="event.object.client" class="ev__client">{{ event.object.client.name }}</span>
      </p>
    </div>

    <p v-if="event.amount !== null" class="ev__sum">
      {{ formatAmount(event.amount) }} <span class="ev__cur">₴</span>
    </p>

    <p class="ev__when">
      <span v-if="withDate" class="ev__date">{{ formatShortDay(event.date) }}</span>
      <span class="ev__left">{{ formatWhen(event.daysLeft) }}</span>
    </p>
  </li>
</template>

<style scoped>
.ev {
  --tone: var(--ink-muted);
  --tone-tint: var(--paper-sunk);

  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  padding: 11px 14px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--paper-raised);
  transition: border-color 0.16s var(--ease);
}

.ev:hover {
  border-color: var(--line-strong);
}

/* Тон рядка — його тип: вихід на обʼєкт, здача, гроші. */
.ev--start {
  --tone: var(--c-4);
  --tone-tint: var(--c-4-soft);
}

.ev--finish {
  --tone: var(--c-2);
  --tone-tint: var(--c-2-soft);
}

.ev--payment {
  --tone: var(--brand-strong);
  --tone-tint: var(--c-1-soft);
}

.ev--late {
  --tone: var(--danger);
  --tone-tint: var(--danger-tint);

  border-color: rgb(200 52 31 / 26%);
}

.ev--today:not(.ev--late) {
  --tone: var(--amber);
  --tone-tint: var(--amber-tint);
}

.ev__icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 11px;
  background: var(--tone-tint);
  color: var(--tone);
}

.ev__icon :deep(.icon) {
  width: 17px;
  height: 17px;
}

.ev__main {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.ev__title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ev__meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px 8px;
  min-width: 0;
  font-size: 12.5px;
  color: var(--ink-faint);
}

.ev__kind {
  font-weight: 600;
  color: var(--tone);
}

.ev__obj {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink-muted);
  text-decoration: none;
  border-bottom: 1px solid var(--line-strong);
}

.ev__obj:hover {
  color: var(--ink);
}

.ev__client::before {
  content: '·';
  margin-right: 8px;
}

.ev__sum {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.ev__cur {
  color: var(--ink-faint);
  font-weight: 500;
}

.ev__when {
  display: grid;
  justify-items: end;
  gap: 2px;
  min-width: 96px;
  font-size: 12.5px;
  color: var(--ink-faint);
  white-space: nowrap;
}

.ev__date {
  font-weight: 600;
  color: var(--ink);
}

.ev--late .ev__left,
.ev--today .ev__left {
  font-weight: 600;
  color: var(--tone);
}

@media (width <= 620px) {
  .ev {
    grid-template-columns: 34px minmax(0, 1fr) auto;
    row-gap: 8px;
  }

  .ev__when {
    grid-column: 2 / -1;
    justify-items: start;
  }
}
</style>
