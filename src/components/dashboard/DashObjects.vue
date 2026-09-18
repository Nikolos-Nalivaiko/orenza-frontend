<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { formatAmount } from '@/lib/amount'
import { formatDeadline, type ObjectRow } from '@/lib/objectList'

defineProps<{ rows: ObjectRow[] }>()

function percent(share: number | null): string {
  return share === null ? '—' : `${Math.round(share * 100)}%`
}
</script>

<template>
  <div class="wrap">
    <div class="tbl" role="table" aria-label="Обʼєкти в роботі">
      <div class="tbl__head" role="row">
        <span role="columnheader">Обʼєкт</span>
        <span role="columnheader">Готовність</span>
        <span role="columnheader">Строк</span>
        <span role="columnheader" class="num">Оплачено</span>
      </div>

      <RouterLink
        v-for="{ object, summary } in rows"
        :key="object.id"
        class="tbl__row"
        role="row"
        :to="{ name: 'object', params: { id: object.id } }"
      >
        <span class="name" role="cell">
          <span
            class="dot"
            :class="`dot--${object.status.value}`"
            :title="object.status.label"
            aria-hidden="true"
          />
          <span class="name__text">
            <span class="name__title">{{ object.name }}</span>
            <span class="name__sub">
              {{ object.client?.name ?? object.address
              }}<template v-if="object.status.value !== 'in_progress'">
                · {{ object.status.label }}</template
              >
            </span>
          </span>
        </span>

        <span class="ready" role="cell">
          <span class="bar" aria-hidden="true">
            <span class="bar__fill" :style="{ width: percent(summary.readiness ?? 0) }" />
          </span>
          <span class="ready__pct">{{ percent(summary.readiness) }}</span>
        </span>

        <span class="due" :class="{ 'due--late': summary.overdue }" role="cell">
          {{ formatDeadline(summary.daysLeft, summary.overdue) }}
        </span>

        <span class="paid num" role="cell">
          <span class="paid__sum">{{ formatAmount(Math.round(summary.paid)) }}</span>
          <span class="paid__of">з {{ formatAmount(Math.round(summary.client)) }} ₴</span>
        </span>
      </RouterLink>
    </div>
  </div>
</template>

<style scoped>
.wrap {
  container-type: inline-size;
}

.tbl {
  --cols: minmax(0, 2.4fr) minmax(110px, 1fr) minmax(120px, 1fr) minmax(120px, 1fr);

  display: grid;
}

.tbl__head,
.tbl__row {
  display: grid;
  grid-template-columns: var(--cols);
  align-items: center;
  gap: 16px;
  padding: 0 22px;
}

.tbl__head {
  padding-bottom: 9px;
  border-bottom: 1px solid var(--line);
  font-size: 11px;
  font-weight: 500;
  color: var(--ink-faint);
  white-space: nowrap;
}

.tbl__row {
  min-height: 58px;
  padding-block: 10px;
  color: inherit;
  text-decoration: none;
  transition: background-color 0.14s var(--ease);
}

.tbl__row + .tbl__row {
  border-top: 1px solid var(--line);
}

.tbl__row:hover {
  background: var(--paper);
}

.num {
  text-align: right;
  justify-items: end;
}

.name {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.name__text {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ink-faint);
}

.dot--in_progress {
  background: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-tint);
}

.dot--planned {
  background: var(--c-4);
  box-shadow: 0 0 0 3px var(--c-4-soft);
}

.dot--paused {
  background: var(--amber);
  box-shadow: 0 0 0 3px var(--amber-tint);
}

.name__title {
  font-size: 13.5px;
  font-weight: 600;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.name__sub {
  font-size: 12px;
  color: var(--ink-faint);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ready {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 34px;
  align-items: center;
  gap: 10px;
}

.bar {
  height: 4px;
  border-radius: 999px;
  background: var(--paper-sunk);
  overflow: hidden;
}

.bar__fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--ink-muted);
}

.ready__pct {
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  color: var(--ink-muted);
  text-align: right;
}

.due {
  font-size: 12.5px;
  color: var(--ink-muted);
  white-space: nowrap;
}

.due--late {
  color: var(--danger);
  font-weight: 600;
}

.paid {
  display: grid;
  gap: 1px;
  font-variant-numeric: tabular-nums;
}

.paid__sum {
  font-size: 13px;
  font-weight: 600;
}

.paid__of {
  font-size: 11.5px;
  color: var(--ink-faint);
  white-space: nowrap;
}

@container (width <= 640px) {
  .tbl__row {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .tbl__head {
    display: none;
  }

  .ready,
  .due {
    display: none;
  }
}
</style>
