<script setup lang="ts">
import { computed } from 'vue'
import ServiceStatusMenu from '@/components/objects/ServiceStatusMenu.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import type { Employee } from '@/lib/employees'
import {
  serviceCostTotal,
  serviceLineProfit,
  serviceRevenueTotal,
  serviceUsedVolume,
  type Service,
  type ServiceStatus,
} from '@/lib/services'
import { monogram } from '@/lib/workspaces'

/**
 * Роботи — таблиця, а не картки: їх на обʼєкті десятки, і дивляться на них
 * порівнюючи, рядок за рядком. Факт-обсяг тут не просто колонка, а кнопка:
 * поки його немає, стоїть блідий план, і видно, що цифра ще не остаточна.
 */

const props = defineProps<{
  rows: Service[]
  selected: number[]
  employees: Employee[]
  /** Приватний простір: виконавців немає, тож і колонки теж. */
  solo: boolean
}>()

const emit = defineEmits<{
  pick: [id: number, on: boolean]
  all: [on: boolean]
  status: [id: number, status: ServiceStatus]
  fact: [id: number]
  workers: [id: number]
  remove: [id: number]
}>()

const allPicked = computed(
  () => props.rows.length > 0 && props.rows.every((row) => props.selected.includes(row.id)),
)

/** Частина рядків обрана — головний чекбокс стає проміжним. */
const somePicked = computed(() => props.selected.length > 0 && !allPicked.value)

function employeeName(id: number): string {
  return props.employees.find((employee) => employee.id === id)?.name ?? 'Виконавець'
}

/** У рядку показуємо двох, решта згортається в «+N» — імена тут не читають. */
function shownWorkers(row: Service): { id: number; name: string }[] {
  return row.workers.slice(0, 2).map((worker) => ({
    id: worker.employee_id,
    name: employeeName(worker.employee_id),
  }))
}

function crewTitle(row: Service): string {
  return row.workers.map((worker) => employeeName(worker.employee_id)).join(', ')
}

function unitPrice(price: number | null): string {
  return price === null || price === 0 ? '—' : `${formatAmount(price)} ₴`
}
</script>

<template>
  <div class="stable" :class="{ 'stable--solo': solo }">
    <div class="shead">
      <label class="tick tick--head">
        <input
          type="checkbox"
          class="tick__input"
          :checked="allPicked"
          :indeterminate="somePicked"
          aria-label="Обрати всі показані роботи"
          @change="emit('all', !allPicked)"
        />
        <span class="tick__box" aria-hidden="true">
          <AppIcon :name="somePicked ? 'menu' : 'check'" />
        </span>
      </label>

      <span>Назва</span>
      <span class="shead__num">Обсяг, план</span>
      <span class="shead__num">Обсяг, факт</span>
      <span class="shead__num">Ціна за од.</span>
      <span class="shead__num">Сума</span>
      <span class="shead__apart">Статус</span>
      <span v-if="!solo">Виконавці</span>
      <span />
    </div>

    <TransitionGroup tag="ul" name="rows" class="srows">
      <li
        v-for="row in rows"
        :key="row.id"
        class="srow"
        :class="{ 'srow--picked': selected.includes(row.id) }"
      >
        <label class="tick">
          <input
            type="checkbox"
            class="tick__input"
            :checked="selected.includes(row.id)"
            :aria-label="`Обрати «${row.name}»`"
            @change="emit('pick', row.id, !selected.includes(row.id))"
          />
          <span class="tick__box" aria-hidden="true"><AppIcon name="check" /></span>
        </label>

        <div class="cell cell--name">
          <p class="name">{{ row.name }}</p>
          <p v-if="row.description" class="note">{{ row.description }}</p>
        </div>

        <div class="cell cell--num cell--plan" data-label="Обсяг, план">
          <p class="num">
            {{ formatAmount(row.planned_volume) }} <span class="unit">{{ row.unit }}</span>
          </p>
        </div>

        <!-- Факт — єдина цифра, яку вносять уже після роботи, тож клітинка й
             є кнопкою: поки факту немає, у ній блідо стоїть план. -->
        <div class="cell cell--num cell--fact" data-label="Обсяг, факт">
          <button
            type="button"
            class="fact"
            :class="{ 'fact--ghost': row.actual_volume === null }"
            :title="
              row.actual_volume === null
                ? 'Факт ще не внесено — сума рахується за планом'
                : 'Змінити факт-обсяг'
            "
            :aria-label="`Факт-обсяг роботи «${row.name}»`"
            @click="emit('fact', row.id)"
          >
            <span class="num">
              {{ formatAmount(row.actual_volume ?? row.planned_volume) }}
              <span class="unit">{{ row.unit }}</span>
            </span>
            <AppIcon name="document" class="fact__pen" />
          </button>
        </div>

        <div class="cell cell--num cell--price" data-label="Ціна за од.">
          <p class="num num--quiet">{{ unitPrice(row.client_price) }}</p>
        </div>

        <div class="cell cell--num cell--sum" data-label="Сума">
          <p class="num num--lead">
            {{ formatAmount(serviceRevenueTotal(row)) }} <span class="cur">₴</span>
          </p>

          <p
            v-if="!solo && serviceCostTotal(row) > 0"
            class="per per--profit"
            :class="{ 'per--minus': serviceLineProfit(row) < 0 }"
          >
            {{ serviceLineProfit(row) >= 0 ? '+' : '−'
            }}{{ formatAmount(Math.abs(serviceLineProfit(row))) }} ₴
          </p>
          <p v-else class="per">
            {{ serviceUsedVolume(row).basis === 'fact' ? 'за фактом' : 'за планом' }}
          </p>
        </div>

        <div class="cell cell--status cell--apart" data-label="Статус">
          <ServiceStatusMenu
            :status="row.status.value"
            :label="row.status.label"
            :name="row.name"
            @change="emit('status', row.id, $event)"
          />
        </div>

        <!-- Виконавці стоять аватарками: імена в рядку однаково не читають,
             а склад бригади розписують у власному вікні. -->
        <div v-if="!solo" class="cell cell--crew" data-label="Виконавці">
          <button
            type="button"
            class="crew"
            :class="{ 'crew--empty': row.workers.length === 0 }"
            :title="row.workers.length === 0 ? 'Призначити виконавців' : crewTitle(row)"
            :aria-label="`Виконавці роботи «${row.name}»`"
            @click="emit('workers', row.id)"
          >
            <template v-if="row.workers.length > 0">
              <span v-for="worker in shownWorkers(row)" :key="worker.id" class="ava">
                {{ monogram(worker.name) }}
              </span>
              <span v-if="row.workers.length > 2" class="ava ava--rest">
                +{{ row.workers.length - 2 }}
              </span>
            </template>

            <template v-else>
              <AppIcon name="plus" />
              <span class="crew__text">Призначити</span>
            </template>
          </button>
        </div>

        <div class="cell cell--drop">
          <button
            type="button"
            class="ctl-drop"
            :aria-label="`Прибрати «${row.name}»`"
            @click="emit('remove', row.id)"
          >
            <AppIcon name="trash" />
          </button>
        </div>
      </li>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.stable {
  /* Ширина таблиці залежить від колонки, а не від вікна: бічну панель можна
     згорнути, і рядок тоді ще довго лишається рядком. */
  container-type: inline-size;

  --cols: 28px minmax(140px, 2.4fr) 96px 112px 100px 124px 148px 108px 28px;

  /* Колонки стоять на відстані: підписи в шапці короткі й без роздільників. */
  --col-gap: 26px;

  display: grid;
  gap: 10px;
}

/* Приватний простір — колонки виконавців немає зовсім. */
.stable--solo {
  --cols: 28px minmax(140px, 2.4fr) 96px 112px 100px 124px 148px 28px;
}

.shead {
  display: grid;
  grid-template-columns: var(--cols);
  align-items: center;
  gap: var(--col-gap);
  padding: 0 18px 14px;
  border-bottom: 1px solid var(--line);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--ink-faint);
}

.shead__num {
  text-align: right;
}

/* Сума тулиться праворуч, статус — ліворуч: без цього відступу вони
   читаються як один підпис. */
.shead__apart,
.cell--apart {
  padding-left: 14px;
}

.srows {
  position: relative;
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.srow {
  display: grid;
  grid-template-columns: var(--cols);
  align-items: center;
  gap: var(--col-gap);
  padding: 15px 18px;
  border: 1px solid transparent;
  border-radius: var(--r-md);
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease);
}

.srow:hover {
  border-color: var(--line);
  background: var(--paper);
}

.srow--picked {
  border-color: var(--brand);
  background: var(--brand-tint);
}

.cell {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.cell--num {
  justify-items: end;
  text-align: right;
}

.name {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Опис роботи — підказка бригаді, а не заголовок: один рядок і тихо. */
.note {
  font-size: 12px;
  color: var(--ink-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.num {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.num--lead {
  font-size: 14px;
  letter-spacing: -0.015em;
}

.num--quiet {
  font-weight: 500;
  color: var(--ink-muted);
}

.cur {
  font-weight: 500;
  color: var(--ink-faint);
}

.unit {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.per {
  font-size: 11px;
  color: var(--ink-faint);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* Профіт рядка — єдине оцінне число в таблиці, тож і виглядає як оцінка. */
.per--profit {
  justify-self: end;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--brand-tint);
  color: var(--brand-strong);
  font-size: 10.5px;
  font-weight: 700;
}

.per--minus {
  background: var(--danger-tint);
  color: var(--danger);
}

/* ── Факт-обсяг ────────────────────────────────────────────────── */

.fact {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 8px;
  margin-right: -8px;
  border: 1px solid transparent;
  border-radius: var(--r-xs);
  background: transparent;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease);
}

.fact:hover {
  border-color: var(--line);
  background: var(--paper-raised);
}

/* Факту ще немає — у клітинці блідий план: видно, що цифра не остаточна. */
.fact--ghost .num,
.fact--ghost .unit {
  color: var(--ink-faint);
  font-weight: 500;
}

.fact__pen {
  width: 13px;
  height: 13px;
  color: var(--ink-faint);
  opacity: 0;
  transition: opacity 0.16s var(--ease);
}

.srow:hover .fact__pen,
.fact:focus-visible .fact__pen {
  opacity: 1;
}

/* ── Виконавці ─────────────────────────────────────────────────── */

.crew {
  display: inline-flex;
  align-items: center;
  padding: 3px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease);
}

.crew:hover {
  border-color: var(--line);
  background: var(--paper-raised);
}

.crew--empty {
  gap: 5px;
  padding: 5px 11px 5px 8px;
  border-style: dashed;
  border-color: var(--line-strong);
  color: var(--ink-faint);
}

.crew--empty:hover {
  border-style: solid;
  border-color: var(--brand);
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.crew__text {
  font-size: 11.5px;
  font-weight: 600;
}

.crew :deep(.icon) {
  width: 13px;
  height: 13px;
}

.ava {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border: 2px solid var(--paper-raised);
  border-radius: 50%;
  background: var(--brand-tint);
  color: var(--brand-strong);
  font-family: var(--font-display);
  font-size: 9px;
  font-weight: 600;
}

/* Аватарки заходять одна на одну — це один склад бригади, а не список. */
.ava + .ava {
  margin-left: -8px;
}

.ava--rest {
  background: var(--paper-sunk);
  color: var(--ink-muted);
  font-family: var(--font-body);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

/* ── Чекбокси ──────────────────────────────────────────────────── */

.tick {
  display: inline-grid;
  place-items: center;
  cursor: pointer;
}

.tick__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.tick__box {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  background: var(--paper-raised);
  color: transparent;
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.tick__box :deep(.icon) {
  width: 12px;
  height: 12px;
}

.tick__input:checked + .tick__box,
.tick__input:indeterminate + .tick__box {
  border-color: var(--brand);
  background: var(--brand);
  color: #08210a;
}

.tick__input:focus-visible + .tick__box {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

/* ── Анімація рядків ───────────────────────────────────────────── */

.rows-enter-active,
.rows-leave-active {
  transition:
    opacity 0.24s var(--ease),
    transform 0.24s var(--ease);
}

.rows-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

.rows-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.rows-leave-active {
  position: absolute;
}

.rows-move {
  transition: transform 0.24s var(--ease);
}

/* Вузько — рядок розгортається в картку: підписи колонок беруться з
   data-label, бо шапки таблиці там немає. */
@container (width < 1160px) {
  .shead {
    display: none;
  }

  .srows {
    gap: 12px;
  }

  /* Розкладка задана поіменно: у картці порядок читання інший, ніж порядок
     колонок у таблиці, а автопотік сітки такого не вміє. */
  .srow {
    grid-template-columns: auto repeat(3, minmax(0, 1fr));
    grid-template-areas:
      'tick name name  drop'
      'rail plan fact  fact'
      'rail sum  price price'
      'rail stat stat  stat'
      'rail crew crew  crew';
    align-items: start;
    gap: 14px 16px;
    padding: 18px;
    border-color: var(--line);
    background: var(--paper-raised);
  }

  .stable--solo .srow {
    grid-template-areas:
      'tick name name  drop'
      'rail plan fact  fact'
      'rail sum  price price'
      'rail stat stat  stat';
  }

  .srow > .tick {
    grid-area: tick;
  }

  .cell--name {
    grid-area: name;
  }

  .cell--plan {
    grid-area: plan;
  }

  .cell--fact {
    grid-area: fact;
  }

  .cell--price {
    grid-area: price;
  }

  .cell--sum {
    grid-area: sum;
  }

  .cell--status {
    grid-area: stat;
  }

  .cell--crew {
    grid-area: crew;
  }

  .cell--drop {
    grid-area: drop;
    justify-items: end;
  }

  /* У картці колонок немає — розсувати нема чого. */
  .cell--apart {
    padding-left: 0;
  }

  .cell::before {
    content: attr(data-label);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }

  .cell--name::before,
  .cell--drop::before {
    content: none;
  }

  .cell--num {
    justify-items: start;
    text-align: left;
  }

  .per--profit {
    justify-self: start;
  }

  .fact {
    margin-right: 0;
    margin-left: -8px;
  }

  .fact__pen {
    opacity: 1;
  }

  .cell--status :deep(.pick__btn) {
    width: auto;
  }

  .name {
    font-size: 14.5px;
    white-space: normal;
  }

  .note {
    white-space: normal;
  }
}
</style>
