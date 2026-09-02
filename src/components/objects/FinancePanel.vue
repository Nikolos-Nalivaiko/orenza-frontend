<script setup lang="ts">
import { computed, nextTick, useTemplateRef } from 'vue'
import PaymentRow from '@/components/objects/PaymentRow.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import {
  clientDiscount,
  DISCOUNT_KIND_LABELS,
  emptyPayment,
  financeTotals,
  type DiscountForm,
  type DiscountKind,
  type FinanceErrors,
  type PaymentErrors,
  type PaymentForm,
} from '@/lib/finance'
import type { MaterialForm } from '@/lib/materials'
import type { ServiceForm } from '@/lib/services'

const props = defineProps<{
  /** Матеріали й роботи фінанси лише читають — редагують їх у своїх вкладках. */
  materials: MaterialForm[]
  services: ServiceForm[]
  /** Персональна знижка обраного замовника, % — нуль, якщо її немає. */
  clientPercent: number
  errors: FinanceErrors
}>()

const payments = defineModel<PaymentForm[]>({ required: true })
const discount = defineModel<DiscountForm>('discount', { required: true })

const root = useTemplateRef<HTMLElement>('root')

const totals = computed(() =>
  financeTotals({
    materials: props.materials,
    services: props.services,
    discount: discount.value,
    payments: payments.value,
  }),
)

/** Знижка досі та сама, що в замовника, — і їде за ним при зміні клієнта. */
const inherited = computed(() => discount.value.fromClient && props.clientPercent > 0)

const isEmpty = computed(() => payments.value.length === 0)

/** Скільки платежів уже закрито — підпис під смужкою прогресу. */
const paidCount = computed(() => payments.value.filter((item) => item.status === 'paid').length)

const percent = computed(() => Math.round(totals.value.progress * 100))

function errorsFor(id: string): PaymentErrors | undefined {
  return props.errors.payments?.[id]
}

/**
 * Щойно знижку правлять руками, вона стає знижкою обʼєкта: зміна замовника
 * її вже не перепише.
 */
function onValue(event: Event): void {
  const value = (event.target as HTMLInputElement).value

  discount.value = { ...discount.value, value, fromClient: false }
}

function onKind(event: Event): void {
  const kind = (event.target as HTMLSelectElement).value as DiscountKind

  discount.value = { ...discount.value, kind, fromClient: false }
}

function restore(): void {
  discount.value = clientDiscount(props.clientPercent)
}

async function add(): Promise<void> {
  payments.value = [...payments.value, emptyPayment()]

  await nextTick()
  root.value?.querySelector<HTMLElement>('.prow:last-child input')?.focus()
}

function remove(id: string): void {
  payments.value = payments.value.filter((payment) => payment.id !== id)
}
</script>

<template>
  <div ref="root" class="fin">
    <!-- Чотири цифри, за якими дивляться на обʼєкт: скільки він коштує
         замовнику, скільки лишається нам, скільки вже прийшло і скільки ні. -->
    <dl class="tiles">
      <div class="tile tile--lead">
        <dt>Сума для клієнта</dt>
        <dd>{{ formatAmount(totals.client) }} ₴</dd>
        <p class="tile__foot">
          матеріали {{ formatAmount(totals.materials) }} + роботи
          {{ formatAmount(totals.services) }}
          <template v-if="totals.discount > 0">
            − знижка {{ formatAmount(totals.discount) }}
          </template>
        </p>
      </div>

      <div class="tile tile--profit" :class="{ 'tile--minus': totals.profit < 0 }">
        <dt>Профіт</dt>
        <dd>{{ formatAmount(totals.profit) }} ₴</dd>
        <p class="tile__foot">собівартість {{ formatAmount(totals.cost) }} ₴</p>
      </div>

      <div class="tile">
        <dt>Оплачено</dt>
        <dd>{{ formatAmount(totals.paid) }} ₴</dd>

        <div class="bar" :aria-label="`Оплачено ${percent}% суми`">
          <span class="bar__fill" :style="{ width: `${percent}%` }" />
        </div>

        <p class="tile__foot">
          {{ percent }}% суми
          <template v-if="payments.length > 0">
            · {{ paidCount }} з {{ payments.length }} платежів
          </template>
        </p>
      </div>

      <div class="tile" :class="{ 'tile--minus': totals.overdue > 0 }">
        <dt>{{ totals.due < 0 ? 'Переплата' : 'Залишок до сплати' }}</dt>
        <dd>{{ formatAmount(Math.abs(totals.due)) }} ₴</dd>

        <p v-if="totals.overdue > 0" class="tile__foot tile__foot--bad">
          прострочено {{ formatAmount(totals.overdue) }} ₴
        </p>
        <p v-else-if="totals.pending > 0" class="tile__foot">
          в очікуванні {{ formatAmount(totals.pending) }} ₴
        </p>
        <p v-else class="tile__foot">платежів у роботі немає</p>
      </div>
    </dl>

    <!-- Знижка обʼєкта. Персональна знижка замовника лише підставляє сюди
         значення — рахується завжди те, що стоїть у цьому полі. -->
    <section class="disc">
      <span class="disc__icon" aria-hidden="true"><AppIcon name="spark" /></span>

      <h3 class="disc__title">Знижка</h3>

      <select
        class="ctl ctl--select disc__kind"
        aria-label="Тип знижки"
        :value="discount.kind"
        @change="onKind"
      >
        <option v-for="(label, value) in DISCOUNT_KIND_LABELS" :key="value" :value="value">
          {{ label }}
        </option>
      </select>

      <input
        class="ctl ctl--num disc__value"
        :class="{ 'ctl--bad': errors.discount }"
        type="text"
        inputmode="decimal"
        aria-label="Розмір знижки"
        placeholder="0"
        :value="discount.value"
        @input="onValue"
      />

      <!-- Скільки це в гривнях — видно лише там, де відсоток сам по собі не відповідь. -->
      <p v-if="discount.kind === 'percent' && totals.discount > 0" class="disc__sum">
        − {{ formatAmount(totals.discount) }} ₴
      </p>

      <span v-if="inherited" class="disc__chip">від замовника</span>
      <button v-else-if="clientPercent > 0" type="button" class="disc__restore" @click="restore">
        Повернути {{ clientPercent }}% замовника
      </button>

      <p v-if="errors.discount" class="disc__bad">{{ errors.discount }}</p>
    </section>

    <section class="pays">
      <header class="pays__head">
        <span class="pays__icon" aria-hidden="true"><AppIcon name="wallet" /></span>

        <h3 class="pays__title">
          Платежі замовника
          <span v-if="payments.length > 0" class="pays__count">{{ payments.length }}</span>
        </h3>
      </header>

      <div v-if="isEmpty" class="empty">
        <p class="empty__text">
          Аванс, транші за етапи, доплата після здачі. Оплачені платежі зменшують залишок, а
          прострочені одразу видно у верхній плашці.
        </p>

        <button type="button" class="btn btn--primary btn--sm" @click="add">
          <AppIcon name="plus" />
          Додати платіж
        </button>
      </div>

      <template v-else>
        <div class="head" aria-hidden="true">
          <span>Платіж</span>
          <span>Коментар</span>
          <span class="head__num">Сума, ₴</span>
          <span>Статус</span>
          <span>Дата</span>
          <span />
        </div>

        <TransitionGroup tag="ul" name="rows" class="rows">
          <PaymentRow
            v-for="(payment, index) in payments"
            :key="payment.id"
            :model-value="payment"
            :index="index"
            :errors="errorsFor(payment.id)"
            @remove="remove(payment.id)"
          />
        </TransitionGroup>

        <div class="foot">
          <button type="button" class="add" @click="add">
            <AppIcon name="plus" />
            Додати платіж
          </button>

          <dl class="sums">
            <div class="sum sum--paid">
              <dt>Оплачено</dt>
              <dd>{{ formatAmount(totals.paid) }} ₴</dd>
            </div>

            <div v-if="totals.pending > 0" class="sum">
              <dt>В очікуванні</dt>
              <dd>{{ formatAmount(totals.pending) }} ₴</dd>
            </div>

            <div v-if="totals.overdue > 0" class="sum sum--minus">
              <dt>Прострочено</dt>
              <dd>{{ formatAmount(totals.overdue) }} ₴</dd>
            </div>
          </dl>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.fin {
  /* Ширина таблиці платежів залежить від колонки, а не від вікна. */
  container-type: inline-size;

  --cols: minmax(150px, 1.7fr) minmax(140px, 1.6fr) 118px 148px 158px 32px;

  display: grid;
  gap: 20px;
}

/* ── Підсумки ──────────────────────────────────────────────────── */

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 10px;
  margin: 0;
}

.tile {
  display: grid;
  align-content: start;
  gap: 6px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper);
}

.tile dt {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.tile dd {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

/* Головна цифра екрана — сума, яку платить замовник. */
.tile--lead {
  border-color: var(--line-strong);
  background: var(--paper-raised);
}

.tile--lead dd {
  font-size: 26px;
}

.tile--profit {
  border-color: rgb(56 176 0 / 30%);
  background: var(--brand-tint);
}

.tile--profit dt,
.tile--profit dd {
  color: var(--brand-strong);
}

.tile--minus {
  border-color: rgb(200 52 31 / 30%);
  background: var(--danger-tint);
}

.tile--minus dt,
.tile--minus dd {
  color: var(--danger);
}

.tile__foot {
  font-size: 11.5px;
  line-height: 1.45;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.tile--profit .tile__foot {
  color: var(--brand-strong);
  opacity: 0.75;
}

.tile--minus .tile__foot,
.tile__foot--bad {
  color: var(--danger);
}

.bar {
  overflow: hidden;
  height: 4px;
  margin-top: 2px;
  border-radius: 999px;
  background: var(--paper-sunk);
}

.bar__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--brand);
  transition: width 0.35s var(--ease);
}

/* ── Знижка ────────────────────────────────────────────────────── */

/* Уся знижка — один рядок: заголовок, поле, результат і звідки вона взялась. */
.disc {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}

.disc__title {
  margin-right: 2px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* Звідки взялась цифра — видно, не відкриваючи картку замовника. */
.disc__chip {
  margin-left: auto;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--brand-tint);
  color: var(--brand-strong);
  font-size: 11.5px;
  font-weight: 600;
}

.disc__restore {
  margin-left: auto;
  padding: 4px 10px;
  border: 1px dashed var(--line-strong);
  border-radius: 999px;
  background: transparent;
  color: var(--ink-muted);
  font-size: 11.5px;
  font-weight: 600;
  transition:
    border-color 0.18s var(--ease),
    background-color 0.18s var(--ease),
    color 0.18s var(--ease);
}

.disc__restore:hover {
  border-color: var(--brand);
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.disc__kind {
  width: 72px;
  flex: none;
}

.disc__value {
  width: 118px;
  flex: none;
}

.disc__sum {
  font-size: 13px;
  font-weight: 600;
  color: var(--brand-strong);
  font-variant-numeric: tabular-nums;
}

/* Помилка стає окремим рядком — поля не мають через неї стрибати. */
.disc__bad {
  flex-basis: 100%;
  font-size: 12px;
  color: var(--danger);
}

/* ── Платежі ───────────────────────────────────────────────────── */

.pays {
  display: grid;
  gap: 10px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}

.pays__head {
  display: flex;
  align-items: center;
  gap: 9px;
}

.disc__icon,
.pays__icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 10px;
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.disc__icon :deep(.icon),
.pays__icon :deep(.icon) {
  width: 16px;
  height: 16px;
}

.pays__title {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.pays__count {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 11px;
  text-align: center;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

.head {
  display: grid;
  grid-template-columns: var(--cols);
  gap: 8px;
  padding: 0 8px 6px;
  border-bottom: 1px solid var(--line);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--ink-faint);
}

/* Підпис має стояти рівно над текстом у полі, а не над його рамкою. */
.head > span {
  padding-inline: 10px;
}

.head__num {
  text-align: right;
}

.rows {
  position: relative;
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.add {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px 8px 11px;
  border: 1px dashed var(--line-strong);
  border-radius: 999px;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  transition:
    border-color 0.18s var(--ease),
    background-color 0.18s var(--ease);
}

.add:hover {
  border-color: var(--brand);
  background: var(--brand-tint);
}

.add :deep(.icon) {
  width: 15px;
  height: 15px;
}

.sums {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
}

.sum {
  display: flex;
  align-items: baseline;
  gap: 7px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--paper-sunk);
}

.sum dt {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.sum dd {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.sum--paid {
  background: var(--brand-tint);
}

.sum--paid dt,
.sum--paid dd {
  color: var(--brand-strong);
}

.sum--minus {
  background: var(--danger-tint);
}

.sum--minus dt,
.sum--minus dd {
  color: var(--danger);
}

.empty {
  display: grid;
  justify-items: start;
  gap: 12px;
  padding: 22px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-md);
}

.empty__text {
  max-width: 62ch;
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink-muted);
}

.empty .btn :deep(.icon) {
  width: 15px;
  height: 15px;
}

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

@container (width < 950px) {
  .head {
    display: none;
  }

  .rows {
    gap: 10px;
  }

  .foot {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
