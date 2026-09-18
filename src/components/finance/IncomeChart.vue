<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import PanelCard from '@/components/dashboard/PanelCard.vue'
import { useElementWidth } from '@/composables/useElementWidth'
import { formatAmount } from '@/lib/amount'
import {
  formatCompact,
  formatMonthLong,
  formatMonthShort,
  niceScale,
  type MonthIncome,
} from '@/lib/workspaceFinance'

type Series = 'paid' | 'expected' | 'late'

const props = defineProps<{ months: MonthIncome[] }>()

const SERIES: { key: Series; label: string }[] = [
  { key: 'paid', label: 'Отримано' },
  { key: 'expected', label: 'Очікується' },
  { key: 'late', label: 'Прострочено' },
]

const PLOT = 300
const TOP = 12
const AXIS = 34
const LEFT = 54
const RIGHT = 8
const GAP = 2

const root = useTemplateRef<HTMLElement>('root')
const width = useElementWidth(root)

const hover = ref<number | null>(null)

const plotWidth = computed(() => Math.max(width.value - LEFT - RIGHT, 120))
const band = computed(() => plotWidth.value / Math.max(props.months.length, 1))
const barWidth = computed(() => Math.min(Math.max(band.value * 0.5, 8), 28))

const total = (item: MonthIncome): number => item.paid + item.expected + item.late

const scale = computed(() => niceScale(Math.max(...props.months.map(total), 0), 4))

function y(value: number): number {
  return TOP + ((scale.value.max - value) / (scale.value.max || 1)) * PLOT
}

function center(index: number): number {
  return LEFT + index * band.value + band.value / 2
}

function segment(x: number, w: number, bottom: number, top: number, round: boolean): string {
  const height = bottom - top

  if (height <= 0.5) {
    return ''
  }

  if (!round) {
    return `M${x},${bottom} V${top} H${x + w} V${bottom} Z`
  }

  const r = Math.min(4, height, w / 2)

  return `M${x},${bottom} V${top + r} Q${x},${top} ${x + r},${top} H${x + w - r} Q${x + w},${top} ${x + w},${top + r} V${bottom} Z`
}

const columns = computed(() =>
  props.months.map((item, index) => {
    const w = barWidth.value
    const x = center(index) - w / 2
    const keys = SERIES.map((series) => series.key).filter((key) => item[key] > 0)
    const last = keys[keys.length - 1]

    let base = 0

    return keys.map((key) => {
      const bottom = y(base) - (base > 0 ? GAP : 0)

      base += item[key]

      return { key, d: segment(x, w, bottom, y(base), key === last) }
    })
  }),
)

const labelEvery = computed(() => (band.value < 34 ? 2 : 1))

const nowIndex = computed(() =>
  Math.max(
    props.months.findIndex((item) => item.current),
    0,
  ),
)

const svgHeight = TOP + PLOT + AXIS

const current = computed(() => (hover.value === null ? null : (props.months[hover.value] ?? null)))

const tipLeft = computed(() => {
  if (hover.value === null) {
    return 0
  }

  const half = 100

  return Math.min(Math.max(center(hover.value), half), width.value - half)
})

const sums = computed(() =>
  props.months.reduce(
    (sum, item) => ({
      paid: sum.paid + item.paid,
      expected: sum.expected + item.expected,
      late: sum.late + item.late,
    }),
    { paid: 0, expected: 0, late: 0 },
  ),
)

function onKey(event: KeyboardEvent): void {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
    return
  }

  event.preventDefault()

  const last = props.months.length - 1
  const step = event.key === 'ArrowLeft' ? -1 : 1

  hover.value = Math.min(Math.max((hover.value ?? last) + step, 0), last)
}
</script>

<template>
  <PanelCard title="Надходження" hint="платежі замовників по місяцях: отримані й заплановані">
    <div class="inc">
      <ul class="legend">
        <li v-for="item in SERIES" :key="item.key" class="legend__item">
          <span class="key" :class="`key--${item.key}`" aria-hidden="true" />
          {{ item.label }}
          <strong>{{ formatCompact(sums[item.key]) }}</strong>
        </li>
      </ul>

      <div ref="root" class="plot" @pointerleave="hover = null">
        <svg
          :width="width"
          :height="svgHeight"
          :viewBox="`0 0 ${width} ${svgHeight}`"
          role="img"
          aria-label="Надходження від замовників по місяцях"
        >
          <defs>
            <pattern
              id="inc-late"
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="6" height="6" class="hatch__bg" />
              <line x1="0" y1="0" x2="0" y2="6" class="hatch__line" />
            </pattern>
          </defs>

          <g class="grid">
            <g v-for="tick in scale.ticks" :key="tick">
              <line
                :x1="LEFT"
                :x2="width - RIGHT"
                :y1="y(tick)"
                :y2="y(tick)"
                :class="{ grid__zero: tick === 0 }"
              />
              <text :x="LEFT - 10" :y="y(tick)" dy="0.32em" text-anchor="end">
                {{ tick === 0 ? '0' : formatCompact(tick) }}
              </text>
            </g>
          </g>

          <rect
            v-if="hover !== null"
            class="hoverband"
            :x="LEFT + hover * band + 2"
            :y="TOP - 6"
            :width="band - 4"
            :height="PLOT + 6"
            rx="8"
          />

          <g
            v-for="(column, index) in columns"
            :key="months[index]!.month"
            :class="{ 'col--hover': hover === index }"
          >
            <path
              v-for="part in column"
              :key="part.key"
              :d="part.d"
              :class="`bar bar--${part.key}`"
            />
          </g>

          <g class="xaxis">
            <text
              v-for="(item, index) in months"
              v-show="Math.abs(index - nowIndex) % labelEvery === 0"
              :key="item.month"
              :x="center(index)"
              :y="TOP + PLOT + 18"
              text-anchor="middle"
              :class="{ 'xaxis--now': item.current, 'xaxis--hover': hover === index }"
            >
              {{ formatMonthShort(item.month) }}
              <tspan
                v-if="item.month.endsWith('-01') || index === 0"
                :x="center(index)"
                dy="13"
                class="xaxis__year"
              >
                {{ item.month.slice(0, 4) }}
              </tspan>
            </text>
          </g>

          <rect
            v-for="(item, index) in months"
            :key="`hit-${item.month}`"
            class="hit"
            :x="LEFT + index * band"
            :y="0"
            :width="band"
            :height="TOP + PLOT"
            tabindex="0"
            :aria-label="`${formatMonthLong(item.month)}: отримано ${formatAmount(item.paid)} ₴, очікується ${formatAmount(item.expected)} ₴, прострочено ${formatAmount(item.late)} ₴`"
            @pointerenter="hover = index"
            @focus="hover = index"
            @blur="hover = null"
            @keydown="onKey"
          />
        </svg>

        <Transition name="tip">
          <div v-if="current" class="tip" :style="{ left: `${tipLeft}px` }" role="status">
            <p class="tip__title">
              {{ formatMonthLong(current.month) }}
              <span v-if="current.current" class="tip__note">поточний</span>
            </p>
            <p v-for="item in SERIES" :key="item.key" class="tip__row">
              <span class="tip__key" :class="`key--${item.key}`" aria-hidden="true" />
              <strong>{{ formatAmount(current[item.key]) }} ₴</strong>
              <span>{{ item.label.toLowerCase() }}</span>
            </p>
          </div>
        </Transition>
      </div>
    </div>
  </PanelCard>
</template>

<style scoped>
.inc {
  display: grid;
  gap: 14px;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.legend__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-muted);
}

.legend__item strong {
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.key {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.key--paid {
  background: var(--c-1);
}

.key--expected {
  background: var(--c-4);
}

.key--late {
  background: repeating-linear-gradient(45deg, var(--danger) 0 2px, var(--danger-tint) 2px 4px);
  box-shadow: inset 0 0 0 1px var(--danger);
}

.plot {
  position: relative;
  min-width: 0;
  touch-action: pan-y;
}

.plot svg {
  display: block;
  overflow: visible;
}

.grid line {
  stroke: var(--grid);
  shape-rendering: crispedges;
}

.grid .grid__zero {
  stroke: var(--line-strong);
}

.grid text,
.xaxis text {
  font-size: 11px;
  fill: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.xaxis .xaxis--now {
  fill: var(--ink);
  font-weight: 700;
}

.xaxis .xaxis--hover {
  fill: var(--ink);
}

.xaxis__year {
  font-size: 10px;
  font-weight: 400;
  fill: var(--ink-faint);
}

.hoverband {
  fill: rgb(12 17 14 / 4%);
}

.bar {
  transition: filter 0.16s var(--ease);
}

.bar--paid {
  fill: var(--c-1);
}

.bar--expected {
  fill: var(--c-4);
}

.bar--late {
  fill: url(#inc-late);
}

.hatch__bg {
  fill: var(--danger-tint);
}

.hatch__line {
  stroke: var(--danger);
  stroke-width: 3;
}

.col--hover .bar {
  filter: brightness(1.1);
}

.hit {
  fill: transparent;
  cursor: crosshair;
  outline: none;
}

.hit:focus-visible {
  stroke: var(--brand);
  stroke-width: 2;
}

.tip {
  position: absolute;
  top: 0;
  z-index: 2;
  display: grid;
  gap: 5px;
  width: 200px;
  padding: 12px 14px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--paper-raised);
  box-shadow: var(--shadow-md);
  transform: translateX(-50%);
  pointer-events: none;
}

.tip__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 3px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-muted);
  text-transform: capitalize;
}

.tip__note {
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 10.5px;
  text-transform: none;
}

.tip__row {
  display: grid;
  grid-template-columns: 12px auto 1fr;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.tip__row strong {
  font-size: 13px;
  color: var(--ink);
}

.tip__key {
  width: 12px;
  height: 4px;
  border-radius: 2px;
  box-shadow: none;
}

.tip-enter-active,
.tip-leave-active {
  transition: opacity 0.14s var(--ease);
}

.tip-enter-from,
.tip-leave-to {
  opacity: 0;
}
</style>
