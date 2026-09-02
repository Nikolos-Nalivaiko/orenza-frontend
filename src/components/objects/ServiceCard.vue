<script setup lang="ts">
import { computed } from 'vue'
import WorkerPicker from '@/components/objects/WorkerPicker.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import type { Employee } from '@/lib/employees'
import {
  emptyServiceWorker,
  serviceCost,
  serviceProfit,
  serviceRevenue,
  serviceVolume,
  workerCost,
  workersVolume,
  SERVICE_DESCRIPTION_MAX,
  SERVICE_STATUSES,
  SERVICE_UNITS,
  type ServiceErrors,
  type ServiceForm,
  type ServiceWorkerErrors,
} from '@/lib/services'

const props = defineProps<{
  index: number
  errors?: ServiceErrors
  /** Приватний простір: виконавців немає, тож і собівартості теж. */
  solo: boolean
  /** Довідник співробітників простору — з нього обирають виконавця. */
  employees: Employee[]
  employeesLoading: boolean
}>()

const emit = defineEmits<{ remove: [] }>()

const service = defineModel<ServiceForm>({ required: true })

const volume = computed(() => serviceVolume(service.value))
const revenue = computed(() => serviceRevenue(service.value))
const cost = computed(() => serviceCost(service.value))
const profit = computed(() => serviceProfit(service.value))

/** Скільки роботи вже розписано на людей — і чи не більше, ніж її є. */
const assigned = computed(() => workersVolume(service.value))
const overAssigned = computed(() => volume.value.value > 0 && assigned.value > volume.value.value)

/** Одну людину на одну роботу беруть один раз — решту рядків вона не займає. */
const taken = computed(() =>
  service.value.workers.flatMap((worker) =>
    worker.employeeId === null ? [] : [worker.employeeId],
  ),
)

function workerErrors(id: string): ServiceWorkerErrors | undefined {
  return props.errors?.workers?.[id]
}

function addWorker(): void {
  service.value.workers = [...service.value.workers, emptyServiceWorker()]
}

function removeWorker(id: string): void {
  service.value.workers = service.value.workers.filter((worker) => worker.id !== id)
}
</script>

<template>
  <li class="svc">
    <div class="svc__main">
      <div class="cell cell--name" data-label="Робота">
        <input
          v-model="service.name"
          class="ctl"
          :class="{ 'ctl--bad': errors?.name }"
          type="text"
          :aria-label="`Назва роботи, позиція ${index + 1}`"
          placeholder="Штукатурка стін по маяках"
        />
        <p v-if="errors?.name" class="cell__bad">{{ errors.name }}</p>
      </div>

      <div class="cell" data-label="Одиниця">
        <select v-model="service.unit" class="ctl ctl--select" aria-label="Одиниця виміру">
          <option v-for="unit in SERVICE_UNITS" :key="unit" :value="unit">{{ unit }}</option>
        </select>
      </div>

      <div class="cell" data-label="Обсяг, план">
        <input
          v-model="service.planVolume"
          class="ctl ctl--num"
          :class="{ 'ctl--bad': errors?.planVolume }"
          type="text"
          inputmode="decimal"
          aria-label="Обсяг за планом"
          placeholder="0"
        />
        <p v-if="errors?.planVolume" class="cell__bad">{{ errors.planVolume }}</p>
      </div>

      <div class="cell" data-label="Обсяг, факт">
        <input
          v-model="service.factVolume"
          class="ctl ctl--num"
          :class="{ 'ctl--bad': errors?.factVolume }"
          type="text"
          inputmode="decimal"
          aria-label="Обсяг за фактом"
          placeholder="0"
        />
        <p v-if="errors?.factVolume" class="cell__bad">{{ errors.factVolume }}</p>
      </div>

      <div class="cell" data-label="Ціна за од., ₴">
        <input
          v-model="service.price"
          class="ctl ctl--num"
          :class="{ 'ctl--bad': errors?.price }"
          type="text"
          inputmode="decimal"
          aria-label="Ціна за одиницю для замовника"
          placeholder="0"
        />
        <p v-if="errors?.price" class="cell__bad">{{ errors.price }}</p>
      </div>

      <div class="cell" data-label="Статус">
        <select
          v-model="service.status"
          class="ctl ctl--select"
          aria-label="Статус роботи"
          title="Заплановано → В роботі → Виконано"
        >
          <option v-for="status in SERVICE_STATUSES" :key="status.value" :value="status.value">
            {{ status.label }}
          </option>
        </select>
      </div>

      <div class="cell cell--drop">
        <button
          type="button"
          class="ctl-drop"
          :aria-label="`Прибрати роботу ${index + 1}`"
          @click="emit('remove')"
        >
          <AppIcon name="trash" />
        </button>
      </div>
    </div>

    <textarea
      v-model="service.description"
      class="ctl svc__note"
      rows="2"
      :maxlength="SERVICE_DESCRIPTION_MAX"
      aria-label="Опис роботи"
      placeholder="Опис: що входить в роботу, вимоги, матеріал основи"
    />

    <!-- Виконавці й ЗП — саме вони дають собівартість роботи. -->
    <div v-if="!solo" class="crew">
      <div class="crew__head">
        <span class="crew__icon" aria-hidden="true"><AppIcon name="team" /></span>

        <h4 class="crew__title">
          Виконавці
          <span v-if="service.workers.length > 0" class="crew__count">
            {{ service.workers.length }}
          </span>
        </h4>

        <!-- Скільки роботи вже роздано: перебір видно одразу, а не в підсумку. -->
        <p v-if="assigned > 0" class="crew__spread" :class="{ 'crew__spread--over': overAssigned }">
          {{ formatAmount(assigned) }} з {{ formatAmount(volume.value) }} {{ service.unit }}
          розподілено
        </p>

        <p v-if="cost > 0" class="crew__cost">
          ЗП разом <strong>{{ formatAmount(cost) }} ₴</strong>
        </p>
      </div>

      <template v-if="service.workers.length > 0">
        <!-- Шапка колонок замість підпису над кожним полем: рядки читаються як таблиця. -->
        <div class="wcols" aria-hidden="true">
          <span>Співробітник</span>
          <span>Обсяг, {{ service.unit }}</span>
          <span>Ставка, ₴/{{ service.unit }}</span>
          <span class="wcols__end">До виплати</span>
          <span />
        </div>

        <ul class="crew__list">
          <li v-for="worker in service.workers" :key="worker.id" class="wrow">
            <div class="cell" data-label="Співробітник">
              <WorkerPicker
                v-model="worker.employeeId"
                :employees="employees"
                :loading="employeesLoading"
                :taken="taken"
                :invalid="Boolean(workerErrors(worker.id)?.employeeId)"
              />
              <p v-if="workerErrors(worker.id)?.employeeId" class="cell__bad">
                {{ workerErrors(worker.id)?.employeeId }}
              </p>
            </div>

            <div class="cell" :data-label="`Обсяг, ${service.unit}`">
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

            <div class="cell" :data-label="`Ставка, ₴/${service.unit}`">
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
                @click="removeWorker(worker.id)"
              >
                <AppIcon name="trash" />
              </button>
            </div>
          </li>
        </ul>
      </template>

      <p v-else class="crew__empty">
        Ще нікого не призначено — додайте людину зі списку співробітників, і зʼявиться собівартість
        роботи.
      </p>

      <button type="button" class="crew__add" @click="addWorker">
        <AppIcon name="plus" />
        Додати виконавця
      </button>
    </div>

    <!-- Підсумок рядка: дохід, ЗП і різниця між ними. -->
    <div class="money">
      <span class="money__item">
        Дохід
        <strong>{{ formatAmount(revenue) }} ₴</strong>
        <em>{{ volume.basis === 'fact' ? 'за фактом' : 'за планом' }}</em>
      </span>

      <template v-if="!solo">
        <span class="money__item">
          Собівартість
          <strong>{{ formatAmount(cost) }} ₴</strong>
        </span>

        <span class="money__item money__item--profit" :class="{ 'is-minus': profit < 0 }">
          Профіт
          <strong>{{ formatAmount(profit) }} ₴</strong>
        </span>
      </template>
    </div>
  </li>
</template>

<style scoped>
.svc {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-raised);
}

.svc__main {
  display: grid;
  grid-template-columns: var(--cols);
  align-items: start;
  gap: 8px;
}

.cell {
  display: grid;
  gap: 3px;
  min-width: 0;
}

/*
 * Картка послуги не має шапки таблиці — тож кожне поле підписує себе саме,
 * інакше незрозуміло, який із трьох чисел де.
 */
.cell::before,
.wrow__sum::before {
  content: attr(data-label);
  padding-inline: 2px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--ink-faint);
}

/* Кнопка підпису не має, але місце під нього тримає — інакше вона з'їде вгору. */
.cell--drop::before {
  content: '\00a0';
}

/* У виконавців підписи несе шапка колонок — над кожним полем вони зайві. */
.crew .cell::before,
.crew .wrow__sum::before {
  display: none;
}

.cell__bad {
  font-size: 11px;
  color: var(--danger);
}

.svc__note {
  height: auto;
  min-height: 0;
  padding: 9px 10px;
  line-height: 1.45;
  resize: vertical;
}

/* ── Виконавці ─────────────────────────────────────────────────── */

.crew {
  /* Колонки виконавців тримає одна змінна — шапка й рядки не роз'їжджаються. */
  --wcols: minmax(170px, 1fr) 106px 118px 104px 30px;

  display: grid;
  gap: 10px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--paper);
}

.crew__head {
  display: flex;
  align-items: center;
  gap: 9px;
}

.crew__icon {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 9px;
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.crew__icon :deep(.icon) {
  width: 15px;
  height: 15px;
}

.crew__title {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.crew__count {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 11px;
  text-align: center;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

/* Розподіл і сума тиснуться до правого краю — зліва лишається заголовок. */
.crew__spread {
  margin-left: auto;
  font-size: 12px;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.crew__spread--over {
  color: var(--danger);
}

.crew__cost {
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 12px;
  color: var(--ink-muted);
}

/* Коли розподілу ще немає, правий край тримає сама сума. */
.crew__cost:first-of-type {
  margin-left: auto;
}

.crew__cost strong {
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.crew__empty {
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--ink-faint);
}

.wcols {
  display: grid;
  grid-template-columns: var(--wcols);
  gap: 8px;
  padding: 0 2px 6px;
  border-bottom: 1px solid var(--line);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--ink-faint);
}

.wcols__end {
  text-align: right;
}

.crew__list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.wrow {
  display: grid;
  grid-template-columns: var(--wcols);
  align-items: start;
  gap: 8px;
}

.wrow__sum {
  display: grid;
  gap: 3px;
  align-content: center;
  min-height: 36px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

.crew__add {
  justify-self: start;
  padding: 6px 12px 6px 9px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px dashed var(--line-strong);
  border-radius: 999px;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  transition:
    border-color 0.18s var(--ease),
    background-color 0.18s var(--ease);
}

.crew__add:hover {
  border-color: var(--brand);
  background: var(--brand-tint);
}

.crew__add :deep(.icon) {
  width: 14px;
  height: 14px;
}

/* ── Гроші по роботі ───────────────────────────────────────────── */

.money {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  padding-top: 2px;
}

.money__item {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.money__item strong {
  font-size: 13.5px;
  letter-spacing: -0.01em;
  text-transform: none;
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.money__item em {
  font-size: 10.5px;
  font-style: normal;
  letter-spacing: 0;
  text-transform: none;
}

.money__item--profit strong {
  color: var(--brand-strong);
}

.money__item--profit.is-minus strong {
  color: var(--danger);
}

@container (width < 950px) {
  .svc__main {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .cell--name {
    grid-column: span 2;
  }

  /* Шапки колонок немає — підписи повертаються до кожного поля. */
  .wcols {
    display: none;
  }

  .crew .cell::before,
  .crew .wrow__sum::before {
    display: block;
  }

  .crew__head {
    flex-wrap: wrap;
  }

  .wrow {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: end;
    padding-bottom: 8px;
    border-bottom: 1px solid var(--line);
  }

  .wrow > .cell:first-child {
    grid-column: span 2;
  }

  .wrow__sum {
    align-content: end;
    text-align: left;
  }
}
</style>
