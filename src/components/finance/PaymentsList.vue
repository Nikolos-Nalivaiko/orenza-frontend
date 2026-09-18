<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import PanelCard from '@/components/dashboard/PanelCard.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import { formatDay, formatDays } from '@/lib/objects'
import {
  countTabs,
  filterPayments,
  PAYMENT_TABS,
  paymentTab,
  type PaymentRow,
  type PaymentTab,
} from '@/lib/workspaceFinance'

const props = defineProps<{ rows: PaymentRow[] }>()

const PAGE = 12

const tab = ref<PaymentTab>('all')
const query = ref('')
const limit = ref(PAGE)

watch([tab, query], () => {
  limit.value = PAGE
})

const counts = computed(() => countTabs(props.rows))
const filtered = computed(() => filterPayments(props.rows, tab.value, query.value))
const visible = computed(() => filtered.value.slice(0, limit.value))
const total = computed(() => filtered.value.reduce((sum, row) => sum + row.payment.amount, 0))

const STATE_LABELS: Record<Exclude<PaymentTab, 'all'>, string> = {
  paid: 'Отримано',
  expected: 'Очікується',
  late: 'Прострочено',
}
</script>

<template>
  <PanelCard title="Платежі" hint="усі платежі замовників по обʼєктах простору">
    <div class="pay">
      <div class="pay__bar">
        <div class="tabs" role="tablist" aria-label="Статус платежів">
          <button
            v-for="item in PAYMENT_TABS"
            :key="item.value"
            type="button"
            role="tab"
            class="tabs__btn"
            :class="[`tabs__btn--${item.value}`, { 'tabs__btn--on': tab === item.value }]"
            :aria-selected="tab === item.value"
            @click="tab = item.value"
          >
            {{ item.label }}
            <span class="tabs__count">{{ counts[item.value] }}</span>
          </button>
        </div>

        <label class="search">
          <AppIcon name="search" class="search__icon" />
          <input
            v-model="query"
            class="search__input"
            type="search"
            placeholder="Обʼєкт, замовник або призначення"
            aria-label="Пошук платежів"
          />
        </label>
      </div>

      <ul v-if="visible.length > 0" class="rows">
        <li v-for="row in visible" :key="row.payment.id">
          <RouterLink class="row" :to="{ name: 'object', params: { id: row.object.id } }">
            <span class="row__icon" :class="`row__icon--${paymentTab(row)}`" aria-hidden="true">
              <AppIcon
                :name="
                  paymentTab(row) === 'paid'
                    ? 'check'
                    : paymentTab(row) === 'late'
                      ? 'alert'
                      : 'clock'
                "
              />
            </span>

            <span class="row__main">
              <span class="row__name">{{ row.payment.name }}</span>
              <span class="row__obj">
                {{ row.object.name
                }}<template v-if="row.object.client"> · {{ row.object.client }}</template>
              </span>
            </span>

            <span class="row__date">
              {{ row.payment.paid_at ? formatDay(row.payment.paid_at) : 'без дати' }}
            </span>

            <span class="row__side">
              <strong class="row__sum" :class="{ 'is-in': paymentTab(row) === 'paid' }">
                {{ formatAmount(row.payment.amount) }} ₴
              </strong>
              <span class="badge" :class="`badge--${paymentTab(row)}`">
                {{
                  row.late
                    ? `${formatDays(row.daysLate)} прострочки`
                    : STATE_LABELS[paymentTab(row)]
                }}
              </span>
            </span>
          </RouterLink>
        </li>
      </ul>

      <p v-else class="nothing">
        {{
          rows.length === 0
            ? 'Платежів ще немає — їх заводять у картці обʼєкта.'
            : 'За цими умовами платежів немає.'
        }}
      </p>

      <footer v-if="filtered.length > 0" class="pay__foot">
        <p class="pay__total">
          {{ filtered.length }} платежів на <strong>{{ formatAmount(total) }} ₴</strong>
        </p>

        <button v-if="filtered.length > limit" type="button" class="more" @click="limit += PAGE">
          Показати ще {{ Math.min(PAGE, filtered.length - limit) }}
        </button>
      </footer>
    </div>
  </PanelCard>
</template>

<style scoped>
.pay {
  container-type: inline-size;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}

.pay__bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.tabs {
  display: flex;
  min-width: 0;
  max-width: 100%;
  gap: 2px;
  padding: 3px;
  overflow-x: auto;
  scrollbar-width: none;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-sunk);
}

.tabs__btn {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 6px;
  padding: 6px 13px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-muted);
  transition:
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.tabs__btn:hover {
  color: var(--ink);
}

.tabs__btn--on {
  background: var(--paper-raised);
  color: var(--ink);
  box-shadow: var(--shadow-sm);
}

.tabs__count {
  min-width: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: rgb(12 17 14 / 6%);
  font-size: 10.5px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.tabs__btn--late .tabs__count {
  background: var(--danger-tint);
  color: var(--danger);
}

.search {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 240px;
  min-width: 0;
}

.search__icon {
  position: absolute;
  left: 12px;
  width: 16px;
  height: 16px;
  color: var(--ink-faint);
  pointer-events: none;
}

.search__input {
  width: 100%;
  height: 38px;
  padding: 0 12px 0 36px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-raised);
  font-size: 13px;
  outline: none;
  transition:
    border-color 0.16s var(--ease),
    box-shadow 0.16s var(--ease);
}

.search__input:hover {
  border-color: var(--line-strong);
}

.search__input:focus {
  border-color: rgb(56 176 0 / 55%);
  box-shadow: 0 0 0 3px var(--brand-glow);
}

.rows {
  display: grid;
  gap: 1px;
  margin: 0 -10px;
  padding: 0;
  list-style: none;
}

.row {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) 120px 160px;
  align-items: center;
  gap: 14px;
  padding: 9px 10px;
  border-radius: var(--r-sm);
  color: inherit;
  text-decoration: none;
  transition: background-color 0.16s var(--ease);
}

.row:hover {
  background: var(--paper-sunk);
}

.row__icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 11px;
}

.row__icon :deep(.icon) {
  width: 16px;
  height: 16px;
}

.row__icon--paid {
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.row__icon--expected {
  background: var(--c-4-soft);
  color: var(--c-4);
}

.row__icon--late {
  background: var(--danger-tint);
  color: var(--danger);
}

.row__main {
  display: grid;
  min-width: 0;
}

.row__name {
  font-size: 13.5px;
  font-weight: 600;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.row__obj {
  font-size: 12px;
  color: var(--ink-faint);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.row__date {
  font-size: 12.5px;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.row__side {
  display: grid;
  justify-items: end;
  gap: 3px;
}

.row__sum {
  font-size: 13.5px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.is-in {
  color: var(--brand-strong);
}

.badge {
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  white-space: nowrap;
}

.badge--paid {
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.badge--expected {
  background: var(--paper-sunk);
  color: var(--ink-muted);
}

.badge--late {
  background: var(--danger-tint);
  color: var(--danger);
}

.nothing {
  padding: 28px 0;
  font-size: 13px;
  text-align: center;
  color: var(--ink-faint);
}

.pay__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.pay__total {
  font-size: 12.5px;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

.pay__total strong {
  color: var(--ink);
}

.more {
  padding: 8px 16px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: var(--paper-raised);
  font-size: 12.5px;
  font-weight: 600;
  transition: border-color 0.16s var(--ease);
}

.more:hover {
  border-color: var(--ink);
}

@container (width <= 560px) {
  .row {
    grid-template-columns: 32px minmax(0, 1fr) auto;
  }

  .row__date {
    display: none;
  }
}
</style>
