<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import PanelCard from '@/components/dashboard/PanelCard.vue'
import { formatAmount } from '@/lib/amount'
import { formatCompact, formatPercent, type ObjectMargin } from '@/lib/workspaceFinance'

type SortKey = 'name' | 'client' | 'cost' | 'profit' | 'margin' | 'paid'

const props = defineProps<{ rows: ObjectMargin[] }>()

const COLUMNS: { key: SortKey; label: string; num?: boolean }[] = [
  { key: 'name', label: 'Обʼєкт' },
  { key: 'client', label: 'Сума для клієнта', num: true },
  { key: 'cost', label: 'Собівартість', num: true },
  { key: 'profit', label: 'Профіт', num: true },
  { key: 'margin', label: 'Маржа' },
  { key: 'paid', label: 'Оплачено' },
]

const sort = ref<SortKey>('profit')
const asc = ref(false)

function by(key: SortKey): void {
  if (sort.value === key) {
    asc.value = !asc.value

    return
  }

  sort.value = key
  asc.value = key === 'name'
}

function value(row: ObjectMargin, key: SortKey): number | string {
  if (key === 'name') return row.object.name
  if (key === 'client') return row.finance.client
  if (key === 'cost') return row.finance.cost
  if (key === 'profit') return row.finance.profit
  if (key === 'paid') return row.finance.progress

  return row.margin ?? -Infinity
}

const sorted = computed(() => {
  const factor = asc.value ? 1 : -1

  return [...props.rows].sort((left, right) => {
    const a = value(left, sort.value)
    const b = value(right, sort.value)

    return (typeof a === 'string' ? a.localeCompare(String(b), 'uk') : a - (b as number)) * factor
  })
})

const summary = computed(() => {
  const sum = (pick: (row: ObjectMargin) => number): number =>
    props.rows.reduce((total, row) => total + pick(row), 0)

  const client = sum((row) => row.finance.client)
  const profit = sum((row) => row.finance.profit)
  const paid = sum((row) => row.finance.paid)

  return {
    client,
    cost: sum((row) => row.finance.cost),
    profit,
    due: sum((row) => row.finance.due),
    margin: client === 0 ? null : profit / client,
    progress: client === 0 ? 0 : Math.min(paid / client, 1),
  }
})

function tone(margin: number | null): string {
  if (margin === null || margin < 0) return 'is-bad'

  return margin < 0.1 ? 'is-warn' : 'is-good'
}
</script>

<template>
  <PanelCard
    title="Прибутковість обʼєктів"
    hint="сума для клієнта мінус закупівля матеріалів і оплата робіт"
    flush
  >
    <div class="wrap">
      <div class="ptable" role="table" aria-label="Прибутковість обʼєктів">
        <div class="phead" role="row">
          <button
            v-for="column in COLUMNS"
            :key="column.key"
            type="button"
            class="phead__cell"
            :class="{ 'phead__cell--on': sort === column.key, 'phead__cell--num': column.num }"
            role="columnheader"
            :aria-sort="sort === column.key ? (asc ? 'ascending' : 'descending') : 'none'"
            @click="by(column.key)"
          >
            {{ column.label }}
            <svg
              viewBox="0 0 10 10"
              aria-hidden="true"
              :class="{ 'is-asc': sort === column.key && asc }"
            >
              <path
                d="M2.5 4 5 6.5 7.5 4"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
        </div>

        <TransitionGroup name="row" tag="ul" class="prows" role="rowgroup">
          <li v-for="row in sorted" :key="row.object.id" role="row">
            <RouterLink class="prow" :to="{ name: 'object', params: { id: row.object.id } }">
              <span class="cell cell--name" role="cell">
                <span
                  class="state"
                  :class="`state--${row.object.status.value}`"
                  :title="row.object.status.label"
                />
                <span class="ident">
                  <span class="ident__name">{{ row.object.name }}</span>
                  <span class="ident__sub">
                    {{ row.object.client?.name ?? 'без замовника' }} ·
                    {{ row.object.status.label }}
                  </span>
                </span>
              </span>

              <span class="cell cell--num" role="cell">
                <strong>{{ formatAmount(Math.round(row.finance.client)) }}</strong>
                <span v-if="row.finance.discount > 0" class="cell__sub">
                  знижка {{ formatCompact(row.finance.discount) }}
                </span>
              </span>

              <span class="cell cell--num" role="cell">
                <strong>{{ formatAmount(Math.round(row.finance.cost)) }}</strong>
                <span class="cell__sub">
                  мат. {{ formatCompact(row.finance.materials.cost) }} · роб.
                  {{ formatCompact(row.finance.services.cost) }}
                </span>
              </span>

              <span class="cell cell--num" role="cell">
                <strong :class="{ 'is-neg': row.finance.profit < 0 }">
                  {{ formatAmount(Math.round(row.finance.profit)) }}
                </strong>
              </span>

              <span class="cell" role="cell">
                <span class="chip" :class="tone(row.margin)">
                  {{ row.margin === null ? '—' : formatPercent(row.margin) }}
                </span>
              </span>

              <span class="cell" role="cell">
                <span class="meter">
                  <span class="meter__fill" :style="{ width: `${row.finance.progress * 100}%` }" />
                </span>
                <span class="cell__sub">
                  {{ formatPercent(row.finance.progress) }}
                  <template v-if="row.finance.due > 0.01">
                    · ще {{ formatCompact(row.finance.due) }}
                  </template>
                </span>
              </span>
            </RouterLink>
          </li>
        </TransitionGroup>

        <div v-if="rows.length > 1" class="ptotal" role="row">
          <span class="cell" role="cell">
            <span class="ptotal__label">Разом · {{ rows.length }}</span>
          </span>
          <span class="cell cell--num" role="cell">
            <strong>{{ formatAmount(Math.round(summary.client)) }}</strong>
          </span>
          <span class="cell cell--num" role="cell">
            <strong>{{ formatAmount(Math.round(summary.cost)) }}</strong>
          </span>
          <span class="cell cell--num" role="cell">
            <strong :class="{ 'is-neg': summary.profit < 0 }">
              {{ formatAmount(Math.round(summary.profit)) }}
            </strong>
          </span>
          <span class="cell" role="cell">
            <span class="chip" :class="tone(summary.margin)">
              {{ summary.margin === null ? '—' : formatPercent(summary.margin) }}
            </span>
          </span>
          <span class="cell" role="cell">
            <span class="meter">
              <span class="meter__fill" :style="{ width: `${summary.progress * 100}%` }" />
            </span>
            <span class="cell__sub">
              {{ formatPercent(summary.progress) }}
              <template v-if="summary.due > 0.01"> · ще {{ formatCompact(summary.due) }}</template>
            </span>
          </span>
        </div>
      </div>
    </div>
  </PanelCard>
</template>

<style scoped>
.wrap {
  padding: 0 12px 12px;
  overflow-x: auto;
}

.ptable {
  --cols: minmax(220px, 2.2fr) minmax(120px, 1fr) minmax(140px, 1.1fr) minmax(110px, 1fr) 84px
    minmax(130px, 1fr);

  display: grid;
  min-width: 860px;
}

.phead {
  display: grid;
  grid-template-columns: var(--cols);
  gap: 16px;
  padding: 0 12px 8px;
  border-bottom: 1px solid var(--line);
}

.phead__cell {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--ink-faint);
  text-align: left;
}

.phead__cell--num {
  justify-content: flex-end;
}

.phead__cell:hover,
.phead__cell--on {
  color: var(--ink);
}

.phead__cell svg {
  width: 10px;
  height: 10px;
  opacity: 0;
  transition:
    transform 0.2s var(--ease),
    opacity 0.16s var(--ease);
}

.phead__cell:hover svg,
.phead__cell--on svg {
  opacity: 1;
}

.phead__cell svg.is-asc {
  transform: rotate(180deg);
}

.prows {
  display: grid;
  gap: 2px;
  margin: 6px 0 0;
  padding: 0;
  list-style: none;
}

.prow {
  display: grid;
  grid-template-columns: var(--cols);
  align-items: center;
  gap: 16px;
  padding: 11px 12px;
  border-radius: var(--r-md);
  color: inherit;
  text-decoration: none;
  transition: background-color 0.16s var(--ease);
}

.prow:hover {
  background: var(--paper-sunk);
}

.row-move {
  transition: transform 0.35s var(--ease);
}

.ptotal {
  display: grid;
  grid-template-columns: var(--cols);
  align-items: center;
  gap: 16px;
  margin-top: 8px;
  padding: 14px 12px 4px;
  border-top: 1px solid var(--line);
}

.ptotal__label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.cell {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.cell--name {
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 11px;
}

.cell--num {
  justify-items: end;
  font-size: 13.5px;
  font-variant-numeric: tabular-nums;
}

.cell__sub {
  font-size: 11.5px;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.state {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ink-faint);
}

.state--in_progress {
  background: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-tint);
}

.state--planned {
  background: var(--c-4);
}

.ident {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.ident__name {
  font-size: 13.5px;
  font-weight: 600;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ident__sub {
  font-size: 12px;
  color: var(--ink-faint);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.is-neg {
  color: var(--danger);
}

.meter {
  height: 6px;
  border-radius: 999px;
  background: var(--paper-sunk);
  overflow: hidden;
}

.prow:hover .meter {
  background: var(--paper);
}

.meter__fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--c-1);
  transition: width 0.5s var(--ease);
}

.chip {
  justify-self: start;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.chip.is-good {
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.chip.is-warn {
  background: var(--amber-tint);
  color: #8a5a00;
}

.chip.is-bad {
  background: var(--danger-tint);
  color: var(--danger);
}
</style>
