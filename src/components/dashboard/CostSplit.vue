<script setup lang="ts">
import { computed, ref } from 'vue'
import { formatMoney, type CostSlice } from '@/lib/dashboard'

const props = defineProps<{ slices: CostSlice[] }>()

/** Кольори призначаються слотами по порядку — і не «прокручуються». */
const COLORS = ['var(--c-1)', 'var(--c-2)', 'var(--c-3)', 'var(--c-4)']

const active = ref<string | null>(null)

const total = computed(() => props.slices.reduce((sum, slice) => sum + slice.value, 0))

const rows = computed(() =>
  props.slices.map((slice, index) => ({
    ...slice,
    color: COLORS[index] ?? 'var(--ink-muted)',
    share: total.value === 0 ? 0 : (slice.value / total.value) * 100,
  })),
)
</script>

<template>
  <div class="split" @pointerleave="active = null">
    <p class="split__total">
      {{ formatMoney(total) }} <span>₴</span>
      <span class="split__label">усього витрат</span>
    </p>

    <div class="split__bar" role="img" aria-label="Структура витрат за статтями">
      <button
        v-for="row in rows"
        :key="row.key"
        type="button"
        class="split__seg"
        :class="{ 'split__seg--dim': active !== null && active !== row.key }"
        :style="{ flexBasis: `${row.share}%`, background: row.color }"
        :aria-label="`${row.label}: ${Math.round(row.share)} відсотків`"
        @pointerenter="active = row.key"
        @focus="active = row.key"
        @blur="active = null"
      />
    </div>

    <ul class="split__list">
      <li
        v-for="row in rows"
        :key="row.key"
        class="split__row"
        :class="{
          'split__row--on': active === row.key,
          'split__row--dim': active !== null && active !== row.key,
        }"
        @pointerenter="active = row.key"
      >
        <span class="split__key" :style="{ background: row.color }" aria-hidden="true" />
        <span class="split__name">{{ row.label }}</span>
        <span class="split__share">{{ Math.round(row.share) }}%</span>
        <span class="split__value">{{ formatMoney(row.value) }} ₴</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.split {
  display: grid;
  gap: 14px;
}

.split__total {
  display: flex;
  align-items: baseline;
  gap: 6px;
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}

.split__total span {
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-faint);
}

.split__label {
  margin-left: auto;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* Сегменти розділені 2px паперу — так стик двох кольорів не читається як третій. */
.split__bar {
  display: flex;
  gap: 2px;
  height: 14px;
}

.split__seg {
  min-width: 6px;
  padding: 0;
  border: 0;
  border-radius: 4px;
  transition:
    opacity 0.18s var(--ease),
    transform 0.18s var(--ease);
}

.split__seg:hover,
.split__seg:focus-visible {
  transform: scaleY(1.28);
}

.split__seg--dim {
  opacity: 0.3;
}

.split__list {
  display: grid;
  gap: 1px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.split__row {
  display: grid;
  grid-template-columns: auto 1fr auto auto;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border-radius: var(--r-xs);
  font-size: 13px;
  transition:
    background-color 0.16s var(--ease),
    opacity 0.16s var(--ease);
}

.split__row--on {
  background: var(--paper-sunk);
}

.split__row--dim {
  opacity: 0.45;
}

.split__key {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.split__name {
  color: var(--ink-muted);
}

.split__share {
  min-width: 34px;
  text-align: right;
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--ink-faint);
}

.split__value {
  min-width: 78px;
  text-align: right;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
</style>
