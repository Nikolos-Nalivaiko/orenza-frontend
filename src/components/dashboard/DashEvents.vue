<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import {
  EVENT_KIND_ICONS,
  EVENT_KIND_LABELS,
  formatShortDay,
  formatWeekday,
  formatWhen,
  type ScheduleEvent,
} from '@/lib/schedule'

const props = withDefaults(defineProps<{ events: ScheduleEvent[]; grouped?: boolean }>(), {
  grouped: false,
})

const days = computed(() => {
  const groups: { date: string; label: string; items: ScheduleEvent[] }[] = []

  for (const event of props.events) {
    let group = groups[groups.length - 1]

    if (!props.grouped || group === undefined || group.date !== event.date) {
      const when = event.daysLeft === 0 ? 'Сьогодні' : event.daysLeft === 1 ? 'Завтра' : ''

      group = {
        date: event.date,
        label: when === '' ? `${formatWeekday(event.date)}, ${formatShortDay(event.date)}` : when,
        items: [],
      }
      groups.push(group)
    }

    group.items.push(event)
  }

  return groups
})
</script>

<template>
  <div class="events">
    <section v-for="day in days" :key="`${day.date}-${day.items[0]!.id}`" class="day">
      <p v-if="grouped" class="day__label">{{ day.label }}</p>

      <RouterLink
        v-for="event in day.items"
        :key="event.id"
        class="ev"
        :class="[`ev--${event.kind}`, { 'ev--late': event.overdue }]"
        :to="{ name: 'object', params: { id: event.object.id } }"
      >
        <span class="ev__icon" aria-hidden="true"
          ><AppIcon :name="EVENT_KIND_ICONS[event.kind]"
        /></span>

        <span class="ev__main">
          <span class="ev__title">{{ event.title }}</span>
          <span class="ev__meta"
            >{{ EVENT_KIND_LABELS[event.kind] }} · {{ event.object.name }}</span
          >
        </span>

        <span class="ev__side">
          <span v-if="event.amount !== null" class="ev__sum"
            >{{ formatAmount(event.amount) }} ₴</span
          >
          <span v-if="!grouped" class="ev__when">{{ formatWhen(event.daysLeft) }}</span>
        </span>
      </RouterLink>
    </section>
  </div>
</template>

<style scoped>
.events {
  display: grid;
  gap: 10px;
  margin: 0 -10px;
}

.day {
  display: grid;
  gap: 1px;
}

.day__label {
  padding: 2px 10px 4px;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink-faint);
}

.day__label::first-letter {
  text-transform: uppercase;
}

.ev {
  --tone: var(--ink-muted);
  --tone-tint: var(--paper-sunk);

  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  padding: 8px 10px;
  border-radius: var(--r-xs);
  color: inherit;
  text-decoration: none;
  transition: background-color 0.14s var(--ease);
}

.ev:hover {
  background: var(--paper);
}

.ev--start {
  --tone: var(--c-4);
  --tone-tint: var(--c-4-soft);
}

.ev--payment {
  --tone: var(--brand-strong);
  --tone-tint: var(--brand-tint);
}

.ev--late {
  --tone: var(--danger);
  --tone-tint: var(--danger-tint);
}

.ev__icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--tone-tint);
  color: var(--tone);
}

.ev__icon :deep(.icon) {
  width: 14px;
  height: 14px;
}

.ev__main {
  display: grid;
  min-width: 0;
}

.ev__title {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ev__meta {
  font-size: 12px;
  color: var(--ink-faint);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ev__side {
  display: grid;
  justify-items: end;
  gap: 1px;
  font-variant-numeric: tabular-nums;
}

.ev__sum {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
}

.ev__when {
  font-size: 11.5px;
  color: var(--ink-faint);
  white-space: nowrap;
}

.ev--late .ev__when {
  color: var(--danger);
  font-weight: 600;
}
</style>
