<script setup lang="ts">
import { computed } from 'vue'
import WorkerPicker from '@/components/objects/WorkerPicker.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount, parseAmount } from '@/lib/amount'
import type { Employee } from '@/lib/employees'
import {
  emptyServiceWorker,
  workerCost,
  type ServiceWorkerErrors,
  type ServiceWorkerForm,
} from '@/lib/services'

/**
 * Призначення виконавців: хто, скільки роботи взяв і за якою ставкою. Саме
 * звідси береться собівартість роботи.
 *
 * Унизу — м'яка перевірка розподілу: обсяги людей мають скластися в обсяг
 * роботи, але жорстко ми не блокуємо — часткова зайнятість буває.
 */

const props = defineProps<{
  unit: string
  /** Обсяг, на який ділять роботу: факт, щойно він зʼявився, інакше план. */
  volume: number
  employees: Employee[]
  loading: boolean
  errors?: Record<string, ServiceWorkerErrors>
}>()

const workers = defineModel<ServiceWorkerForm[]>({ required: true })

const assigned = computed(() =>
  workers.value.reduce((sum, worker) => sum + (parseAmount(worker.volume) ?? 0), 0),
)

const wage = computed(() =>
  workers.value.reduce((sum, worker) => sum + (workerCost(worker) ?? 0), 0),
)

/** Розійшлися більш ніж на копійку — підсвічуємо, але не забороняємо. */
const mismatch = computed(() => props.volume > 0 && Math.abs(assigned.value - props.volume) > 0.001)

/** Одну людину на одну роботу беруть один раз — решту рядків вона не займає. */
const taken = computed(() =>
  workers.value.flatMap((worker) => (worker.employeeId === null ? [] : [worker.employeeId])),
)

function workerErrors(id: string): ServiceWorkerErrors | undefined {
  return props.errors?.[id]
}

function add(): void {
  workers.value = [...workers.value, emptyServiceWorker()]
}

function remove(id: string): void {
  workers.value = workers.value.filter((worker) => worker.id !== id)
}
</script>

<template>
  <div class="crew">
    <template v-if="workers.length > 0">
      <!-- Шапка колонок замість підпису над кожним полем: рядки читаються
           як таблиця. -->
      <div class="cols" aria-hidden="true">
        <span>Співробітник</span>
        <span>Обсяг, {{ unit }}</span>
        <span>Ставка, ₴/{{ unit }}</span>
        <span class="cols__end">До виплати</span>
        <span />
      </div>

      <ul class="list">
        <li v-for="worker in workers" :key="worker.id" class="wrow">
          <div class="cell" data-label="Співробітник">
            <WorkerPicker
              v-model="worker.employeeId"
              :employees="employees"
              :loading="loading"
              :taken="taken"
              :invalid="Boolean(workerErrors(worker.id)?.employeeId)"
            />
            <p v-if="workerErrors(worker.id)?.employeeId" class="cell__bad">
              {{ workerErrors(worker.id)?.employeeId }}
            </p>
          </div>

          <div class="cell" :data-label="`Обсяг, ${unit}`">
            <input
              v-model="worker.volume"
              class="ctl ctl--num"
              :class="{ 'ctl--bad': workerErrors(worker.id)?.volume }"
              type="text"
              inputmode="decimal"
              aria-label="Обсяг виконавця"
              placeholder="0"
            />
          </div>

          <div class="cell" :data-label="`Ставка, ₴/${unit}`">
            <input
              v-model="worker.rate"
              class="ctl ctl--num"
              :class="{ 'ctl--bad': workerErrors(worker.id)?.rate }"
              type="text"
              inputmode="decimal"
              aria-label="Ставка за одиницю"
              placeholder="0"
            />
          </div>

          <p class="wrow__sum" data-label="До виплати">
            {{ workerCost(worker) === null ? '—' : `${formatAmount(workerCost(worker) ?? 0)} ₴` }}
          </p>

          <div class="cell cell--drop">
            <button
              type="button"
              class="ctl-drop"
              aria-label="Прибрати виконавця"
              @click="remove(worker.id)"
            >
              <AppIcon name="trash" />
            </button>
          </div>
        </li>
      </ul>
    </template>

    <p v-else class="empty">
      Ще нікого не призначено — додайте людину зі списку співробітників, і зʼявиться собівартість
      роботи.
    </p>

    <div class="foot">
      <button type="button" class="add" @click="add">
        <AppIcon name="plus" />
        Ще виконавець
      </button>

      <p v-if="volume > 0" class="spread" :class="{ 'spread--off': mismatch }">
        Розподілено
        <strong>{{ formatAmount(assigned) }} з {{ formatAmount(volume) }} {{ unit }}</strong>
      </p>

      <p class="wage">
        ЗП разом
        <strong>{{ formatAmount(wage) }} ₴</strong>
      </p>
    </div>
  </div>
</template>

<style scoped>
.crew {
  display: grid;
  gap: 10px;
}

.cols,
.wrow {
  display: grid;
  grid-template-columns: minmax(0, 1.7fr) 96px 104px 104px 30px;
  align-items: center;
  gap: 10px;
}

.cols {
  padding: 0 2px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.cols__end {
  text-align: right;
}

.list {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.wrow {
  align-items: start;
}

.cell {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.cell__bad {
  font-size: 11px;
  color: var(--danger);
}

.wrow__sum {
  padding-top: 9px;
  font-size: 13px;
  font-weight: 600;
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.empty {
  padding: 14px 16px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-md);
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--ink-muted);
}

.foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 18px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.add {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 13px 6px 10px;
  border: 1px dashed var(--line-strong);
  border-radius: 999px;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  transition:
    border-color 0.18s var(--ease),
    background-color 0.18s var(--ease);
}

.add:hover {
  border-color: var(--brand);
  background: var(--brand-tint);
}

.add :deep(.icon) {
  width: 14px;
  height: 14px;
}

/* Перевірка розподілу — підказка, а не заборона: часткова зайнятість буває. */
.spread {
  margin-left: auto;
  font-size: 12px;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.spread strong {
  color: var(--ink-muted);
}

.spread--off {
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--amber-tint);
  color: #8a5c00;
}

.spread--off strong {
  color: inherit;
}

.wage {
  font-size: 12px;
  color: var(--ink-faint);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.wage strong {
  font-size: 13px;
  color: var(--ink);
}

@media (width <= 640px) {
  .cols {
    display: none;
  }

  .wrow {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    padding: 12px;
    border: 1px solid var(--line);
    border-radius: var(--r-md);
  }

  .wrow > .cell:first-child {
    grid-column: span 2;
  }

  .cell::before,
  .wrow__sum::before {
    content: attr(data-label);
    display: block;
    margin-bottom: 3px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }

  .wrow__sum {
    padding-top: 0;
    text-align: left;
  }

  .cell--drop::before {
    content: none;
  }

  .spread {
    margin-left: 0;
  }
}
</style>
