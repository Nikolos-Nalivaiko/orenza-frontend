<script setup lang="ts">
import StatusBadge from '@/components/objects/StatusBadge.vue'
import { formatAmount } from '@/lib/amount'
import { formatDay } from '@/lib/objects'
import { formatDeadline, type ObjectRow } from '@/lib/objectList'

defineProps<{ rows: ObjectRow[] }>()

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}
</script>

<template>
  <div class="otable">
    <div class="ohead" aria-hidden="true">
      <span>Обʼєкт</span>
      <span>Замовник</span>
      <span>Готовність</span>
      <span>Статус</span>
      <span>До сплати / оплачено</span>
      <span>Дедлайн</span>
    </div>

    <ul class="orows">
      <li v-for="{ object, summary } in rows" :key="object.id" class="orow">
        <div class="cell cell--name">
          <p class="orow__name">{{ object.name }}</p>
          <p class="orow__address">{{ object.address }}</p>
        </div>

        <div class="cell" data-label="Замовник">
          <p class="orow__client" :class="{ 'orow__client--none': object.client === null }">
            {{ object.client?.name ?? 'Без замовника' }}
          </p>
        </div>

        <div class="cell" data-label="Готовність">
          <template v-if="summary.readiness === null">
            <p class="orow__dash" title="Роботи ще не заведені">Етапів немає</p>
          </template>
          <template v-else>
            <p class="orow__num">{{ percent(summary.readiness) }}</p>
            <span class="track">
              <span class="track__fill" :style="{ width: percent(summary.readiness) }" />
            </span>
          </template>
        </div>

        <div class="cell" data-label="Статус">
          <StatusBadge :status="object.status.value" :label="object.status.label" />
        </div>

        <div class="cell" data-label="До сплати / оплачено">
          <p class="orow__money">
            {{ formatAmount(summary.client) }}
            <span class="orow__slash">/</span>
            <strong :class="{ 'is-full': summary.due <= 0 && summary.client > 0 }">
              {{ formatAmount(summary.paid) }}
            </strong>
          </p>
          <span class="track">
            <span
              class="track__fill track__fill--pay"
              :style="{ width: percent(summary.progress) }"
            />
          </span>
        </div>

        <div class="cell" data-label="Дедлайн">
          <p class="orow__num" :class="{ 'is-late': summary.overdue }">
            {{ object.finished_at === null ? '—' : formatDay(object.finished_at) }}
          </p>
          <p class="orow__due" :class="{ 'is-late': summary.overdue }">
            {{ formatDeadline(summary.daysLeft, summary.overdue) }}
          </p>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.otable {
  /* Ширина таблиці залежить від колонки: бічну панель можна згорнути. */
  container-type: inline-size;

  --cols: minmax(190px, 2.6fr) minmax(120px, 1.4fr) 136px 140px 176px 150px;

  display: grid;
  gap: 6px;
}

.ohead {
  display: grid;
  grid-template-columns: var(--cols);
  gap: 12px;
  padding: 0 14px 8px;
  border-bottom: 1px solid var(--line);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--ink-faint);
}

.orows {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.orow {
  display: grid;
  grid-template-columns: var(--cols);
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid transparent;
  border-radius: var(--r-md);
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease);
}

.orow:hover {
  border-color: var(--line);
  background: var(--paper-raised);
}

.cell {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.orow__name {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.orow__address,
.orow__client {
  font-size: 12.5px;
  color: var(--ink-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.orow__client--none {
  color: var(--ink-faint);
}

.orow__num {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.orow__dash {
  font-size: 12px;
  color: var(--ink-faint);
}

.orow__money {
  font-size: 12.5px;
  color: var(--ink-muted);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.orow__money strong {
  color: var(--ink);
}

/* Оплачено повністю — привід підсвітити: питань до замовника більше немає. */
.orow__money strong.is-full {
  color: var(--brand-strong);
}

.orow__slash {
  color: var(--ink-faint);
}

.orow__due {
  font-size: 11.5px;
  color: var(--ink-faint);
}

.is-late {
  color: var(--danger);
}

.track {
  overflow: hidden;
  height: 4px;
  border-radius: 999px;
  background: var(--paper-sunk);
}

.track__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--ink-muted);
  transition: width 0.3s var(--ease);
}

.track__fill--pay {
  background: var(--brand);
}

/* Вузько — рядок розгортається в картку: шапки таблиці там немає. */
@container (width < 960px) {
  .ohead {
    display: none;
  }

  .orows {
    gap: 10px;
  }

  .orow {
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    align-items: start;
    border-color: var(--line);
    background: var(--paper-raised);
  }

  .cell--name {
    grid-column: 1 / -1;
  }

  .cell:not(.cell--name)::before {
    content: attr(data-label);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }
}
</style>
