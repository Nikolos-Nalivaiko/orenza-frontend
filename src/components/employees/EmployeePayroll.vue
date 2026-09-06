<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { formatAmount } from '@/lib/amount'
import { formatDay } from '@/lib/objects'
import { payrollMonthLabel, type PayrollCharge, type PayrollTotals } from '@/lib/payroll'
import { formatWorks } from '@/lib/services'

/**
 * Зарплата людини — облік нарахованого, і нічого крім.
 *
 * Кожен рядок тут — та сама «людина × обсяг × ставка», яку записали в бригаді
 * роботи. Заводити чи правити суму на цьому екрані ніде: вона їде з обсягу й
 * ставки, а їх правлять там, де вони зʼявились, — у картці обʼєкта.
 */

const props = defineProps<{
  charges: PayrollCharge[]
  totals: PayrollTotals
  today: string
}>()

const month = computed(() => payrollMonthLabel(props.today))

/** Скільки з нарахованого ще може змінитись разом з обсягом роботи. */
const open = computed(() => props.totals.accrued - props.totals.done)
</script>

<template>
  <div class="pay">
    <dl class="figs">
      <div class="fig">
        <dt class="fig__label">Нараховано всього</dt>
        <dd class="fig__value">{{ formatAmount(totals.accrued) }} <span class="cur">₴</span></dd>
        <p class="fig__sub">{{ formatWorks(totals.charges) }} у бригадах</p>
      </div>

      <div class="fig">
        <dt class="fig__label">Нараховано за {{ month }}</dt>
        <dd class="fig__value">{{ formatAmount(totals.month) }} <span class="cur">₴</span></dd>
        <p class="fig__sub">
          <template v-if="totals.month > 0">поточний місяць</template>
          <template v-else>цього місяця нарахувань не було</template>
        </p>
      </div>

      <!-- Закрита робота вже не зміниться, відкрита — ще може: суми з них
           варто розрізняти, інакше «нараховано» читається як остаточне. -->
      <div class="fig">
        <dt class="fig__label">По закритих роботах</dt>
        <dd class="fig__value">{{ formatAmount(totals.done) }} <span class="cur">₴</span></dd>
        <p class="fig__sub">
          <template v-if="open > 0.01"> ще {{ formatAmount(open) }} ₴ по незакритих </template>
          <template v-else-if="totals.accrued > 0">усі роботи закрито</template>
          <template v-else>нарахувань ще не було</template>
        </p>
      </div>
    </dl>

    <section class="card">
      <header class="card__head">
        <div class="card__intro">
          <h2 class="card__title">
            Нарахування
            <span v-if="charges.length > 0" class="card__count">{{ charges.length }}</span>
          </h2>
          <p class="card__hint">
            Рахуються з бригад на роботах — обсяг × ставка. Щоб змінити суму, правлять роботу в
            картці обʼєкта.
          </p>
        </div>
      </header>

      <p v-if="charges.length === 0" class="empty">
        Нарахувань ще не було. Вони зʼявляться самі, щойно людину додадуть у бригаду роботи з
        обсягом і ставкою.
      </p>

      <template v-else>
        <div class="cols" aria-hidden="true">
          <span>Робота й обʼєкт</span>
          <span class="cols__num">Обсяг × ставка</span>
          <span class="cols__num">Сума</span>
        </div>

        <ul class="rows">
          <li v-for="charge in charges" :key="charge.id" class="row">
            <div class="cell cell--what">
              <p class="what">
                {{ charge.serviceName }}
                <span class="what__state" :class="`what__state--${charge.status.value}`">
                  {{ charge.status.label }}
                </span>
              </p>

              <p class="where">
                <RouterLink
                  class="where__link"
                  :to="{ name: 'object', params: { id: charge.objectId } }"
                >
                  {{ charge.objectName }}
                </RouterLink>
                <span v-if="charge.at" class="where__day">· {{ formatDay(charge.at) }}</span>
              </p>
            </div>

            <p class="cell cell--num cell--mult" data-label="Обсяг × ставка">
              {{ formatAmount(charge.volume) }} {{ charge.unit }}
              <span class="times">×</span>
              {{ formatAmount(charge.rate) }} ₴
            </p>

            <p class="cell cell--num cell--sum" data-label="Сума">
              {{ formatAmount(charge.amount) }} <span class="unit">₴</span>
            </p>
          </li>
        </ul>
      </template>
    </section>
  </div>
</template>

<style scoped>
.pay {
  display: grid;
  gap: 16px;
}

/* ── Три цифри ─────────────────────────────────────────────────── */

.figs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1px;
  overflow: hidden;
  margin: 0;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--line);
}

.fig {
  display: grid;
  align-content: start;
  gap: 4px;
  min-width: 0;
  padding: 16px 20px 18px;
  background: var(--paper-raised);
}

.fig__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.fig__value {
  margin: 0;
  font-family: var(--font-display);
  font-size: clamp(21px, 2vw, 26px);
  font-weight: 600;
  letter-spacing: -0.04em;
  line-height: 1.15;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.cur {
  margin-left: 2px;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-faint);
}

.fig__sub {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

/* ── Панель нарахувань ─────────────────────────────────────────── */

.card {
  container-type: inline-size;

  display: grid;
  gap: 14px;
  padding: 22px 24px 24px;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

.card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px 16px;
}

.card__intro {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.card__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.card__count {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 11px;
  text-align: center;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

.card__hint {
  max-width: 68ch;
  font-size: 12px;
  line-height: 1.45;
  color: var(--ink-faint);
}

.empty {
  padding: 20px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-md);
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink-muted);
}

.unit {
  font-weight: 500;
  color: var(--ink-faint);
}

/* ── Нарахування ───────────────────────────────────────────────── */

.cols {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 210px 132px;
  gap: 20px;
  padding: 0 4px 8px;
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
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 210px 132px;
  align-items: center;
  gap: 20px;
  padding: 12px 4px;
}

.row + .row {
  border-top: 1px solid var(--line);
}

.cell {
  min-width: 0;
}

.cell--what {
  display: grid;
  gap: 3px;
}

.cell--num {
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.cell--mult {
  font-size: 12.5px;
  color: var(--ink-muted);
}

.times {
  margin: 0 3px;
  color: var(--ink-faint);
}

.cell--sum {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.015em;
}

.what {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.what__state {
  flex: none;
  padding: 2px 9px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 10.5px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--ink-muted);
}

.what__state--done {
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.where {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: 12px;
  color: var(--ink-faint);
}

.where__link {
  color: var(--ink-muted);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.where__link:hover {
  color: var(--ink);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.where__day {
  flex: none;
  font-variant-numeric: tabular-nums;
}

/* Вузько — рядки розгортаються в картки: шапки таблиці там немає. */
@container (width < 720px) {
  .cols {
    display: none;
  }

  .rows {
    gap: 8px;
  }

  .row {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
    gap: 8px 14px;
    padding: 14px;
    border: 1px solid var(--line);
    border-radius: var(--r-md);
  }

  .cell--what {
    grid-column: 1 / -1;
  }

  .cell--mult {
    text-align: left;
  }

  .cell--sum {
    justify-self: end;
  }

  .cell--mult::before {
    content: attr(data-label) ': ';
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }
}
</style>
