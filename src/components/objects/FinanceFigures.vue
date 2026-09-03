<script setup lang="ts">
import { computed } from 'vue'
import { formatAmount } from '@/lib/amount'
import { dueState, DUE_STATE_LABELS, type ObjectFinance } from '@/lib/finance'

/**
 * Чотири цифри, по які й заходять у «Фінанси». Залишок серед них головний —
 * саме він відповідає на питання «скільки ще винні», тож у нього є автостатус
 * і смуга оплати.
 */

const props = defineProps<{ finance: ObjectFinance }>()

const state = computed(() => dueState(props.finance.client, props.finance.paid))

const percent = computed(() => Math.round(props.finance.progress * 100))

/** Переплату показуємо як переплату — сума з мінусом нікому ні про що не каже. */
const due = computed(() => Math.abs(props.finance.due))
</script>

<template>
  <dl class="figs">
    <div class="fig">
      <dt class="fig__label">Сума для клієнта</dt>
      <dd class="fig__value">{{ formatAmount(finance.client) }} <span class="cur">₴</span></dd>
      <p class="fig__sub">матеріали й роботи за мінусом знижки</p>
    </div>

    <div class="fig">
      <dt class="fig__label">Профіт</dt>
      <dd
        class="fig__value"
        :class="{ 'is-up': finance.profit > 0, 'is-down': finance.profit < 0 }"
      >
        {{ formatAmount(finance.profit) }} <span class="cur">₴</span>
      </dd>
      <p class="fig__sub">собівартість {{ formatAmount(finance.cost) }} ₴</p>
    </div>

    <div class="fig">
      <dt class="fig__label">Оплачено</dt>
      <dd class="fig__value">{{ formatAmount(finance.paid) }} <span class="cur">₴</span></dd>
      <p class="fig__sub">{{ percent }}% від суми для клієнта</p>
    </div>

    <div class="fig fig--due" :class="`fig--${state}`">
      <dt class="fig__label">
        {{ finance.due < 0 ? 'Переплата' : 'Залишок до сплати' }}
        <span class="dot" aria-hidden="true" />
      </dt>

      <dd class="fig__value">{{ formatAmount(due) }} <span class="cur">₴</span></dd>

      <span class="track">
        <span class="track__fill" :style="{ width: `${percent}%` }" />
      </span>

      <p class="fig__sub fig__sub--state">
        {{ DUE_STATE_LABELS[state] }}
        <template v-if="finance.pending > 0">
          · очікується {{ formatAmount(finance.pending) }} ₴
        </template>
      </p>
    </div>
  </dl>
</template>

<style scoped>
.figs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(196px, 1fr));
  gap: 12px;
  margin: 0;
}

.fig {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-raised);
}

.fig__label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.fig__value {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.02em;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* Гривня при сумі — одиниця, а не величина. */
.cur {
  font-size: 17px;
  font-weight: 500;
  color: var(--ink-faint);
}

.fig__sub {
  font-size: 12px;
  line-height: 1.45;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.fig__sub--state {
  font-weight: 600;
  color: var(--tone, var(--ink-muted));
}

.is-up {
  color: var(--brand-strong);
}

.is-down {
  color: var(--danger);
}

/* ── Залишок ───────────────────────────────────────────────────── */

/* Автостатус залишку — світлофор: колір ставиться раз і йде в крапку,
   смугу та підпис, щоб не було трьох різних відтінків одного стану. */
.fig--due {
  --tone: var(--ink-muted);
  --tone-tint: var(--paper-sunk);

  border-color: var(--line-strong);
}

.fig--none {
  --tone: var(--danger);
  --tone-tint: var(--danger-tint);
}

.fig--partial {
  --tone: #8a5c00;
  --tone-tint: var(--amber-tint);
}

.fig--paid,
.fig--over {
  --tone: var(--brand-strong);
  --tone-tint: var(--brand-tint);
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--tone);
}

.track {
  overflow: hidden;
  height: 5px;
  border-radius: 999px;
  background: var(--tone-tint);
}

.track__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--tone);
  transition: width 0.35s var(--ease);
}
</style>
