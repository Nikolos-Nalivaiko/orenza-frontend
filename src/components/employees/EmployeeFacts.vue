<script setup lang="ts">
import { computed } from 'vue'
import { formatAmount } from '@/lib/amount'
import { EMPLOYEE_STATUS_LABELS, type Employee } from '@/lib/employees'
import { daysBetween, formatDay, formatDays } from '@/lib/objects'
import { payrollMonthLabel, type PayrollTotals } from '@/lib/payroll'

/**
 * Довідка про людину: відколи вона в системі, скільки обʼєктів за нею й що
 * нараховано цього місяця. Це не дашборд, а рядки «підпис — значення»: їх
 * читають згори вниз за один раз і вони спокійно стоять вузькою колонкою
 * збоку від опису.
 */

const props = defineProps<{ employee: Employee; totals: PayrollTotals; today: string }>()

/** День заведення: у записі лежить повний час, у довідці потрібен лише день. */
const since = computed(() =>
  props.employee.created_at === null ? null : props.employee.created_at.slice(0, 10),
)

const days = computed(() => (since.value === null ? null : daysBetween(since.value, props.today)))

const month = computed(() => payrollMonthLabel(props.today))
</script>

<template>
  <section class="facts">
    <h2 class="facts__title">Коротко</h2>

    <dl class="list">
      <div class="fact">
        <dt class="fact__label">У системі з</dt>
        <dd class="fact__value">{{ since === null ? '—' : formatDay(since) }}</dd>

        <p class="fact__sub">
          <template v-if="days !== null && days > 0">{{ formatDays(days) }} у команді</template>
          <template v-else-if="since !== null">заведений щойно</template>
          <template v-else>дата заведення невідома</template>
        </p>
      </div>

      <div class="fact">
        <dt class="fact__label">Статус</dt>
        <dd class="fact__value fact__value--text">
          {{ EMPLOYEE_STATUS_LABELS[employee.status] }}
        </dd>

        <p class="fact__sub">
          <template v-if="employee.status === 'active'">потрапляє в нові бригади</template>
          <template v-else>на нові роботи не пропонується</template>
        </p>
      </div>

      <div class="fact">
        <dt class="fact__label">Обʼєктів за весь час</dt>
        <dd class="fact__value">{{ totals.objects }}</dd>

        <p class="fact__sub">
          <template v-if="totals.busy > 0">зараз зайнятий на {{ totals.busy }}</template>
          <template v-else>зараз вільний</template>
        </p>
      </div>

      <div class="fact">
        <dt class="fact__label">Нараховано за {{ month }}</dt>
        <dd class="fact__value">{{ formatAmount(totals.month) }} <span class="cur">₴</span></dd>

        <p class="fact__sub">
          <template v-if="totals.month > 0"
            >із {{ formatAmount(totals.accrued) }} ₴ за весь час</template
          >
          <template v-else>цього місяця нарахувань не було</template>
        </p>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.facts {
  display: grid;
  align-content: start;
  gap: 4px;
  padding: 20px 22px 8px;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

.facts__title {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.list {
  display: grid;
  margin: 0;
}

.fact {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 2px 18px;
  padding: 13px 0;
  border-bottom: 1px solid var(--line);
}

.fact:last-child {
  border-bottom: 0;
}

.fact__label {
  grid-column: 1;
  grid-row: 1;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ink);
}

.fact__value {
  grid-column: 2;
  grid-row: 1 / span 2;
  margin: 0;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.04em;
  line-height: 1.2;
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* Статус — слово, а не цифра: табличні нулі й дисплейний шрифт йому ні до чого. */
.fact__value--text {
  font-family: var(--font-body);
  font-size: 14px;
  letter-spacing: -0.01em;
}

.cur {
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-faint);
}

.fact__sub {
  grid-column: 1;
  grid-row: 2;
  font-size: 12px;
  line-height: 1.45;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}
</style>
