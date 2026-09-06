<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { formatAmount } from '@/lib/amount'
import { groupByObject, type PayrollCharge } from '@/lib/payroll'
import { formatWorks } from '@/lib/services'

/**
 * Де людина задіяна. Це не нова сутність, а той самий склад бригади, тільки з
 * іншого боку: не «хто на цій роботі», а «на яких роботах ця людина».
 *
 * Групуємо по обʼєктах: три роботи на одній будові — це одне місце роботи, а
 * не три різні, і саме так їх тримає в голові власник.
 */

const props = defineProps<{ charges: PayrollCharge[] }>()

const groups = computed(() => groupByObject(props.charges))
</script>

<template>
  <section class="eobj">
    <p v-if="groups.length === 0" class="empty">
      Людину ще не ставили на жодну роботу. Щойно її додадуть у бригаду на вкладці «Роботи»
      будь-якого обʼєкта, тут зʼявиться і обʼєкт, і обсяг, і статус.
    </p>

    <article v-for="group in groups" :key="group.objectId" class="group">
      <header class="group__head">
        <h2 class="group__title">
          <RouterLink class="group__link" :to="{ name: 'object', params: { id: group.objectId } }">
            {{ group.objectName }}
          </RouterLink>

          <span v-if="group.archived" class="tag">Архів</span>
          <span v-else-if="group.busy" class="tag tag--on">Зайнятий</span>
          <span v-else class="tag">Завершено</span>
        </h2>

        <p class="group__meta">
          {{ formatWorks(group.rows.length) }} · нараховано
          <strong>{{ formatAmount(group.amount) }} ₴</strong>
        </p>
      </header>

      <div class="cols" aria-hidden="true">
        <span>Робота</span>
        <span class="cols__num">Обсяг виконавця</span>
        <span>Статус роботи</span>
      </div>

      <ul class="rows">
        <li v-for="row in group.rows" :key="row.id" class="row">
          <p class="cell cell--name" data-label="Робота">{{ row.serviceName }}</p>

          <p class="cell cell--num" data-label="Обсяг виконавця">
            {{ formatAmount(row.volume) }} <span class="unit">{{ row.unit }}</span>
          </p>

          <p class="cell" data-label="Статус роботи">
            <span class="chip" :class="`chip--${row.status.value}`">
              <span class="chip__dot" aria-hidden="true" />
              {{ row.status.label }}
            </span>
          </p>
        </li>
      </ul>
    </article>
  </section>
</template>

<style scoped>
.eobj {
  container-type: inline-size;

  --cols: minmax(0, 2.2fr) 160px 150px;

  display: grid;
  gap: 12px;
}

.group {
  display: grid;
  gap: 10px;
  padding: 18px 20px 16px;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

.group__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 14px;
}

.group__title {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.group__link {
  color: inherit;
  text-decoration: none;
}

.group__link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.tag {
  padding: 2px 9px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--ink-faint);
}

.tag--on {
  border-color: rgb(56 176 0 / 40%);
  color: var(--brand-strong);
}

.group__meta {
  font-size: 12.5px;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.group__meta strong {
  color: var(--ink);
}

.cols {
  display: grid;
  grid-template-columns: var(--cols);
  gap: 16px;
  padding: 0 2px 8px;
  border-bottom: 1px solid var(--line);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--ink-faint);
}

.cols__num {
  text-align: right;
}

.rows {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: grid;
  grid-template-columns: var(--cols);
  align-items: center;
  gap: 16px;
  padding: 10px 2px;
}

.row + .row {
  border-top: 1px solid var(--line);
}

.cell {
  min-width: 0;
}

.cell--name {
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.cell--num {
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.unit {
  font-weight: 500;
  color: var(--ink-faint);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 11px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--ink-muted);
}

.chip__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--ink-faint);
}

.chip--in_progress .chip__dot {
  background: var(--amber);
}

.chip--done .chip__dot {
  background: var(--brand);
}

.empty {
  padding: 24px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-lg);
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--ink-muted);
}

@container (width < 640px) {
  .cols {
    display: none;
  }

  .row {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: 8px 14px;
    padding: 12px 2px;
  }

  .cell--name {
    grid-column: 1 / -1;
  }

  .cell--num {
    text-align: left;
  }

  .cell:not(.cell--name)::before {
    content: attr(data-label);
    display: block;
    margin-bottom: 2px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }
}
</style>
