<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import FinanceKpi from '@/components/finance/FinanceKpi.vue'
import IncomeChart from '@/components/finance/IncomeChart.vue'
import ObjectsProfit from '@/components/finance/ObjectsProfit.vue'
import PaymentsList from '@/components/finance/PaymentsList.vue'
import ReceivablesCard from '@/components/finance/ReceivablesCard.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import { formatObjects } from '@/lib/dashboard'
import { todayIso } from '@/lib/objects'
import {
  formatPercent,
  incomeByMonth,
  moneyTotals,
  objectMargins,
  paymentRows,
  receivables,
} from '@/lib/workspaceFinance'
import { useObjectsStore } from '@/stores/objects'
import { useWorkspacesStore } from '@/stores/workspaces'

const workspaces = useWorkspacesStore()
const objects = useObjectsStore()

const today = todayIso()

const items = computed(() => objects.current)

const totals = computed(() => moneyTotals(items.value, today))
const months = computed(() => incomeByMonth(items.value, today))
const debts = computed(() => receivables(items.value, today))
const margins = computed(() => objectMargins(items.value, today))
const payments = computed(() => paymentRows(items.value, today))

const blank = computed(() => !objects.isLoading && items.value.length === 0)

function share(part: number, whole: number): number {
  return whole <= 0 ? 0 : part / whole
}

const kpis = computed(() => {
  const t = totals.value

  return [
    {
      key: 'contracted',
      label: 'Сума договорів',
      value: t.contracted,
      icon: 'building' as const,
      tone: 'plain' as const,
      hint: `по ${formatObjects(t.objects)}, без архіву`,
      meter:
        t.contracted > 0
          ? {
              share: share(t.cost, t.contracted),
              label: `собівартість ${formatPercent(share(t.cost, t.contracted))}`,
            }
          : null,
    },
    {
      key: 'paid',
      label: 'Отримано',
      value: t.paid,
      icon: 'wallet' as const,
      tone: 'brand' as const,
      hint: `цього місяця ${formatAmount(t.paidThisMonth)} ₴`,
      meter:
        t.contracted > 0
          ? {
              share: share(t.paid, t.contracted),
              label: `${formatPercent(share(t.paid, t.contracted))} від суми договорів`,
            }
          : null,
    },
    {
      key: 'due',
      label: 'Залишок до отримання',
      value: t.due,
      icon: 'clock' as const,
      tone: t.overdue > 0 ? ('danger' as const) : ('plain' as const),
      hint:
        t.overdue > 0 ? `прострочено ${formatAmount(t.overdue)} ₴` : 'прострочених платежів немає',
      meter:
        t.contracted > 0
          ? {
              share: share(t.due, t.contracted),
              label: `${formatPercent(share(Math.max(t.due, 0), t.contracted))} ще не оплачено`,
            }
          : null,
    },
    {
      key: 'profit',
      label: 'Профіт',
      value: t.profit,
      icon: 'spark' as const,
      tone: t.profit < 0 ? ('danger' as const) : ('brand' as const),
      hint: 'сума для клієнта мінус собівартість',
      meter:
        t.margin === null ? null : { share: t.margin, label: `маржа ${formatPercent(t.margin)}` },
    },
  ]
})

onMounted(() => {
  if (!objects.loaded) {
    void objects.fetchObjects()
  }
})
</script>

<template>
  <div class="fin">
    <header class="fin__head">
      <p class="eyebrow">Гроші простору</p>
      <h1 class="display fin__title">Фінанси</h1>
      <p class="muted fin__sub">
        Скільки заробляють обʼєкти «{{ workspaces.current?.name }}» і хто ще винен.
      </p>
    </header>

    <template v-if="objects.isLoading && items.length === 0">
      <div class="kpis" aria-hidden="true">
        <span v-for="index in 4" :key="index" class="sk sk--tile" />
      </div>
      <span class="sk sk--block" aria-hidden="true" />
    </template>

    <section v-else-if="blank" class="blank">
      <span class="blank__icon" aria-hidden="true"><AppIcon name="wallet" /></span>
      <h2 class="display blank__title">Рахувати поки нічого</h2>
      <p class="blank__text">
        Фінанси збираються з обʼєктів: матеріали й роботи дають суму та собівартість, платежі —
        надходження й борги. Заведіть перший обʼєкт, і цифри зʼявляться тут.
      </p>
      <RouterLink class="btn btn--primary btn--sm blank__cta" :to="{ name: 'object-create' }">
        Створити обʼєкт
      </RouterLink>
    </section>

    <template v-else>
      <section class="kpis" aria-label="Головні показники">
        <FinanceKpi
          v-for="kpi in kpis"
          :key="kpi.key"
          :label="kpi.label"
          :value="kpi.value"
          :icon="kpi.icon"
          :tone="kpi.tone"
          :hint="kpi.hint"
          :meter="kpi.meter"
        />
      </section>

      <div class="grid">
        <IncomeChart :months="months" />
        <ReceivablesCard :data="debts" />
      </div>

      <ObjectsProfit v-if="margins.length > 0" :rows="margins" />

      <PaymentsList :rows="payments" />
    </template>
  </div>
</template>

<style scoped>
.fin {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 18px;
  width: 100%;
  max-width: 1420px;
  margin: 0 auto;
}

.fin__head {
  display: grid;
  gap: 7px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--line);
}

.fin__title {
  font-size: clamp(26px, 3vw, 36px);
}

.fin__sub {
  font-size: 14px;
}

.kpis {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
}

.grid {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(0, 1fr);
  gap: 14px;
  align-items: stretch;
}

.sk {
  border-radius: var(--r-lg);
  background: linear-gradient(
    90deg,
    var(--paper-sunk) 0%,
    var(--paper-raised) 50%,
    var(--paper-sunk) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

.sk--tile {
  height: 168px;
}

.sk--block {
  height: 340px;
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

.blank {
  display: grid;
  justify-items: start;
  gap: 12px;
  width: 100%;
  max-width: 560px;
  padding: 32px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

.blank__icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 15px;
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.blank__icon :deep(.icon) {
  width: 23px;
  height: 23px;
}

.blank__title {
  font-size: clamp(20px, 2.4vw, 26px);
}

.blank__text {
  max-width: 52ch;
  font-size: 14px;
  line-height: 1.55;
  color: var(--ink-muted);
}

.blank__cta {
  margin-top: 6px;
  text-decoration: none;
}

@media (width <= 1240px) {
  .kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 1080px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (width <= 640px) {
  .kpis {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
