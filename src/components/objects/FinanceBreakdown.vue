<script setup lang="ts">
import { formatAmount } from '@/lib/amount'
import type { ObjectFinance } from '@/lib/finance'

/**
 * Розкладка суми: звідки взялись гроші клієнта й наші витрати. Нічого нового
 * тут не рахується — це ті самі підсумки з вкладок «Матеріали» й «Послуги».
 *
 * Окремого рядка «профіт» у таблиці немає навмисно: він і є різниця між
 * колонками, а вдруге його вже показано цифрою нагорі.
 */

defineProps<{ finance: ObjectFinance; discountLabel: string }>()
</script>

<template>
  <div class="calc">
    <div class="calc__head">
      <span />
      <span class="calc__col">Клієнту</span>
      <span class="calc__col">Наші витрати</span>
    </div>

    <div class="calc__row">
      <span class="calc__name">Матеріали</span>
      <span class="calc__num">{{ formatAmount(finance.materials.revenue) }} ₴</span>
      <span class="calc__num calc__num--cost">{{ formatAmount(finance.materials.cost) }} ₴</span>
    </div>

    <div class="calc__row">
      <span class="calc__name">Роботи</span>
      <span class="calc__num">{{ formatAmount(finance.services.revenue) }} ₴</span>
      <span class="calc__num calc__num--cost">{{ formatAmount(finance.services.cost) }} ₴</span>
    </div>

    <!-- Знижка знімає гроші лише з боку клієнта: нам вона нічого не здешевлює. -->
    <div class="calc__row">
      <span class="calc__name">
        Знижка
        <em v-if="discountLabel" class="calc__hint">{{ discountLabel }}</em>
      </span>
      <span class="calc__num calc__num--minus">
        {{ finance.discount > 0 ? `−${formatAmount(finance.discount)} ₴` : '—' }}
      </span>
      <span class="calc__num calc__num--cost">—</span>
    </div>

    <div class="calc__row calc__row--total">
      <span class="calc__name">Разом</span>
      <span class="calc__num">{{ formatAmount(finance.client) }} ₴</span>
      <span class="calc__num calc__num--cost">{{ formatAmount(finance.cost) }} ₴</span>
    </div>

    <p class="calc__foot">
      Різниця між колонками — це профіт обʼєкта:
      <strong :class="{ 'is-down': finance.profit < 0 }">
        {{ formatAmount(finance.profit) }} ₴
      </strong>
    </p>
  </div>
</template>

<style scoped>
.calc {
  display: grid;
  gap: 2px;
}

.calc__head,
.calc__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(96px, 160px) minmax(96px, 160px);
  align-items: baseline;
  gap: 12px 24px;
  padding: 9px 0;
}

.calc__head {
  padding-top: 0;
  border-bottom: 1px solid var(--line);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.calc__col {
  text-align: right;
}

.calc__row + .calc__row {
  border-top: 1px solid var(--line);
}

.calc__name {
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
  color: var(--ink-muted);
}

.calc__hint {
  font-size: 11.5px;
  font-style: normal;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.calc__num {
  font-size: 13.5px;
  font-weight: 600;
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* Витрати тримаються тихіше: у цій колонці дивляться на порядок, а не на цифру. */
.calc__num--cost {
  font-weight: 500;
  color: var(--ink-muted);
}

.calc__num--minus {
  color: var(--brand-strong);
}

.calc__row--total {
  margin-top: 2px;
  border-top: 1px solid var(--line-strong);
}

.calc__row--total .calc__name {
  font-weight: 600;
  color: var(--ink);
}

.calc__row--total .calc__num {
  font-size: 15px;
  letter-spacing: -0.015em;
}

.calc__row--total .calc__num--cost {
  font-weight: 600;
  color: var(--ink-muted);
}

.calc__foot {
  margin-top: 8px;
  font-size: 12px;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.calc__foot strong {
  color: var(--brand-strong);
}

.is-down {
  color: var(--danger);
}

@media (width <= 560px) {
  .calc__head,
  .calc__row {
    grid-template-columns: minmax(0, 1fr) minmax(84px, auto) minmax(84px, auto);
    gap: 10px 14px;
  }

  .calc__name {
    font-size: 12.5px;
  }

  /* Підпис знижки з'їдає і без того вузьку колонку назв. */
  .calc__hint {
    display: none;
  }
}
</style>
