<script setup lang="ts">
import { computed, ref } from 'vue'
import ClientPayments from '@/components/clients/ClientPayments.vue'
import PaymentDialog from '@/components/objects/PaymentDialog.vue'
import { formatAmount } from '@/lib/amount'
import {
  clientPayments,
  formatObjects,
  type ClientPaymentRow,
  type ClientTotals,
} from '@/lib/clients'
import { dueState, DUE_STATE_LABELS, objectFinance, type PaymentPayload } from '@/lib/finance'
import type { ConstructionObject } from '@/lib/objects'
import { useObjectsStore } from '@/stores/objects'

/**
 * Вкладка «Фінанси» замовника — той самий фінансовий блок, що й у картці
 * обʼєкта, тільки зведений по всіх його обʼєктах. Профіт тут головна цифра:
 * вона каже, наскільки вигідна людина загалом, а не одна її будова.
 */

const props = defineProps<{
  objects: ConstructionObject[]
  totals: ClientTotals
  today: string
}>()

const store = useObjectsStore()

/** Платіж, який зараз правлять, разом із обʼєктом, якому він належить. */
const editing = ref<ClientPaymentRow | null>(null)

/**
 * Залишок рахуємо по тому обʼєкту, а не по замовнику: вікно платежу показує,
 * що станеться саме з цією будовою.
 */
const editingDue = computed(() => {
  const object = props.objects.find((item) => item.id === editing.value?.object.id)

  return object === undefined ? 0 : objectFinance(object, props.today).due
})

function save(payload: PaymentPayload): void {
  if (editing.value !== null) {
    store.updatePayment(editing.value.object.id, editing.value.payment.id, payload)
  }
}

const state = computed(() => dueState(props.totals.client, props.totals.paid))
const percent = computed(() => Math.round(props.totals.progress * 100))
const due = computed(() => Math.abs(props.totals.due))

/** Гроші рахуються по живих обʼєктах — підпис має сказати це вголос. */
const counted = computed(() => props.totals.objects - props.totals.archived)

const rows = computed(() => clientPayments(props.objects))
</script>

<template>
  <div class="cfin">
    <dl class="figs">
      <div class="fig">
        <dt class="fig__label">Сума по всіх обʼєктах</dt>
        <dd class="fig__value">{{ formatAmount(totals.client) }} <span class="cur">₴</span></dd>
        <p class="fig__sub">{{ formatObjects(counted) }} поза архівом</p>
      </div>

      <div class="fig">
        <dt class="fig__label">Оплачено всього</dt>
        <dd class="fig__value">{{ formatAmount(totals.paid) }} <span class="cur">₴</span></dd>
        <p class="fig__sub">{{ percent }}% від суми по замовнику</p>
      </div>

      <div class="fig fig--due" :class="`fig--${state}`">
        <dt class="fig__label">
          {{ totals.due < 0 ? 'Переплата' : 'Залишок по всіх обʼєктах' }}
        </dt>

        <dd class="fig__value">{{ formatAmount(due) }} <span class="cur">₴</span></dd>

        <span class="track">
          <span class="track__fill" :style="{ width: `${percent}%` }" />
        </span>

        <p class="fig__sub fig__sub--state">
          {{ DUE_STATE_LABELS[state] }}
          <template v-if="totals.pending > 0">
            · очікується {{ formatAmount(totals.pending) }} ₴
          </template>
        </p>
      </div>

      <!-- Та сама цифра, що й в обʼєкті, але за весь час стосунків. -->
      <div class="fig fig--profit" :class="{ 'fig--loss': totals.profit < 0 }">
        <dt class="fig__label">Профіт з замовника</dt>
        <dd class="fig__value fig__value--tone">
          {{ formatAmount(totals.profit) }} <span class="cur">₴</span>
        </dd>
        <p class="fig__sub">собівартість {{ formatAmount(totals.cost) }} ₴</p>
      </div>
    </dl>

    <section class="card">
      <ClientPayments :rows="rows" :today="today" @edit="editing = $event" />
    </section>

    <PaymentDialog
      v-if="editing"
      :key="`${editing.object.id}-${editing.payment.id}`"
      :today="today"
      :due="editingDue"
      :payment="editing.payment"
      @save="save"
      @close="editing = null"
    />
  </div>
</template>

<style scoped>
.cfin {
  display: grid;
  gap: 16px;
}

.card {
  display: grid;
  gap: 18px;
  padding: 24px 26px;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

/* Та сама смуга, що й у шапці замовника: чотири колонки, розділені
   волосяними лініями, — щоб екран читався одним ритмом. */
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
  --tone: var(--ink-muted);
  --tone-soft: var(--paper-sunk);

  display: grid;
  align-content: start;
  gap: 4px;
  min-width: 0;
  padding: 16px 20px 18px;
  background: var(--paper-raised);
}

.fig--profit {
  --tone: var(--brand-strong);
  --tone-soft: var(--brand-tint);
}

/* Мінус на профіті — не привід для зеленого. */
.fig--loss {
  --tone: var(--danger);
  --tone-soft: var(--danger-tint);
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

/* Профіт — єдина цифра, яку фарбуємо: у неї є «добре» і «погано». */
.fig__value--tone {
  color: var(--tone);
}

/* Гривня при сумі — одиниця, а не величина. */
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

.fig__sub--state {
  margin-top: 2px;
  font-weight: 600;
  color: var(--tone);
}

/* Автостатус залишку — той самий світлофор, що й у фінансах обʼєкта. */
.fig--none {
  --tone: var(--danger);
  --tone-soft: var(--danger-tint);
}

.fig--partial {
  --tone: #8a5c00;
  --tone-soft: var(--amber-tint);
}

.fig--paid,
.fig--over {
  --tone: var(--brand-strong);
  --tone-soft: var(--brand-tint);
}

.track {
  overflow: hidden;
  height: 4px;
  margin-top: 10px;
  border-radius: 999px;
  background: var(--tone-soft);
}

.track__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--tone);
  transition: width 0.35s var(--ease);
}

@media (width <= 560px) {
  .card {
    padding: 18px;
  }
}
</style>
