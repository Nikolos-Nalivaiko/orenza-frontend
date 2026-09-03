<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, useTemplateRef } from 'vue'
import ServiceWorkersEditor from '@/components/objects/ServiceWorkersEditor.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount, parseAmount } from '@/lib/amount'
import type { Employee } from '@/lib/employees'
import {
  buildServicePayload,
  emptyService,
  serviceCost,
  serviceProfit,
  serviceRevenue,
  serviceVolume,
  validateService,
  SERVICE_STATUSES,
  SERVICE_UNITS,
  type ServicePayload,
} from '@/lib/services'

/**
 * Швидке додавання роботи. Базові поля стоять одразу, а виконавці ховаються
 * під розворот: у момент планування їх ще не знають, і чотири порожні поля
 * лише заважали б.
 *
 * «Додати й ще одну» лишає вікно відкритим — так заводять кошторис підряд.
 */

defineProps<{
  employees: Employee[]
  employeesLoading: boolean
  /** Приватний простір: виконавців немає, тож і блоку теж. */
  solo: boolean
}>()

const emit = defineEmits<{ add: [payload: ServicePayload]; close: [] }>()

const titleId = useId()

const name = useTemplateRef<HTMLInputElement>('name')

const service = ref(emptyService())
/** Помилки показуємо лише після спроби зберегти — не поки людина ще друкує. */
const tried = ref(false)
/** Скільки робіт уже завели цим вікном: підпис, що робота йде. */
const added = ref(0)
const crewOpen = ref(false)

const errors = computed(() => (tried.value ? validateService(service.value) : {}))

const volume = computed(() => serviceVolume(service.value))
const revenue = computed(() => serviceRevenue(service.value))
const cost = computed(() => serviceCost(service.value))
const profit = computed(() => serviceProfit(service.value))

const hasMoney = computed(() => parseAmount(service.value.price) !== null && volume.value.value > 0)

function submit(again: boolean): void {
  tried.value = true

  const found = validateService(service.value)

  if (Object.keys(found).length > 0) {
    // Помилка може ховатись у згорнутому блоці — розгортаємо, щоб її видно.
    if (found.workers !== undefined) {
      crewOpen.value = true
    }

    return
  }

  emit('add', buildServicePayload(service.value))

  if (!again) {
    emit('close')

    return
  }

  added.value += 1

  // Одиницю, ціну й стадію лишаємо: наступна робота того ж кошторису майже
  // завжди така сама, а перезаповнювати їх щоразу — марна робота.
  service.value = {
    ...emptyService(),
    unit: service.value.unit,
    price: service.value.price,
    status: service.value.status,
  }

  tried.value = false
  crewOpen.value = false

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
        <h2 :id="titleId" class="display dialog__title">Нова робота</h2>

        <button type="button" class="dialog__close" aria-label="Закрити" @click="emit('close')">
          <AppIcon name="close" />
        </button>
      </header>

      <p v-if="added > 0" class="dialog__done">
        Уже додано: {{ added }}. Вікно лишається відкритим — заводьте наступну роботу.
      </p>

      <label class="field">
        <span class="field__label">Робота</span>
        <input
          ref="name"
          v-model="service.name"
          class="ctl"
          :class="{ 'ctl--bad': errors.name }"
          type="text"
          placeholder="Штукатурка стін по маяках"
        />
        <span v-if="errors.name" class="field__bad">{{ errors.name }}</span>
      </label>

      <div class="grid">
        <label class="field">
          <span class="field__label">Обсяг, план</span>
          <input
            v-model="service.planVolume"
            class="ctl ctl--num"
            :class="{ 'ctl--bad': errors.planVolume }"
            type="text"
            inputmode="decimal"
            placeholder="0"
          />
          <span v-if="errors.planVolume" class="field__bad">{{ errors.planVolume }}</span>
        </label>

        <label class="field">
          <span class="field__label">Од. вим.</span>
          <select v-model="service.unit" class="ctl ctl--select">
            <option v-for="unit in SERVICE_UNITS" :key="unit" :value="unit">{{ unit }}</option>
          </select>
        </label>

        <label class="field">
          <span class="field__label">Ціна за од., ₴</span>
          <input
            v-model="service.price"
            class="ctl ctl--num"
            :class="{ 'ctl--bad': errors.price }"
            type="text"
            inputmode="decimal"
            placeholder="0"
          />
          <span v-if="errors.price" class="field__bad">{{ errors.price }}</span>
        </label>

        <label class="field">
          <span class="field__label">Стадія</span>
          <select v-model="service.status" class="ctl ctl--select">
            <option v-for="status in SERVICE_STATUSES" :key="status.value" :value="status.value">
              {{ status.label }}
            </option>
          </select>
        </label>
      </div>

      <label class="field">
        <span class="field__label">Опис — необовʼязково</span>
        <textarea
          v-model="service.description"
          class="ctl ctl--area"
          rows="2"
          placeholder="Що входить у роботу, вимоги, матеріал основи"
        />
      </label>

      <!-- Виконавці — окремий розворот: у момент планування їх ще не знають. -->
      <div v-if="!solo" class="crew">
        <button
          type="button"
          class="crew__toggle"
          :aria-expanded="crewOpen"
          @click="crewOpen = !crewOpen"
        >
          <span class="crew__icon" aria-hidden="true"><AppIcon name="team" /></span>

          <span class="crew__text">
            Виконавці
            <em>ЗП виконавцям — це собівартість роботи</em>
          </span>

          <span v-if="service.workers.length > 0" class="crew__count">
            {{ service.workers.length }}
          </span>

          <AppIcon name="chevron" class="crew__caret" :class="{ 'is-open': crewOpen }" />
        </button>

        <div v-if="crewOpen" class="crew__body">
          <ServiceWorkersEditor
            v-model="service.workers"
            :unit="service.unit"
            :volume="volume.value"
            :employees="employees"
            :loading="employeesLoading"
            :errors="errors.workers"
          />
        </div>
      </div>

      <!-- Підсумок роботи: скільки виставимо клієнту й скільки з цього наше. -->
      <dl class="sums">
        <div class="sum">
          <dt>Сума клієнту</dt>
          <dd class="sum__lead">{{ hasMoney ? `${formatAmount(revenue)} ₴` : '—' }}</dd>
        </div>

        <template v-if="!solo">
          <div class="sum">
            <dt>ЗП виконавцям</dt>
            <dd>{{ cost > 0 ? `${formatAmount(cost)} ₴` : '—' }}</dd>
          </div>

          <div class="sum sum--profit">
            <dt>Профіт</dt>
            <dd :class="{ 'is-up': profit > 0, 'is-down': profit < 0 }">
              {{ hasMoney || cost > 0 ? `${formatAmount(profit)} ₴` : '—' }}
            </dd>
          </div>
        </template>

        <p class="sums__hint">
          {{
            volume.value > 0
              ? `За ${formatAmount(volume.value)} ${service.unit} — ${volume.basis === 'fact' ? 'за фактом' : 'за планом'}`
              : 'Вкажіть обсяг і ціну — суми порахуються самі'
          }}
        </p>
      </dl>

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
  width: min(760px, 100%);
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
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1.2fr) minmax(0, 1.3fr);
  gap: 14px;
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

.ctl--area {
  height: auto;
  padding: 8px 10px;
  line-height: 1.5;
  resize: vertical;
}

/* ── Виконавці ─────────────────────────────────────────────────── */

.crew {
  display: grid;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-sunk);
}

.crew__toggle {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0;
  border: 0;
  background: transparent;
  text-align: left;
}

.crew__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: var(--paper-raised);
  color: var(--ink-muted);
}

.crew__icon :deep(.icon) {
  width: 16px;
  height: 16px;
}

.crew__text {
  display: grid;
  gap: 2px;
  min-width: 0;
  font-size: 13.5px;
  font-weight: 600;
}

.crew__text em {
  font-size: 11.5px;
  font-weight: 400;
  font-style: normal;
  color: var(--ink-faint);
}

.crew__count {
  min-width: 20px;
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--brand-tint);
  color: var(--brand-strong);
  font-size: 11.5px;
  font-weight: 600;
  text-align: center;
}

.crew__caret {
  width: 15px;
  height: 15px;
  margin-left: auto;
  color: var(--ink-faint);
  transition: transform 0.2s var(--ease);
}

.crew__caret.is-open {
  transform: rotate(180deg);
}

.crew__body {
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

/* ── Підсумок ──────────────────────────────────────────────────── */

.sums {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px 16px;
  margin: 0;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.sum {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.sum--profit {
  justify-items: end;
  text-align: right;
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
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.015em;
  color: var(--ink-muted);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* Сума клієнту — те, про що домовляються; вона й головна на цьому екрані. */
.sum__lead {
  font-size: 19px;
  color: var(--ink);
}

.is-up {
  color: var(--brand-strong);
}

.is-down {
  color: var(--danger);
}

.sums__hint {
  grid-column: 1 / -1;
  margin-top: 2px;
  font-size: 11.5px;
  color: var(--ink-faint);
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

@media (width <= 620px) {
  .grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

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
