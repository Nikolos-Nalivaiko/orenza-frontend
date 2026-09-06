<script setup lang="ts">
import { computed } from 'vue'
import ScheduleRow from '@/components/schedule/ScheduleRow.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatDay } from '@/lib/objects'
import {
  buildCalendar,
  eventsOn,
  monthOf,
  shiftMonth,
  WEEKDAYS,
  type ScheduleEvent,
} from '@/lib/schedule'

/**
 * Місячна сітка — та сама стрічка подій, розкладена по клітинках. Вона
 * відповідає на інше питання: не «що далі», а «як лягає місяць» — де густо,
 * а де тиждень порожній. Період стрічки тут не діє: місяць задає його сам.
 */
const props = defineProps<{
  /** Події вже за фільтрами — сітка нічого не відбирає сама. */
  events: ScheduleEvent[]
  today: string
}>()

const month = defineModel<string>('month', { required: true })
/** Обраний день; порожньо — список під сіткою згорнутий. */
const selected = defineModel<string>('selected', { required: true })

const grid = computed(() => buildCalendar(month.value, props.events, props.today))
const dayEvents = computed(() =>
  selected.value === '' ? [] : eventsOn(props.events, selected.value),
)

function move(delta: number): void {
  month.value = shiftMonth(month.value, delta)
  selected.value = ''
}

function showToday(): void {
  month.value = monthOf(props.today)
  selected.value = props.today
}

/** Повторний клік по дню згортає список: він не має висіти вічно. */
function pick(date: string): void {
  selected.value = selected.value === date ? '' : date
}
</script>

<template>
  <div class="cal">
    <header class="cal__head">
      <button type="button" class="cal__nav" aria-label="Попередній місяць" @click="move(-1)">
        <AppIcon name="back" />
      </button>

      <h2 class="cal__month">{{ grid.label }}</h2>

      <button type="button" class="cal__nav" aria-label="Наступний місяць" @click="move(1)">
        <AppIcon name="forward" />
      </button>

      <button type="button" class="cal__today" @click="showToday()">Сьогодні</button>
    </header>

    <div class="grid">
      <span v-for="name in WEEKDAYS" :key="name" class="grid__weekday">{{ name }}</span>

      <template v-for="week in grid.weeks" :key="week[0]?.date">
        <button
          v-for="day in week"
          :key="day.date"
          type="button"
          class="cell"
          :class="{
            'cell--out': !day.inMonth,
            'cell--today': day.isToday,
            'cell--on': day.date === selected,
            'cell--empty': day.events.length === 0,
          }"
          :aria-pressed="day.date === selected"
          :aria-label="`${formatDay(day.date)} — ${day.events.length} подій`"
          @click="pick(day.date)"
        >
          <span class="cell__day">{{ day.day }}</span>

          <span class="cell__dots" aria-hidden="true">
            <span
              v-for="event in day.events.slice(0, 4)"
              :key="event.id"
              class="dot"
              :class="[`dot--${event.kind}`, { 'dot--late': event.overdue }]"
            />
            <span v-if="day.events.length > 4" class="cell__more">
              +{{ day.events.length - 4 }}
            </span>
          </span>
        </button>
      </template>
    </div>

    <!-- Список дня розгортається під сіткою: модалка тут відрізала б контекст. -->
    <section v-if="selected !== ''" class="picked">
      <header class="picked__head">
        <h3 class="picked__title">{{ formatDay(selected) }}</h3>
        <button type="button" class="picked__close" @click="selected = ''">
          <AppIcon name="close" />
          <span class="sr-only">Згорнути день</span>
        </button>
      </header>

      <p v-if="dayEvents.length === 0" class="picked__empty">Цього дня подій немає.</p>

      <ul v-else class="picked__list">
        <ScheduleRow v-for="event in dayEvents" :key="event.id" :event="event" />
      </ul>
    </section>
  </div>
</template>

<style scoped>
.cal {
  display: grid;
  gap: 14px;
}

.cal__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cal__nav {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-raised);
  color: var(--ink-muted);
  transition:
    border-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.cal__nav:hover {
  border-color: var(--line-strong);
  color: var(--ink);
}

.cal__nav :deep(.icon) {
  width: 16px;
  height: 16px;
}

.cal__month {
  min-width: 190px;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.02em;
  text-transform: capitalize;
}

.cal__today {
  margin-left: auto;
  padding: 6px 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-raised);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-muted);
  transition:
    border-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.cal__today:hover {
  border-color: var(--line-strong);
  color: var(--ink);
}

/* ── Сітка ─────────────────────────────────────────────────────── */

.grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}

.grid__weekday {
  padding: 0 4px 4px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.cell {
  display: grid;
  align-content: start;
  gap: 6px;
  min-height: 82px;
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--paper-raised);
  text-align: left;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease);
}

.cell:hover {
  border-color: var(--line-strong);
}

/* Дні сусідніх місяців тримають форму сітки, але не претендують на увагу. */
.cell--out {
  background: transparent;
  border-color: transparent;
  color: var(--ink-faint);
}

.cell--empty {
  background: var(--paper-raised);
}

.cell--out.cell--empty {
  background: transparent;
}

.cell--today {
  border-color: var(--brand);
  box-shadow: inset 0 0 0 1px var(--brand-glow);
}

.cell--on {
  border-color: var(--ink);
  background: var(--paper-sunk);
}

.cell__day {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.cell--today .cell__day {
  color: var(--brand-strong);
}

.cell__dots {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ink-faint);
}

.dot--start {
  background: var(--c-4);
}

.dot--finish {
  background: var(--c-2);
}

.dot--payment {
  background: var(--brand);
}

.dot--late {
  background: var(--danger);
}

.cell__more {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--ink-faint);
}

/* ── День під сіткою ───────────────────────────────────────────── */

.picked {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-sunk);
  animation: unfold 0.24s var(--ease);
}

@keyframes unfold {
  from {
    opacity: 0;
    transform: translateY(-6px);
  }
}

.picked__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.picked__title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.picked__close {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-faint);
}

.picked__close:hover {
  background: var(--paper-raised);
  color: var(--ink);
}

.picked__close :deep(.icon) {
  width: 15px;
  height: 15px;
}

.picked__empty {
  font-size: 13px;
  color: var(--ink-muted);
}

.picked__list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

@media (width <= 720px) {
  .cell {
    min-height: 62px;
    padding: 6px;
  }

  .cal__month {
    min-width: 0;
    font-size: 16px;
  }
}
</style>
