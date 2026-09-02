<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import {
  isLate,
  PAYMENT_DESCRIPTION_MAX,
  PAYMENT_NAME_MAX,
  PAYMENT_STATUSES,
  type PaymentErrors,
  type PaymentForm,
} from '@/lib/finance'
import { todayIso } from '@/lib/objects'

defineProps<{ errors?: PaymentErrors; index: number }>()
const emit = defineEmits<{ remove: [] }>()

/** Рядок редагує платіж напряму: обʼєкт реактивний і належить формі обʼєкта. */
const payment = defineModel<PaymentForm>({ required: true })

/** Строк минув, а статус досі «в очікуванні» — про це варто сказати одразу. */
const late = computed(() => isLate(payment.value, todayIso()))
</script>

<template>
  <li class="prow" :class="`prow--${payment.status}`">
    <div class="cell cell--name" data-label="Платіж">
      <input
        v-model="payment.name"
        class="ctl"
        :class="{ 'ctl--bad': errors?.name }"
        type="text"
        :maxlength="PAYMENT_NAME_MAX"
        :aria-label="`Назва платежу, позиція ${index + 1}`"
        placeholder="Аванс за перший етап"
      />
      <p v-if="errors?.name" class="cell__bad">{{ errors.name }}</p>
    </div>

    <div class="cell cell--note" data-label="Коментар">
      <input
        v-model="payment.description"
        class="ctl"
        type="text"
        :maxlength="PAYMENT_DESCRIPTION_MAX"
        aria-label="Опис платежу"
        placeholder="Готівкою на майданчику, без квитанції"
      />
    </div>

    <div class="cell" data-label="Сума, ₴">
      <input
        v-model="payment.amount"
        class="ctl ctl--num"
        :class="{ 'ctl--bad': errors?.amount }"
        type="text"
        inputmode="decimal"
        aria-label="Сума платежу"
        placeholder="0"
      />
      <p v-if="errors?.amount" class="cell__bad">{{ errors.amount }}</p>
    </div>

    <div class="cell" data-label="Статус">
      <select
        v-model="payment.status"
        class="ctl ctl--select status"
        aria-label="Статус платежу"
        title="В очікуванні → Оплачено. Прострочено і Скасовано — розвилки збоку"
      >
        <option v-for="status in PAYMENT_STATUSES" :key="status.value" :value="status.value">
          {{ status.label }}
        </option>
      </select>
    </div>

    <div class="cell" data-label="Дата">
      <input
        v-model="payment.date"
        class="ctl"
        :class="{ 'ctl--bad': errors?.date }"
        type="date"
        aria-label="Дата платежу"
      />
      <p v-if="errors?.date" class="cell__bad">{{ errors.date }}</p>
      <p v-else-if="late" class="cell__late">Строк минув</p>
    </div>

    <div class="cell cell--drop">
      <button
        type="button"
        class="ctl-drop"
        :aria-label="`Прибрати платіж ${index + 1}`"
        @click="emit('remove')"
      >
        <AppIcon name="trash" />
      </button>
    </div>
  </li>
</template>

<style scoped>
.prow {
  display: grid;
  grid-template-columns: var(--cols);
  align-items: start;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--r-sm);
  transition: background-color 0.16s var(--ease);
}

.prow:hover {
  background: var(--paper);
}

.cell {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.cell__bad {
  font-size: 11px;
  color: var(--danger);
}

.cell__late {
  font-size: 11px;
  font-weight: 600;
  color: var(--amber);
}

/* Статус видно, не читаючи текст: гроші прийшли — зелений, прострочені — червоний. */
.prow--paid .status {
  border-color: rgb(56 176 0 / 40%);
  background-color: var(--brand-tint);
  color: var(--brand-strong);
}

.prow--overdue .status {
  border-color: rgb(200 52 31 / 40%);
  background-color: var(--danger-tint);
  color: var(--danger);
}

.prow--cancelled .status {
  color: var(--ink-faint);
}

/* Скасований платіж лишається в списку, але не претендує на увагу. */
.prow--cancelled .cell--name .ctl,
.prow--cancelled .cell--note .ctl {
  color: var(--ink-faint);
  text-decoration: line-through;
}

@container (width < 950px) {
  .prow {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--line);
    background: var(--paper-raised);
  }

  .prow:hover {
    background: var(--paper-raised);
  }

  .cell::before {
    content: attr(data-label);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }

  .cell--name,
  .cell--note {
    grid-column: span 2;
  }

  .cell--drop {
    grid-column: span 2;
    justify-items: end;
  }

  .cell--drop::before {
    content: none;
  }
}
</style>
