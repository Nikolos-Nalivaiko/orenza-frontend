<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, useTemplateRef } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount, parseAmount } from '@/lib/amount'
import { PAYMENT_DESCRIPTION_MAX, type PaymentPayload, type PaymentStatus } from '@/lib/finance'
import { formatDay } from '@/lib/objects'

/**
 * Платіж заводять на ходу, тож форма — два поля: сума й дата. Статус вирішує,
 * що це: гроші, які вже прийшли, чи ті, яких чекаємо. Другого вікна під
 * «графік надходжень» немає навмисно — це той самий список.
 *
 * Сума з датою зібрані в одну плашку разом із підсумком: людина заводить
 * платіж, щоб побачити, що лишиться після нього, — тож відповідь стоїть
 * поруч із полем, а не десь під кнопками.
 */

const props = defineProps<{
  today: string
  /** Скільки ще винен замовник — підказка для найчастішої суми. */
  due: number
}>()

const emit = defineEmits<{ add: [payload: PaymentPayload]; close: [] }>()

const titleId = useId()

const field = useTemplateRef<HTMLInputElement>('field')

const amount = ref('')
const date = ref(props.today)
const status = ref<PaymentStatus>('paid')
const note = ref('')
/** Коментар за замовчуванням внутрішній: назовні він іде лише з дозволу. */
const shared = ref(false)

const problem = ref<{ amount?: string; date?: string }>({})

const parsed = computed(() => parseAmount(amount.value))

const received = computed(() => status.value === 'paid')

/** Найчастіша сума — рівно залишок: закриваємо обʼєкт одним платежем. */
const suggestion = computed(() => (props.due > 0 ? props.due : null))

const filled = computed(() => (parsed.value !== null && parsed.value > 0 ? parsed.value : null))

/** Що станеться з боргом після цього платежу — головне, заради чого його й вносять. */
const left = computed(() => (filled.value === null ? null : props.due - filled.value))

function fillAll(): void {
  if (suggestion.value !== null) {
    amount.value = String(suggestion.value)
    problem.value = { ...problem.value, amount: undefined }
  }
}

function submit(): void {
  const found: { amount?: string; date?: string } = {}
  const value = parsed.value

  if (amount.value.trim() === '') {
    found.amount = 'Вкажіть суму'
  } else if (value === null) {
    found.amount = 'Тільки число'
  } else if (value <= 0) {
    found.amount = 'Більше нуля'
  }

  // Дата потрібна там, де гроші вже рухались: без неї платіж не лягає в
  // жоден період і не зводиться з випискою.
  if (received.value && date.value === '') {
    found.date = 'Отримано — вкажіть, коли'
  }

  problem.value = found

  if (Object.keys(found).length > 0) {
    return
  }

  const comment = note.value.trim()

  emit('add', {
    // Назва платежу — той самий коментар; порожній замінюємо на зрозумілий
    // підпис, бо в стрічці подій рядок без назви ні про що не каже.
    name:
      comment === '' ? (received.value ? 'Платіж від замовника' : 'Очікуваний платіж') : comment,
    amount: value ?? 0,
    status: status.value,
    ...(date.value === '' ? {} : { paid_at: date.value }),
    client_visible: comment !== '' && shared.value,
  })

  emit('close')
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
  field.value?.focus()
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
      @submit.prevent="submit"
    >
      <header class="head">
        <div class="head__intro">
          <h2 :id="titleId" class="display head__title">Новий платіж</h2>

          <p class="head__sub">
            <template v-if="due > 0">
              Залишок до сплати — <strong>{{ formatAmount(due) }} ₴</strong>
            </template>
            <template v-else>За обʼєктом усе оплачено</template>
          </p>
        </div>

        <button type="button" class="head__close" aria-label="Закрити" @click="emit('close')">
          <AppIcon name="close" />
        </button>
      </header>

      <!-- Статус — головний перемикач форми: від нього залежить, чи це вже
           гроші, чи поки лише обіцянка. -->
      <div class="kind" role="group" aria-label="Статус платежу">
        <button
          type="button"
          class="kind__btn"
          :class="{ 'kind__btn--on': received }"
          :aria-pressed="received"
          @click="status = 'paid'"
        >
          <AppIcon name="check" />
          Отримано
        </button>

        <button
          type="button"
          class="kind__btn"
          :class="{ 'kind__btn--on': !received }"
          :aria-pressed="!received"
          @click="status = 'pending'"
        >
          <AppIcon name="clock" />
          Очікується
        </button>
      </div>

      <div class="money">
        <div class="money__grid">
          <div class="field field--sum">
            <label class="field__label" for="pay-amount">Сума</label>

            <div class="input">
              <span class="input__cur" aria-hidden="true">₴</span>
              <input
                id="pay-amount"
                ref="field"
                v-model="amount"
                class="ctl ctl--num input__ctl"
                :class="{ 'ctl--bad': problem.amount }"
                type="text"
                inputmode="decimal"
                placeholder="0"
                @input="problem.amount = undefined"
              />
            </div>
          </div>

          <div class="field">
            <label class="field__label" for="pay-date">
              {{ received ? 'Дата надходження' : 'Коли чекаємо' }}
            </label>

            <input
              id="pay-date"
              v-model="date"
              class="ctl input__ctl"
              :class="{ 'ctl--bad': problem.date }"
              type="date"
              @input="problem.date = undefined"
            />
          </div>
        </div>

        <!-- Один рядок під полями: або помилка, або підказка, або підсумок.
             Місце під нього тримаємо завжди — інакше вікно стрибає. -->
        <div class="under">
          <p v-if="problem.amount || problem.date" class="under__bad">
            {{ problem.amount ?? problem.date }}
          </p>

          <template v-else-if="left !== null">
            <p class="under__text">
              <template v-if="left > 0.01">
                {{ received ? 'Після платежу лишиться' : 'Після надходження лишиться' }}
                <strong>{{ formatAmount(left) }} ₴</strong>
              </template>
              <template v-else-if="left < -0.01">
                Переплата <strong class="is-up">{{ formatAmount(-left) }} ₴</strong>
              </template>
              <template v-else>
                <strong class="is-up">Обʼєкт буде оплачено повністю</strong>
              </template>
            </p>

            <p v-if="!received && date" class="under__when">чекаємо {{ formatDay(date) }}</p>
          </template>

          <button
            v-else-if="suggestion !== null"
            type="button"
            class="under__fill"
            @click="fillAll"
          >
            Підставити весь залишок — {{ formatAmount(suggestion) }} ₴
          </button>

          <p v-else class="under__text">Скільки грошей рухається цим платежем</p>
        </div>
      </div>

      <div class="field">
        <label class="field__label" for="pay-note">Коментар — необовʼязково</label>
        <input
          id="pay-note"
          v-model="note"
          class="ctl"
          type="text"
          :maxlength="PAYMENT_DESCRIPTION_MAX"
          placeholder="Аванс за перший етап"
        />

        <!-- Коментар пишуть для себе, тож назовні він не йде без дозволу:
             на публічній сторінці обʼєкта замовник побачить лише те, що
             тут відмітили. -->
        <label class="share" :class="{ 'share--off': note.trim() === '' }">
          <input
            v-model="shared"
            type="checkbox"
            class="share__input"
            :disabled="note.trim() === ''"
          />
          <span class="share__box" aria-hidden="true"><AppIcon name="check" /></span>
          <span class="share__text">Показати цей коментар замовнику</span>
        </label>
      </div>

      <footer class="foot">
        <button type="submit" class="btn btn--primary btn--sm">
          {{ received ? 'Додати платіж' : 'Запланувати' }}
        </button>
        <button type="button" class="btn btn--ghost btn--sm" @click="emit('close')">
          Скасувати
        </button>

        <span class="foot__hint">Enter — додати, Esc — закрити</span>
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

/* Кроки вікна однакові: шапка → статус → гроші → коментар → кнопки. */
.dialog {
  display: grid;
  gap: 20px;
  width: min(520px, 100%);
  padding: 26px 28px 24px;
  border-radius: var(--r-xl);
  background: var(--paper-raised);
  box-shadow: var(--shadow-lg);
}

/* ── Шапка ─────────────────────────────────────────────────────── */

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.head__intro {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.head__title {
  font-size: 20px;
}

.head__sub {
  font-size: 12.5px;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

.head__sub strong {
  color: var(--ink);
}

.head__close {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  margin: -4px -6px 0 0;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--ink-faint);
  transition:
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.head__close:hover {
  background: var(--paper-sunk);
  color: var(--ink);
}

.head__close :deep(.icon) {
  width: 16px;
  height: 16px;
}

/* ── Статус ────────────────────────────────────────────────────── */

.kind {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: var(--paper-sunk);
}

.kind__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 14px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-muted);
  transition:
    background-color 0.16s var(--ease),
    color 0.16s var(--ease),
    box-shadow 0.16s var(--ease);
}

.kind__btn:hover {
  color: var(--ink);
}

.kind__btn--on {
  background: var(--paper-raised);
  color: var(--ink);
  box-shadow: var(--shadow-sm);
}

.kind__btn :deep(.icon) {
  width: 15px;
  height: 15px;
}

/* ── Гроші ─────────────────────────────────────────────────────── */

/* Сума, дата й підсумок — одна плашка: це одна думка, а не три поля поспіль. */
.money {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-sunk);
}

.money__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
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

.input {
  position: relative;
  display: flex;
  min-width: 0;
}

/* Гривня стоїть у полі зліва: число лишається праворуч, як у всіх сумах. */
.input__cur {
  position: absolute;
  top: 50%;
  left: 12px;
  transform: translateY(-50%);
  font-size: 14px;
  font-weight: 500;
  color: var(--ink-faint);
  pointer-events: none;
}

.input__ctl {
  height: 48px;
  font-size: 16px;
  font-weight: 600;
}

.input .input__ctl {
  padding-left: 30px;
}

/* ── Рядок під полями ──────────────────────────────────────────── */

.under {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 10px;
  min-height: 18px;
  padding-top: 12px;
  border-top: 1px dashed var(--line-strong);
  font-variant-numeric: tabular-nums;
}

.under__text,
.under__when {
  font-size: 12.5px;
  color: var(--ink-muted);
}

.under__when {
  color: var(--ink-faint);
}

.under__text strong {
  font-weight: 600;
  color: var(--ink);
}

.under__bad {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--danger);
}

.is-up {
  color: var(--brand-strong) !important;
}

/* Найчастіша сума — рівно залишок: не змушуємо його передруковувати. */
.under__fill {
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-muted);
  text-align: left;
  text-decoration: underline;
  text-underline-offset: 3px;
  font-variant-numeric: tabular-nums;
  transition: color 0.16s var(--ease);
}

.under__fill:hover {
  color: var(--brand-strong);
}

/* ── Показати замовнику ────────────────────────────────────────── */

.share {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  margin-top: 3px;
  cursor: pointer;
}

.share--off {
  cursor: default;
  opacity: 0.55;
}

.share__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.share__box {
  display: grid;
  place-items: center;
  flex: none;
  width: 19px;
  height: 19px;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  background: var(--paper-raised);
  color: transparent;
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.share__box :deep(.icon) {
  width: 11px;
  height: 11px;
}

.share__input:checked + .share__box {
  border-color: var(--brand);
  background: var(--brand);
  color: #08210a;
}

.share__input:focus-visible + .share__box {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

.share__text {
  font-size: 12px;
  color: var(--ink-muted);
}

/* ── Низ ───────────────────────────────────────────────────────── */

.foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 18px;
  border-top: 1px solid var(--line);
}

.foot__hint {
  margin-left: auto;
  font-size: 11.5px;
  color: var(--ink-faint);
}

@media (width <= 520px) {
  .dialog {
    gap: 18px;
    padding: 22px 20px 20px;
  }

  .money__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .foot__hint {
    width: 100%;
    margin-left: 0;
  }
}
</style>
