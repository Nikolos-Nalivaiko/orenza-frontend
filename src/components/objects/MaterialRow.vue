<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import {
  materialProfit,
  MATERIAL_BUYER_LABELS,
  MATERIAL_STATUSES,
  MATERIAL_UNITS,
  type MaterialErrors,
  type MaterialForm,
} from '@/lib/materials'

defineProps<{ errors?: MaterialErrors; index: number }>()
const emit = defineEmits<{ remove: [] }>()

/**
 * Рядок редагує позицію напряму: обʼєкт реактивний і належить формі обʼєкта,
 * тож копіювати вісім полів туди-назад немає сенсу.
 */
const material = defineModel<MaterialForm>({ required: true })

const own = computed(() => material.value.buyer === 'contractor')

const profit = computed(() => materialProfit(material.value))
</script>

<template>
  <li class="mrow" :class="{ 'mrow--client': !own }">
    <div class="cell cell--name" data-label="Матеріал">
      <input
        v-model="material.name"
        class="ctl"
        :class="{ 'ctl--bad': errors?.name }"
        type="text"
        :aria-label="`Назва матеріалу, позиція ${index + 1}`"
        placeholder="Цегла керамічна М150"
      />
      <p v-if="errors?.name" class="cell__bad">{{ errors.name }}</p>
    </div>

    <div class="cell cell--qty" data-label="Кількість">
      <div class="qty">
        <input
          v-model="material.quantity"
          class="ctl ctl--num"
          :class="{ 'ctl--bad': errors?.quantity }"
          type="text"
          inputmode="decimal"
          aria-label="Кількість"
          placeholder="0"
        />
        <select
          v-model="material.unit"
          class="ctl ctl--select sel--unit"
          aria-label="Одиниця виміру"
        >
          <option v-for="unit in MATERIAL_UNITS" :key="unit" :value="unit">{{ unit }}</option>
        </select>
      </div>
      <p v-if="errors?.quantity" class="cell__bad">{{ errors.quantity }}</p>
    </div>

    <!-- Хто платить — головний перемикач рядка: від нього залежать ціни. -->
    <div class="cell cell--buyer" data-label="Купує">
      <select v-model="material.buyer" class="ctl ctl--select" aria-label="Хто купує матеріал">
        <option v-for="(label, value) in MATERIAL_BUYER_LABELS" :key="value" :value="value">
          {{ label }}
        </option>
      </select>
    </div>

    <div class="cell cell--price" data-label="Ціна закупівлі">
      <input
        v-if="own"
        v-model="material.costPrice"
        class="ctl ctl--num"
        :class="{ 'ctl--bad': errors?.costPrice }"
        type="text"
        inputmode="decimal"
        aria-label="Ціна закупівлі за одиницю"
        placeholder="0"
      />
      <span v-else class="cell__dash" title="Купує замовник — наших грошей тут немає">—</span>
      <p v-if="own && errors?.costPrice" class="cell__bad">{{ errors.costPrice }}</p>
    </div>

    <div class="cell cell--price" data-label="Ціна замовнику">
      <input
        v-if="own"
        v-model="material.clientPrice"
        class="ctl ctl--num"
        :class="{ 'ctl--bad': errors?.clientPrice }"
        type="text"
        inputmode="decimal"
        aria-label="Ціна за одиницю для замовника"
        placeholder="0"
      />
      <span v-else class="cell__dash">—</span>

      <p v-if="own && errors?.clientPrice" class="cell__bad">{{ errors.clientPrice }}</p>
      <p
        v-else-if="profit !== null && profit !== 0"
        class="cell__profit"
        :class="{ 'cell__profit--minus': profit < 0 }"
      >
        {{ profit > 0 ? '+' : '−' }}{{ formatAmount(Math.abs(profit)) }} ₴
      </p>
    </div>

    <div class="cell cell--status" data-label="Статус">
      <select
        v-model="material.status"
        class="ctl ctl--select"
        aria-label="Статус матеріалу"
        title="Потрібно → Замовлено → Доставлено → Використано"
      >
        <option v-for="status in MATERIAL_STATUSES" :key="status.value" :value="status.value">
          {{ status.label }}
        </option>
      </select>
    </div>

    <div class="cell cell--ok" data-label="Погоджено">
      <label class="ok" :title="`Погоджено замовником: ${material.approved ? 'так' : 'ні'}`">
        <input v-model="material.approved" type="checkbox" class="ok__input" />
        <span class="ok__box" aria-hidden="true"><AppIcon name="check" /></span>
        <span class="ok__text">Погоджено замовником</span>
      </label>
    </div>

    <div class="cell cell--drop">
      <button
        type="button"
        class="ctl-drop"
        :aria-label="`Прибрати позицію ${index + 1}`"
        @click="emit('remove')"
      >
        <AppIcon name="trash" />
      </button>
    </div>
  </li>
</template>

<style scoped>
.mrow {
  display: grid;
  grid-template-columns: var(--cols);
  align-items: start;
  gap: 8px;
  padding: 6px 8px;
  border-radius: var(--r-sm);
  transition: background-color 0.16s var(--ease);
}

.mrow:hover {
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

/* Позиція клієнта: ціни не ведемо взагалі, тож на їх місці прочерк. */
.cell__dash {
  padding-left: 4px;
  color: var(--ink-faint);
  line-height: 36px;
}

.cell__profit {
  font-size: 11px;
  font-weight: 600;
  color: var(--brand-strong);
  font-variant-numeric: tabular-nums;
}

.cell__profit--minus {
  color: var(--danger);
}

.qty {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 68px;
  gap: 4px;
}

.sel--unit {
  padding-inline: 8px 20px;
  background-position:
    right 9px center,
    right 4px center;
}

/* ── Погодження ────────────────────────────────────────────────── */

.ok {
  display: inline-grid;
  place-items: center;
  justify-self: start;
  height: 36px;
  margin-left: 10px;
  cursor: pointer;
}

.ok__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.ok__box {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 1px solid var(--line-strong);
  border-radius: 7px;
  background: var(--paper-raised);
  color: transparent;
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.ok__box :deep(.icon) {
  width: 12px;
  height: 12px;
}

.ok__input:checked + .ok__box {
  border-color: var(--brand);
  background: var(--brand);
  color: #08210a;
}

.ok__input:focus-visible + .ok__box {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

/* Підпис потрібен лише у вузькій розкладці — там, де немає шапки таблиці. */
.ok__text {
  display: none;
}

/*
 * Вузько — рядок розгортається в картку: підписи колонок беруться з
 * data-label, бо шапки таблиці там немає.
 */
@container (width < 950px) {
  .mrow {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    padding: 14px;
    border: 1px solid var(--line);
    background: var(--paper-raised);
  }

  .mrow:hover {
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

  .cell--name {
    grid-column: span 2;
  }

  .cell--drop {
    grid-column: span 2;
    justify-items: end;
  }

  .cell--drop::before {
    content: none;
  }

  .cell--ok {
    grid-column: span 2;
  }

  .cell--ok::before {
    content: none;
  }

  .ok {
    grid-auto-flow: column;
    justify-content: start;
    gap: 10px;
    margin-left: 0;
  }

  .ok__text {
    display: inline;
    font-size: 13px;
    color: var(--ink-muted);
  }

  .cell__dash {
    line-height: 1.4;
  }
}
</style>
