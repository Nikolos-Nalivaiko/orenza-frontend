<script setup lang="ts">
import ScheduleRow from '@/components/schedule/ScheduleRow.vue'
import { formatShortDay, type ScheduleWeek } from '@/lib/schedule'

/**
 * Хронологія найближчих подій: тиждень — день — рядки. Порожніх днів у ній
 * немає навмисно: графік має показувати роботу, а не календар.
 */
defineProps<{ weeks: ScheduleWeek[] }>()
</script>

<template>
  <div class="feed">
    <section v-for="week in weeks" :key="week.start" class="week">
      <header class="week__head">
        <h2 class="week__title">{{ week.label }}</h2>
        <span class="week__count">{{ week.count }}</span>
        <span class="week__line" aria-hidden="true" />
      </header>

      <div v-for="day in week.days" :key="day.date" class="day">
        <p class="day__label" :class="{ 'day__label--now': day.relative !== '' }">
          <span class="day__date">{{ formatShortDay(day.date) }}</span>
          <span class="day__weekday">{{ day.relative === '' ? day.weekday : day.relative }}</span>
        </p>

        <ul class="day__events">
          <ScheduleRow v-for="event in day.events" :key="event.id" :event="event" />
        </ul>
      </div>
    </section>
  </div>
</template>

<style scoped>
.feed {
  display: grid;
  gap: 24px;
}

.week {
  display: grid;
  gap: 12px;
}

.week__head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.week__title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.week__count {
  min-width: 18px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--paper-sunk);
  color: var(--ink-muted);
  font-size: 11px;
  font-weight: 600;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.week__line {
  flex: 1;
  height: 1px;
  background: var(--line);
}

/* День — вузька колонка з датою ліворуч від подій. */
.day {
  display: grid;
  grid-template-columns: 92px minmax(0, 1fr);
  gap: 14px;
  padding-bottom: 14px;
}

.day__label {
  display: grid;
  gap: 2px;
  padding-top: 10px;
}

.day__date {
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.day__weekday {
  font-size: 12px;
  color: var(--ink-faint);
}

.day__label--now .day__weekday {
  color: var(--brand-strong);
  font-weight: 600;
}

.day__events {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (width <= 620px) {
  .day {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .day__label {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding-top: 0;
  }
}
</style>
