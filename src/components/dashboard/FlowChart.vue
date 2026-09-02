<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { formatMoney, type FlowPoint } from '@/lib/dashboard'

const props = defineProps<{ points: FlowPoint[] }>()

type SeriesKey = 'income' | 'spend'

interface Series {
  key: SeriesKey
  label: string
  color: string
}

/**
 * Порядок рядів фіксований: слот 1 і слот 2 палітри графіків. Ховання ряду
 * не перефарбовує сусіда — колір належить показнику, а не його позиції.
 */
const SERIES: readonly Series[] = [
  { key: 'income', label: 'Надходження', color: 'var(--c-1)' },
  { key: 'spend', label: 'Витрати', color: 'var(--c-2)' },
]

const PAD = { top: 18, right: 10, bottom: 28, left: 56 }
const HEIGHT = 268
const TICKS = 4
/** 2px просвіту між сусідніми стовпчиками — правило розділювача. */
const BAR_GAP = 2
const RADIUS = 4

const wrap = useTemplateRef<HTMLElement>('wrap')
const width = ref(760)
const active = ref<number | null>(null)
const hidden = ref<SeriesKey[]>([])
const asTable = ref(false)

let observer: ResizeObserver | null = null

onMounted(() => {
  const element = wrap.value

  if (element === null) {
    return
  }

  observer = new ResizeObserver((entries) => {
    const box = entries[0]?.contentRect

    if (box !== undefined && box.width > 0) {
      width.value = box.width
    }
  })

  observer.observe(element)
})

onBeforeUnmount(() => observer?.disconnect())

const visible = computed(() => SERIES.filter((series) => !hidden.value.includes(series.key)))

function toggle(key: SeriesKey): void {
  if (hidden.value.includes(key)) {
    hidden.value = hidden.value.filter((item) => item !== key)

    return
  }

  // Порожній графік нічого не пояснює — останній ряд лишаємо ввімкненим.
  if (visible.value.length > 1) {
    hidden.value = [...hidden.value, key]
  }
}

/** Верх шкали округлюємо до «рівного» кроку, щоб підписи осі читались. */
const scaleMax = computed(() => {
  const values = props.points.flatMap((point) => visible.value.map((series) => point[series.key]))
  const peak = Math.max(1, ...values)
  const raw = peak / TICKS
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / magnitude
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10

  return step * magnitude * TICKS
})

const plot = computed(() => ({
  w: Math.max(120, width.value - PAD.left - PAD.right),
  h: HEIGHT - PAD.top - PAD.bottom,
}))

const ticks = computed(() =>
  Array.from({ length: TICKS + 1 }, (_, index) => {
    const value = (scaleMax.value / TICKS) * index

    return { value, y: PAD.top + plot.value.h - (value / scaleMax.value) * plot.value.h }
  }),
)

const groupWidth = computed(() => plot.value.w / Math.max(1, props.points.length))

const barWidth = computed(() => {
  const count = visible.value.length
  const usable = groupWidth.value * 0.56 - BAR_GAP * (count - 1)

  return Math.max(6, Math.min(22, usable / count))
})

interface Bar {
  key: SeriesKey
  color: string
  x: number
  y: number
  h: number
  value: number
}

interface Group {
  index: number
  label: string
  center: number
  left: number
  bars: Bar[]
}

const groups = computed<Group[]>(() =>
  props.points.map((point, index) => {
    const center = PAD.left + groupWidth.value * (index + 0.5)
    const count = visible.value.length
    const span = barWidth.value * count + BAR_GAP * (count - 1)

    const bars = visible.value.map((series, slot) => {
      const value = point[series.key]
      const h = (value / scaleMax.value) * plot.value.h

      return {
        key: series.key,
        color: series.color,
        x: center - span / 2 + slot * (barWidth.value + BAR_GAP),
        y: PAD.top + plot.value.h - h,
        h,
        value,
      }
    })

    return {
      index,
      label: point.label,
      center,
      left: PAD.left + groupWidth.value * index,
      bars,
    }
  }),
)

/** Стовпчик із заокругленою «шапкою»: низ приклеєний до базової лінії. */
function barPath(bar: Bar): string {
  const w = barWidth.value
  const r = Math.min(RADIUS, w / 2, Math.max(0, bar.h))
  const bottom = PAD.top + plot.value.h

  return [
    `M${bar.x} ${bottom}`,
    `L${bar.x} ${bar.y + r}`,
    `Q${bar.x} ${bar.y} ${bar.x + r} ${bar.y}`,
    `L${bar.x + w - r} ${bar.y}`,
    `Q${bar.x + w} ${bar.y} ${bar.x + w} ${bar.y + r}`,
    `L${bar.x + w} ${bottom}`,
    'Z',
  ].join(' ')
}

/** Пряма підпис-цифра лише над піком — решту значень дає підказка й таблиця. */
const peak = computed(() => {
  let best: { group: Group; bar: Bar } | null = null

  for (const group of groups.value) {
    for (const bar of group.bars) {
      if (best === null || bar.value > best.bar.value) {
        best = { group, bar }
      }
    }
  }

  return best
})

const current = computed(() =>
  active.value === null ? null : (groups.value[active.value] ?? null),
)

const tooltipX = computed(() => {
  const group = current.value

  if (group === null) {
    return 0
  }

  return Math.min(Math.max(group.center, 92), Math.max(92, width.value - 92))
})

const balance = computed(() => {
  const point = active.value === null ? null : (props.points[active.value] ?? null)

  return point === null ? 0 : point.income - point.spend
})

const bothVisible = computed(() => visible.value.length === SERIES.length)
</script>

<template>
  <div class="flow">
    <div class="flow__bar">
      <div class="legend">
        <button
          v-for="series in SERIES"
          :key="series.key"
          type="button"
          class="legend__item"
          :class="{ 'legend__item--off': hidden.includes(series.key) }"
          :aria-pressed="!hidden.includes(series.key)"
          @click="toggle(series.key)"
        >
          <span class="legend__key" :style="{ background: series.color }" aria-hidden="true" />
          {{ series.label }}
        </button>
      </div>

      <button type="button" class="flow__mode" @click="asTable = !asTable">
        {{ asTable ? 'Графік' : 'Таблиця' }}
      </button>
    </div>

    <div v-if="asTable" class="table-wrap">
      <table class="table">
        <caption class="sr-only">
          Надходження та витрати за період, гривні
        </caption>
        <thead>
          <tr>
            <th scope="col">Період</th>
            <th v-for="series in SERIES" :key="series.key" scope="col">{{ series.label }}</th>
            <th scope="col">Сальдо</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="point in points" :key="point.label">
            <th scope="row">{{ point.label }}</th>
            <td>{{ formatMoney(point.income) }} ₴</td>
            <td>{{ formatMoney(point.spend) }} ₴</td>
            <td :class="point.income - point.spend < 0 ? 'table__minus' : 'table__plus'">
              {{ point.income - point.spend < 0 ? '−' : '+'
              }}{{ formatMoney(Math.abs(point.income - point.spend)) }} ₴
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else ref="wrap" class="flow__plot">
      <svg
        class="chart"
        :viewBox="`0 0 ${width} ${HEIGHT}`"
        :height="HEIGHT"
        role="img"
        aria-label="Надходження та витрати за період"
        @pointerleave="active = null"
      >
        <!-- Сітка й підписи осі: тихіші за дані. -->
        <g class="grid">
          <line
            v-for="tick in ticks"
            :key="tick.value"
            :x1="PAD.left"
            :x2="width - PAD.right"
            :y1="tick.y"
            :y2="tick.y"
          />
        </g>

        <g class="axis">
          <text
            v-for="tick in ticks"
            :key="tick.value"
            :x="PAD.left - 12"
            :y="tick.y + 4"
            text-anchor="end"
          >
            {{ tick.value === 0 ? '0' : formatMoney(tick.value) }}
          </text>
        </g>

        <g class="cols">
          <rect
            v-for="group in groups"
            :key="group.index"
            :x="group.left"
            :y="PAD.top"
            :width="groupWidth"
            :height="plot.h"
            class="cols__wash"
            :class="{ 'cols__wash--on': active === group.index }"
          />
        </g>

        <g v-for="group in groups" :key="`bars-${group.index}`" class="bars">
          <path
            v-for="bar in group.bars"
            :key="bar.key"
            :d="barPath(bar)"
            :fill="bar.color"
            class="bars__bar"
            :class="{ 'bars__bar--dim': active !== null && active !== group.index }"
          />
        </g>

        <text
          v-if="peak"
          class="peak"
          :x="peak.bar.x + barWidth / 2"
          :y="peak.bar.y - 8"
          text-anchor="middle"
        >
          {{ formatMoney(peak.bar.value) }}
        </text>

        <g class="xaxis">
          <text
            v-for="group in groups"
            :key="group.index"
            :x="group.center"
            :y="HEIGHT - 9"
            text-anchor="middle"
            :class="{ 'xaxis--on': active === group.index }"
          >
            {{ group.label }}
          </text>
        </g>

        <!-- Ціль наведення — уся колонка, а не самі стовпчики. -->
        <rect
          v-for="group in groups"
          :key="`hit-${group.index}`"
          :x="group.left"
          :y="PAD.top"
          :width="groupWidth"
          :height="plot.h"
          class="hit"
          tabindex="0"
          :aria-label="`${group.label}: надходження ${formatMoney(points[group.index]?.income ?? 0)} гривень, витрати ${formatMoney(points[group.index]?.spend ?? 0)} гривень`"
          @pointerenter="active = group.index"
          @focus="active = group.index"
          @blur="active = null"
        />
      </svg>

      <Transition name="tip">
        <div v-if="current" class="tip" :style="{ left: `${tooltipX}px` }">
          <p class="tip__head">{{ current.label }}</p>

          <p v-for="series in visible" :key="series.key" class="tip__row">
            <span class="tip__key" :style="{ background: series.color }" aria-hidden="true" />
            <span class="tip__name">{{ series.label }}</span>
            <span class="tip__value"
              >{{ formatMoney(points[current.index]?.[series.key] ?? 0) }} ₴</span
            >
          </p>

          <p v-if="bothVisible" class="tip__row tip__row--sum">
            <span class="tip__name">Сальдо</span>
            <span
              class="tip__value"
              :class="balance < 0 ? 'tip__value--minus' : 'tip__value--plus'"
            >
              {{ balance < 0 ? '−' : '+' }}{{ formatMoney(Math.abs(balance)) }} ₴
            </span>
          </p>
        </div>
      </Transition>
    </div>
  </div>
</template>

<style scoped>
.flow {
  display: grid;
  gap: 14px;
}

.flow__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.legend__item {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 10px 4px 8px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-muted);
  transition:
    background-color 0.16s var(--ease),
    color 0.16s var(--ease),
    opacity 0.16s var(--ease);
}

.legend__item:hover {
  background: var(--paper-sunk);
}

.legend__item--off {
  opacity: 0.42;
}

.legend__key {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.legend__item--off .legend__key {
  background: var(--ink-faint) !important;
}

.flow__mode {
  padding: 4px 11px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--ink-muted);
  transition:
    border-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.flow__mode:hover {
  border-color: var(--line-strong);
  color: var(--ink);
}

.flow__plot {
  position: relative;
}

.chart {
  display: block;
  width: 100%;
}

.grid line {
  stroke: var(--grid);
  stroke-width: 1;
}

/* Базова лінія трохи щільніша — від неї читається висота стовпчиків. */
.grid line:first-child {
  stroke: var(--line-strong);
}

.axis text,
.xaxis text {
  fill: var(--ink-faint);
  font-family: var(--font-body);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.xaxis text {
  transition: fill 0.16s var(--ease);
}

.xaxis .xaxis--on {
  fill: var(--ink);
  font-weight: 600;
}

.cols__wash {
  fill: var(--ink);
  opacity: 0;
  transition: opacity 0.18s var(--ease);
}

.cols__wash--on {
  opacity: 0.035;
}

.bars__bar {
  transition: opacity 0.18s var(--ease);
}

.bars__bar--dim {
  opacity: 0.34;
}

.peak {
  fill: var(--ink-muted);
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.hit {
  fill: transparent;
  outline: none;
}

.hit:focus-visible {
  fill: rgb(56 176 0 / 8%);
}

/* ── Підказка ──────────────────────────────────────────────────── */

.tip {
  position: absolute;
  top: 8px;
  z-index: 5;
  display: grid;
  gap: 5px;
  min-width: 178px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--paper-raised);
  box-shadow: var(--shadow-md);
  transform: translateX(-50%);
  pointer-events: none;
}

.tip__head {
  margin-bottom: 2px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.tip__row {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
}

/* Ключ ряду в підказці — коротка риска, а не заливка: тут вона лише мітка. */
.tip__key {
  width: 12px;
  height: 3px;
  border-radius: 999px;
}

.tip__name {
  color: var(--ink-muted);
}

.tip__value {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.tip__row--sum {
  grid-template-columns: 1fr auto;
  margin-top: 3px;
  padding-top: 6px;
  border-top: 1px solid var(--line);
}

.tip__value--plus {
  color: var(--brand-strong);
}

.tip__value--minus {
  color: var(--danger);
}

.tip-enter-active,
.tip-leave-active {
  transition:
    opacity 0.16s var(--ease),
    transform 0.16s var(--ease);
}

.tip-enter-from,
.tip-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-4px);
}

/* ── Таблиця ───────────────────────────────────────────────────── */

.table-wrap {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.table th,
.table td {
  padding: 9px 12px;
  text-align: right;
  white-space: nowrap;
}

.table thead th {
  border-bottom: 1px solid var(--line);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.table tbody th,
.table thead th:first-child {
  text-align: left;
  font-weight: 600;
}

.table tbody tr + tr th,
.table tbody tr + tr td {
  border-top: 1px solid var(--line);
}

.table__plus {
  color: var(--brand-strong);
  font-weight: 600;
}

.table__minus {
  color: var(--danger);
  font-weight: 600;
}
</style>
