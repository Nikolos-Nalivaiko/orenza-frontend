<script setup lang="ts">
import { computed } from 'vue'
import type { Crew } from '@/lib/dashboard'

const props = defineProps<{ crews: Crew[] }>()

const people = computed(() => props.crews.reduce((sum, crew) => sum + crew.people, 0))
const average = computed(() =>
  props.crews.length === 0
    ? 0
    : Math.round(props.crews.reduce((sum, crew) => sum + crew.load, 0) / props.crews.length),
)
</script>

<template>
  <div class="crew">
    <p class="crew__sum">
      <strong>{{ people }}</strong> осіб у зміні
      <span class="crew__avg">середнє завантаження {{ average }}%</span>
    </p>

    <ul class="crew__list">
      <li v-for="item in crews" :key="item.id" class="crew__row">
        <span class="crew__name">
          {{ item.name }}
          <span class="crew__site">{{ item.site }}</span>
        </span>

        <span class="crew__track">
          <span
            class="crew__fill"
            :class="{ 'crew__fill--hot': item.load >= 90 }"
            :style="{ width: `${item.load}%` }"
          />
        </span>

        <span class="crew__value">{{ item.load }}%</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.crew {
  display: grid;
  gap: 14px;
}

.crew__sum {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-size: 13px;
  color: var(--ink-muted);
}

.crew__sum strong {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.03em;
  color: var(--ink);
}

.crew__avg {
  margin-left: auto;
  font-size: 11.5px;
  color: var(--ink-faint);
}

.crew__list {
  display: grid;
  gap: 11px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.crew__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px auto;
  align-items: center;
  gap: 12px;
}

.crew__name {
  display: grid;
  gap: 1px;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
}

.crew__site {
  font-size: 11.5px;
  font-weight: 400;
  color: var(--ink-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.crew__track {
  height: 6px;
  border-radius: 999px;
  background: var(--paper-sunk);
  overflow: hidden;
}

/* Один показник — один відтінок; перевантаження підсвічуємо статусним кольором. */
.crew__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--c-1);
  transition: width 0.6s var(--ease);
}

.crew__fill--hot {
  background: var(--amber);
}

.crew__value {
  min-width: 34px;
  text-align: right;
  font-size: 12.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
