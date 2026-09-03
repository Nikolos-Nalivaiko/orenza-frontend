<script setup lang="ts">
import { computed, ref } from 'vue'
import FinanceBreakdown from '@/components/objects/FinanceBreakdown.vue'
import FinanceFigures from '@/components/objects/FinanceFigures.vue'
import PaymentAddDialog from '@/components/objects/PaymentAddDialog.vue'
import PaymentsList from '@/components/objects/PaymentsList.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { objectFinance, type PaymentPayload } from '@/lib/finance'
import { formatDiscount, type ConstructionObject } from '@/lib/objects'
import { useObjectsStore } from '@/stores/objects'

/**
 * Вкладка «Фінанси»: чотири цифри згори, розкладка під розворотом і платежі.
 *
 * Нічого нового тут не рахується — суми приходять з «Матеріалів» і «Послуг»
 * за тими самими правилами, що діють на їхніх вкладках. Це місце, де їх
 * зводять із грошима, які реально прийшли.
 */

const props = defineProps<{ object: ConstructionObject; today: string }>()

const objects = useObjectsStore()

/** Розкладка згорнута: щодня дивляться на чотири цифри, а не на її рядки. */
const details = ref(false)
const adding = ref(false)

const finance = computed(() => objectFinance(props.object, props.today))

const discountLabel = computed(() => {
  const label = formatDiscount(props.object.discount_percent, props.object.discount_amount)

  return label === '' ? '' : `−${label}`
})

function add(payload: PaymentPayload): void {
  objects.addPayment(props.object.id, payload)
}

/** Гроші прийшли: дату надходження ставимо сьогоднішню, якщо її ще не було. */
function receive(paymentId: number): void {
  objects.setPaymentStatus(props.object.id, paymentId, 'paid', props.today)
}

function remove(paymentId: number): void {
  objects.removePayment(props.object.id, paymentId)
}
</script>

<template>
  <div class="fin">
    <section class="card">
      <FinanceFigures :finance="finance" />

      <div class="more">
        <button
          type="button"
          class="more__btn"
          :aria-expanded="details"
          @click="details = !details"
        >
          {{ details ? 'Згорнути розрахунок' : 'Детальніше' }}

          <AppIcon name="chevron" class="more__caret" :class="{ 'is-open': details }" />
        </button>

        <p v-if="!details" class="more__hint">Звідки склалась сума: матеріали, роботи та знижка</p>
      </div>

      <FinanceBreakdown v-if="details" :finance="finance" :discount-label="discountLabel" />
    </section>

    <section class="card">
      <PaymentsList
        :payments="object.payments"
        :today="today"
        @add="adding = true"
        @receive="receive"
        @remove="remove"
      />
    </section>

    <PaymentAddDialog
      v-if="adding"
      :today="today"
      :due="finance.due"
      @add="add"
      @close="adding = false"
    />
  </div>
</template>

<style scoped>
.fin {
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

.more {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px 14px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}

.more__btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease);
}

.more__btn:hover {
  border-color: var(--ink);
  background: var(--paper-sunk);
}

.more__caret {
  width: 14px;
  height: 14px;
  color: var(--ink-faint);
  transition: transform 0.2s var(--ease);
}

.more__caret.is-open {
  transform: rotate(180deg);
}

.more__hint {
  font-size: 12px;
  color: var(--ink-faint);
}
</style>
