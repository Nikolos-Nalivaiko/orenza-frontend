<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { formatAmount } from '@/lib/amount'
import { EMPLOYEE_STATUS_LABELS } from '@/lib/employees'
import type { EmployeeRow } from '@/lib/employeeList'
import { payrollMonthLabel } from '@/lib/payroll'
import { formatPhone } from '@/lib/phone'

/**
 * Команда таблицею. У співробітника, як і в замовника, немає ні обкладинки,
 * ні візуального статусу — є контакти й цифри, а їх порівнюють по колонках.
 *
 * Рядок клікабельний увесь, але посилання в ньому два: імʼя веде в картку, а
 * телефон одразу набирає номер — саме заради нього в довідник і заходять,
 * коли треба когось терміново витягти на обʼєкт.
 */

defineProps<{ rows: EmployeeRow[]; today: string }>()
</script>

<template>
  <div class="etable">
    <div class="ehead" aria-hidden="true">
      <span>Співробітник</span>
      <span>Телефон</span>
      <span>Спеціальність</span>
      <span>Статус</span>
      <span class="ehead__num">Зайнятий</span>
      <span class="ehead__num">Нараховано</span>
    </div>

    <ul class="erows">
      <li
        v-for="{ employee, totals, active } in rows"
        :key="employee.id"
        class="erow"
        :class="{ 'erow--off': !active }"
      >
        <div class="cell cell--name">
          <p class="erow__title">
            <RouterLink class="erow__link" :to="{ name: 'employee', params: { id: employee.id } }">
              {{ employee.name }}
            </RouterLink>
          </p>

          <p class="erow__crew">{{ employee.crew || 'без бригади' }}</p>
        </div>

        <div class="cell" data-label="Телефон">
          <a v-if="employee.phone" class="erow__phone" :href="`tel:${employee.phone}`">
            {{ formatPhone(employee.phone) }}
          </a>
          <p v-else class="erow__none">—</p>
        </div>

        <div class="cell" data-label="Спеціальність">
          <p v-if="employee.role" class="erow__role">{{ employee.role }}</p>
          <p v-else class="erow__none">не вказана</p>
        </div>

        <div class="cell" data-label="Статус">
          <span class="state" :class="{ 'state--off': !active }">
            <span class="state__dot" aria-hidden="true" />
            {{ EMPLOYEE_STATUS_LABELS[employee.status] }}
          </span>
        </div>

        <!-- Завантаження: те, за чим сюди й заходять перед призначенням. -->
        <div class="cell cell--num" data-label="Зайнятий">
          <p class="erow__num" :class="{ 'is-free': totals.busy === 0 }">
            {{ totals.busy === 0 ? 'вільний' : totals.busy }}
          </p>
          <p class="erow__sub">
            <template v-if="totals.busy > 0">обʼєктів у роботі</template>
            <template v-else-if="totals.objects > 0">{{ totals.objects }} за весь час</template>
            <template v-else>ще не ставили</template>
          </p>
        </div>

        <div class="cell cell--num" data-label="Нараховано">
          <p class="erow__money" :class="{ 'is-zero': totals.accrued < 0.01 }">
            {{ formatAmount(totals.accrued) }} <span class="cur">₴</span>
          </p>
          <p class="erow__sub">
            <template v-if="totals.month > 0">
              {{ formatAmount(totals.month) }} ₴ за {{ payrollMonthLabel(today) }}
            </template>
            <template v-else-if="totals.accrued > 0">цього місяця — нічого</template>
            <template v-else>—</template>
          </p>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.etable {
  /* Ширина таблиці залежить від колонки: бічну панель можна згорнути. */
  container-type: inline-size;

  --cols: minmax(176px, 2.2fr) minmax(128px, 1.2fr) minmax(110px, 1fr) 128px 116px 150px;
  --col-gap: 24px;

  display: grid;
  gap: 6px;
}

.ehead {
  display: grid;
  grid-template-columns: var(--cols);
  gap: var(--col-gap);
  padding: 0 14px 8px;
  border-bottom: 1px solid var(--line);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--ink-faint);
}

.ehead__num {
  text-align: right;
}

.erows {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.erow {
  position: relative;
  display: grid;
  grid-template-columns: var(--cols);
  align-items: center;
  gap: var(--col-gap);
  padding: 12px 14px;
  border: 1px solid transparent;
  border-radius: var(--r-md);
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease);
}

.erow:hover {
  border-color: var(--line);
  background: var(--paper-raised);
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

.erow__title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.erow__link {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.erow__link::after {
  /* Клікабельний увесь рядок, але посилання лишається одне — на імені. */
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

.erow__link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.erow__crew,
.erow__role {
  font-size: 12.5px;
  color: var(--ink-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.erow__role {
  font-weight: 600;
  color: var(--ink);
}

/* Телефон лежить над накладкою рядка: інакше в нього не влучити. */
.erow__phone {
  position: relative;
  z-index: 1;
  justify-self: start;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  text-decoration: none;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.erow__phone:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.state {
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

.state__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand);
}

.state--off .state__dot {
  background: var(--ink-faint);
}

/* Неактивний тримається тихіше: він не в роботі, але з історії не зникає. */
.erow--off .erow__link,
.erow--off .erow__role {
  color: var(--ink-muted);
}

.erow__num {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* Вільний — не нуль, а стан: саме його шукають перед призначенням. */
.erow__num.is-free {
  color: var(--brand-strong);
}

.erow__money {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.015em;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.erow__money.is-zero {
  font-weight: 500;
  color: var(--ink-faint);
}

.cur {
  font-weight: 500;
  color: var(--ink-faint);
}

.erow__sub {
  font-size: 11.5px;
  color: var(--ink-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.erow__none {
  font-size: 12.5px;
  color: var(--ink-faint);
}

/* Вузько — рядок розгортається в картку: шапки таблиці там немає. */
@container (width < 1000px) {
  .ehead {
    display: none;
  }

  .erows {
    gap: 10px;
  }

  .erow {
    grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
    align-items: start;
    gap: 14px;
    border-color: var(--line);
    background: var(--paper-raised);
  }

  .cell--name {
    grid-column: 1 / -1;
  }

  .cell--num {
    justify-items: start;
    text-align: left;
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
