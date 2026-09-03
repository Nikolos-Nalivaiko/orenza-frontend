<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, useTemplateRef } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount, parseAmount } from '@/lib/amount'
import {
  buildMaterialPayload,
  emptyMaterial,
  materialCost,
  materialProfit,
  materialRevenue,
  MATERIAL_BUYER_LABELS,
  MATERIAL_STATUSES,
  MATERIAL_UNITS,
  validateMaterial,
  type MaterialPayload,
} from '@/lib/materials'

/**
 * Швидке додавання позиції. Матеріали вносять часто й по одному, тож форма
 * має відкриватись і закриватись за секунди: видно рівно те, без чого позиції
 * не існує, а ціни розгортаються лише там, де гроші рухаємо ми.
 *
 * «Додати й ще одну» лишає вікно відкритим — так заводять список закупівель
 * підряд, не клікаючи «Додати матеріал» двадцять разів.
 */

const emit = defineEmits<{ add: [payload: MaterialPayload]; close: [] }>()

const titleId = useId()

const name = useTemplateRef<HTMLInputElement>('name')

const material = ref(emptyMaterial())
/** Помилки показуємо лише після спроби зберегти — не поки людина ще друкує. */
const tried = ref(false)
/** Скільки позицій уже завели цим вікном: підпис, що робота йде. */
const added = ref(0)

const own = computed(() => material.value.buyer === 'contractor')

const errors = computed(() => (tried.value ? validateMaterial(material.value) : {}))

/**
 * Ціни вводять за одиницю, а домовляються завжди про суму позиції — тож
 * множення на кількість форма робить сама, просто на очах.
 */
const cost = computed(() => materialCost(material.value))
const revenue = computed(() => materialRevenue(material.value))
const profit = computed(() => materialProfit(material.value))

/** Підпис під сумами: за що саме вони порахувані. */
const totalsHint = computed(() => {
  const quantity = parseAmount(material.value.quantity)

  return quantity === null
    ? 'Вкажіть кількість і ціни — суми порахуються самі'
    : `За ${formatAmount(quantity)} ${material.value.unit}`
})

function money(value: number | null): string {
  return value === null ? '—' : `${formatAmount(value)} ₴`
}

function submit(again: boolean): void {
  tried.value = true

  if (Object.keys(validateMaterial(material.value)).length > 0) {
    return
  }

  emit('add', buildMaterialPayload(material.value))

  if (!again) {
    emit('close')

    return
  }

  added.value += 1

  // Одиницю, покупця й стадію лишаємо: наступна позиція з тієї ж поставки
  // майже завжди така сама, а перезаповнювати їх щоразу — марна робота.
  material.value = {
    ...emptyMaterial(),
    unit: material.value.unit,
    buyer: material.value.buyer,
    status: material.value.status,
  }

  tried.value = false

  void nextTick(() => name.value?.focus())
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close')
  }
}

const bodyOverflow = ref('')

onMounted(async () => {
  bodyOverflow.value = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKeydown)

  await nextTick()
  name.value?.focus()
})

onBeforeUnmount(() => {
  document.body.style.overflow = bodyOverflow.value
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <form
      class="dialog"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @submit.prevent="submit(false)"
    >
      <header class="dialog__head">
        <h2 :id="titleId" class="display dialog__title">Новий матеріал</h2>

        <button type="button" class="dialog__close" aria-label="Закрити" @click="emit('close')">
          <AppIcon name="close" />
        </button>
      </header>

      <p v-if="added > 0" class="dialog__done">
        Уже додано: {{ added }}. Вікно лишається відкритим — заводьте наступну позицію.
      </p>

      <label class="field">
        <span class="field__label">Матеріал</span>
        <input
          ref="name"
          v-model="material.name"
          class="ctl"
          :class="{ 'ctl--bad': errors.name }"
          type="text"
          placeholder="Цегла керамічна М150"
        />
        <span v-if="errors.name" class="field__bad">{{ errors.name }}</span>
      </label>

      <div class="grid">
        <label class="field">
          <span class="field__label">Кількість</span>
          <input
            v-model="material.quantity"
            class="ctl ctl--num"
            :class="{ 'ctl--bad': errors.quantity }"
            type="text"
            inputmode="decimal"
            placeholder="0"
          />
          <span v-if="errors.quantity" class="field__bad">{{ errors.quantity }}</span>
        </label>

        <label class="field">
          <span class="field__label">Од. вим.</span>
          <select v-model="material.unit" class="ctl ctl--select">
            <option v-for="unit in MATERIAL_UNITS" :key="unit" :value="unit">{{ unit }}</option>
          </select>
        </label>

        <!-- Хто платить — головний перемикач форми: від нього залежить, чи є
             в позиції гроші взагалі. -->
        <label class="field">
          <span class="field__label">Купує</span>
          <select v-model="material.buyer" class="ctl ctl--select">
            <option v-for="(label, value) in MATERIAL_BUYER_LABELS" :key="value" :value="value">
              {{ label }}
            </option>
          </select>
        </label>

        <label class="field">
          <span class="field__label">Стадія</span>
          <select v-model="material.status" class="ctl ctl--select">
            <option v-for="status in MATERIAL_STATUSES" :key="status.value" :value="status.value">
              {{ status.label }}
            </option>
          </select>
        </label>
      </div>

      <Transition name="fold">
        <div v-if="own" class="money">
          <div class="grid grid--two">
            <label class="field">
              <span class="field__label">Ціна закупівлі, за од.</span>
              <input
                v-model="material.costPrice"
                class="ctl ctl--num"
                :class="{ 'ctl--bad': errors.costPrice }"
                type="text"
                inputmode="decimal"
                placeholder="0"
              />
              <span v-if="errors.costPrice" class="field__bad">{{ errors.costPrice }}</span>
            </label>

            <label class="field">
              <span class="field__label">Ціна замовнику, за од.</span>
              <input
                v-model="material.clientPrice"
                class="ctl ctl--num"
                :class="{ 'ctl--bad': errors.clientPrice }"
                type="text"
                inputmode="decimal"
                placeholder="0"
              />
              <span v-if="errors.clientPrice" class="field__bad">{{ errors.clientPrice }}</span>
            </label>
          </div>

          <!-- Підсумок позиції: скільки віддамо ми і скільки виставимо клієнту.
               Саме ці дві суми людина й перевіряє перед «Додати». -->
          <div class="sums">
            <div class="sum">
              <span class="sum__label">Наша сума</span>
              <p class="sum__val">{{ money(cost) }}</p>
            </div>

            <div class="sum">
              <span class="sum__label">Сума клієнту</span>
              <p class="sum__val sum__val--lead">{{ money(revenue) }}</p>
            </div>

            <div class="sum sum--profit">
              <span class="sum__label">Профіт</span>
              <p
                class="sum__val"
                :class="{
                  'sum__val--up': profit !== null && profit > 0,
                  'sum__val--down': profit !== null && profit < 0,
                }"
              >
                <template v-if="profit === null || profit === 0">{{ money(profit) }}</template>
                <template v-else>
                  {{ profit > 0 ? '+' : '−' }}{{ formatAmount(Math.abs(profit)) }} ₴
                </template>
              </p>
            </div>

            <p class="sums__hint">{{ totalsHint }}</p>
          </div>

          <label class="ok">
            <input v-model="material.approved" type="checkbox" class="ok__input" />
            <span class="ok__box" aria-hidden="true"><AppIcon name="check" /></span>
            <span class="ok__text">Погоджено замовником</span>
          </label>
        </div>
      </Transition>

      <!-- Позиція замовника: цін немає за визначенням, тож на місці блоку з
           грошима лишається пояснення, а не порожнеча. -->
      <p v-if="!own" class="note">
        Купує замовник — ці гроші повз нас, тож ані цін, ані сум у позиції немає.
      </p>

      <footer class="dialog__foot">
        <button type="submit" class="btn btn--primary btn--sm">Додати</button>
        <button type="button" class="btn btn--ghost btn--sm" @click="submit(true)">
          Додати й ще одну
        </button>

        <span class="dialog__hint">Enter — додати, Esc — закрити</span>
      </footer>
    </form>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 20px;
  overflow-y: auto;
  background: rgb(9 13 10 / 46%);
  backdrop-filter: blur(6px);
}

.dialog {
  display: grid;
  gap: 16px;
  /* Ширше за звичайний діалог: у рядку стоїть чотири поля, а під цінами —
     підсумок позиції, і тісно їм тут ні до чого. */
  width: min(720px, 100%);
  padding: 28px 30px;
  border-radius: var(--r-xl);
  background: var(--paper-raised);
  box-shadow: var(--shadow-lg);
}

.dialog__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.dialog__title {
  font-size: 20px;
}

.dialog__close {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--ink-faint);
  transition:
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.dialog__close:hover {
  background: var(--paper-sunk);
  color: var(--ink);
}

.dialog__close :deep(.icon) {
  width: 16px;
  height: 16px;
}

.dialog__done {
  padding: 10px 14px;
  border-radius: var(--r-sm);
  background: var(--brand-tint);
  font-size: 12.5px;
  color: var(--brand-strong);
}

/* ── Поля ──────────────────────────────────────────────────────── */

.grid {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 1.4fr);
  gap: 14px;
}

.grid--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.field {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.field__label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.field__bad {
  font-size: 11.5px;
  color: var(--danger);
}

.money {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-sunk);
}

/* ── Підсумок позиції ──────────────────────────────────────────── */

.sums {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px 16px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.sum {
  display: grid;
  gap: 5px;
  min-width: 0;
}

/* Профіт — підсумок підсумків, тож стоїть окремо, з правого краю. */
.sum--profit {
  justify-items: end;
  text-align: right;
}

.sum__label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.sum__val {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.015em;
  white-space: nowrap;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

/* Сума клієнту — те, про що домовляються; вона й головна на цьому екрані. */
.sum__val--lead {
  font-size: 19px;
  color: var(--ink);
}

.sum__val--up {
  color: var(--brand-strong);
}

.sum__val--down {
  color: var(--danger);
}

.sums__hint {
  grid-column: 1 / -1;
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--ink-faint);
}

.note {
  padding: 14px 16px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-md);
  font-size: 12.5px;
  color: var(--ink-muted);
}

/* ── Погодження ────────────────────────────────────────────────── */

.ok {
  display: inline-grid;
  grid-auto-flow: column;
  justify-content: start;
  align-items: center;
  gap: 10px;
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
  width: 21px;
  height: 21px;
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

.ok__text {
  font-size: 13px;
  color: var(--ink-muted);
}

/* ── Низ ───────────────────────────────────────────────────────── */

.dialog__foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 6px;
}

.dialog__hint {
  margin-left: auto;
  font-size: 11.5px;
  color: var(--ink-faint);
}

.fold-enter-active,
.fold-leave-active {
  transition:
    opacity 0.2s var(--ease),
    transform 0.2s var(--ease);
}

.fold-enter-from,
.fold-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (width <= 560px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  /* Три суми в рядок на телефоні не поміщаються — профіт іде окремим рядком. */
  .sums {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px 16px;
  }

  .sum--profit {
    grid-column: 1 / -1;
    justify-items: start;
    text-align: left;
  }

  .dialog__hint {
    width: 100%;
    margin-left: 0;
  }
}
</style>
