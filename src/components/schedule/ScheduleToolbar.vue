<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'
import {
  EVENT_KINDS,
  isDefaultScheduleFilters,
  SCHEDULE_RANGES,
  type ScheduleEventKind,
  type ScheduleFilters,
  type ScheduleMode,
  type ScheduleObjectOption,
} from '@/lib/schedule'

defineProps<{
  objects: ScheduleObjectOption[]
  counts: Record<ScheduleEventKind, number>
  mode: ScheduleMode
  shown: number
}>()

const emit = defineEmits<{ mode: [ScheduleMode]; reset: [] }>()

const filters = defineModel<ScheduleFilters>({ required: true })

/** Порожній список типів — це «усі»: так фільтр знімається цілком. */
function toggleKind(value: ScheduleEventKind): void {
  const current = filters.value.kinds

  filters.value.kinds = current.includes(value)
    ? current.filter((kind) => kind !== value)
    : [...current, value]
}

function isOn(value: ScheduleEventKind): boolean {
  return filters.value.kinds.includes(value)
}
</script>

<template>
  <div class="bar">
    <div class="bar__row">
      <select
        v-model="filters.objectId"
        class="ctl ctl--select pick pick--wide"
        aria-label="Обʼєкт"
      >
        <option :value="null">Усі обʼєкти</option>
        <option v-for="option in objects" :key="option.id" :value="option.id">
          {{ option.name }} · {{ option.count }}
        </option>
      </select>

      <!--
        Період стосується лише стрічки: у календарі його задає сам місяць,
        на який дивляться.
      -->
      <select
        v-if="mode === 'feed'"
        v-model="filters.range"
        class="ctl ctl--select pick"
        aria-label="Період"
      >
        <option v-for="option in SCHEDULE_RANGES" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <div class="view" role="group" aria-label="Вигляд графіка">
        <button
          type="button"
          class="view__btn"
          :class="{ 'view__btn--on': mode === 'feed' }"
          :aria-pressed="mode === 'feed'"
          title="Стрічкою"
          @click="emit('mode', 'feed')"
        >
          <AppIcon name="menu" />
        </button>
        <button
          type="button"
          class="view__btn"
          :class="{ 'view__btn--on': mode === 'calendar' }"
          :aria-pressed="mode === 'calendar'"
          title="Календарем"
          @click="emit('mode', 'calendar')"
        >
          <AppIcon name="calendar" />
        </button>
      </div>
    </div>

    <div class="bar__row bar__row--chips">
      <button
        v-for="kind in EVENT_KINDS"
        :key="kind.value"
        type="button"
        class="chip"
        :class="[`chip--${kind.value}`, { 'chip--on': isOn(kind.value) }]"
        :aria-pressed="isOn(kind.value)"
        @click="toggleKind(kind.value)"
      >
        <AppIcon :name="kind.icon" />
        {{ kind.label }}
        <span class="chip__count">{{ counts[kind.value] }}</span>
      </button>

      <p class="bar__count">
        <span v-if="mode === 'feed'">{{ shown }} подій у періоді</span>
        <button
          v-if="!isDefaultScheduleFilters(filters)"
          type="button"
          class="bar__reset"
          @click="emit('reset')"
        >
          Скинути фільтри
        </button>
      </p>
    </div>
  </div>
</template>

<style scoped>
.bar {
  display: grid;
  gap: 10px;
}

.bar__row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.bar__row--chips {
  gap: 6px;
}

.pick {
  width: auto;
  height: 40px;
  flex: none;
  border-radius: 999px;
  padding-inline: 14px 30px;
  background-position:
    right 14px center,
    right 9px center;
}

.pick--wide {
  max-width: min(320px, 100%);
}

/* ── Подання ───────────────────────────────────────────────────── */

.view {
  display: flex;
  gap: 2px;
  margin-left: auto;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-sunk);
}

.view__btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-faint);
  transition:
    background-color 0.18s var(--ease),
    color 0.18s var(--ease),
    box-shadow 0.18s var(--ease);
}

.view__btn :deep(.icon) {
  width: 16px;
  height: 16px;
}

.view__btn--on {
  background: var(--paper-raised);
  color: var(--ink);
  box-shadow: var(--shadow-sm);
}

/* ── Типи подій ────────────────────────────────────────────────── */

.chip {
  --tone: var(--ink-muted);

  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-raised);
  color: var(--ink-muted);
  font-size: 12.5px;
  font-weight: 600;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.chip :deep(.icon) {
  width: 14px;
  height: 14px;
  color: var(--tone);
}

.chip:hover {
  border-color: var(--line-strong);
  color: var(--ink);
}

/* Кольори ті самі, що й у рядків стрічки, — фільтр читається як легенда. */
.chip--start {
  --tone: var(--c-4);
}

.chip--finish {
  --tone: var(--c-2);
}

.chip--payment {
  --tone: var(--brand-strong);
}

.chip--on {
  border-color: var(--tone);
  background: var(--paper-sunk);
  color: var(--ink);
}

.chip__count {
  min-width: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 11px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.chip--on .chip__count {
  background: var(--paper-raised);
}

.bar__count {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
  font-size: 12.5px;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.bar__reset {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  font-size: 12.5px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (width <= 640px) {
  .view {
    margin-left: 0;
  }

  .bar__count {
    width: 100%;
    margin-left: 0;
  }
}
</style>
