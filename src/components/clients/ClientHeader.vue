<script setup lang="ts">
import { computed, nextTick, reactive, ref, useTemplateRef } from 'vue'
import { RouterLink } from 'vue-router'
import ClientContacts from '@/components/clients/ClientContacts.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import TextField from '@/components/ui/TextField.vue'
import { formatAmount } from '@/lib/amount'
import {
  CLIENT_TYPE_LABELS,
  clientForm,
  formatObjects,
  hasClientErrors,
  isRegularClient,
  parseClientDiscount,
  REGULAR_LABEL,
  validateClientDiscount,
  validateClientForm,
  type ClientErrors,
  type ClientForm,
  type ClientTotals,
} from '@/lib/clients'
import { dueState, DUE_STATE_LABELS } from '@/lib/finance'
import type { Client, ClientType } from '@/lib/objects'
import { monogram } from '@/lib/workspaces'

/**
 * Шапка замовника — одна карта, а не купка плиток: хто це, як із ним
 * звʼязатись і на яких умовах працюємо. Знижка живе тут же, поруч з іменем:
 * це властивість людини, а не показник, тож серед цифр їй не місце.
 *
 * Під картою — три цифри, по які сюди й заходять: скільки в людини обʼєктів,
 * скільки з них живі та скільки грошей вона винна разом. Вони стоять однією
 * смугою з волосяними лініями між колонками: це зведення, а не три окремі
 * карточки, які змагаються за увагу.
 */

const props = defineProps<{ client: Client; totals: ClientTotals }>()

const emit = defineEmits<{ save: [form: ClientForm]; discount: [percent: number] }>()

const discountInput = useTemplateRef<HTMLInputElement>('discountInput')

const editing = ref(false)
const form = reactive<ClientForm>(clientForm(props.client))
const errors = ref<ClientErrors>({})

const discounting = ref(false)
const discount = ref('')
const discountError = ref<string | undefined>()

const regular = computed(() => isRegularClient(props.totals.objects))

const isCompany = computed(() => props.client.type.value === 'company')
const editingCompany = computed(() => form.type === 'company')

function chooseType(type: ClientType): void {
  form.type = type
}

/** Переплату показуємо як переплату — сума з мінусом ні про що не каже. */
const overpaid = computed(() => props.totals.due < 0)
const state = computed(() => dueState(props.totals.client, props.totals.paid))
const paidPercent = computed(() => Math.round(props.totals.progress * 100))

function startEdit(): void {
  Object.assign(form, clientForm(props.client))
  errors.value = {}
  editing.value = true
}

function save(): void {
  errors.value = validateClientForm(form)

  if (hasClientErrors(errors.value)) {
    return
  }

  emit('save', { ...form })
  editing.value = false
}

async function startDiscount(): Promise<void> {
  discount.value = String(props.client.discount)
  discountError.value = undefined
  discounting.value = true

  await nextTick()
  discountInput.value?.select()
}

function saveDiscount(): void {
  discountError.value = validateClientDiscount(discount.value)

  const percent = parseClientDiscount(discount.value)

  if (discountError.value !== undefined || percent === null) {
    return
  }

  emit('discount', percent)
  discounting.value = false
}
</script>

<template>
  <header class="chead">
    <p class="eyebrow chead__crumbs">
      <RouterLink class="chead__crumb" :to="{ name: 'clients' }">Замовники</RouterLink>
      <span aria-hidden="true">/</span>
      Картка
    </p>

    <!-- Одна карта: імʼя, умови й контакти читаються як одне ціле. -->
    <section class="hero">
      <div class="hero__top">
        <span class="mono" aria-hidden="true">{{ monogram(client.name) }}</span>

        <div class="hero__intro">
          <h1 class="display hero__title">
            {{ client.name }}

            <!-- Другий обʼєкт — уже не випадковість: мітка зʼявляється сама. -->
            <span
              v-if="regular"
              class="regular"
              :title="`${formatObjects(totals.objects)} за весь час`"
            >
              <AppIcon name="spark" />
              {{ REGULAR_LABEL }}
            </span>
          </h1>

          <p class="hero__contact">
            <AppIcon :name="isCompany ? 'building' : 'user'" />
            <template v-if="isCompany">
              {{ client.contact || 'контактну особу не вказано' }}
            </template>
            <template v-else>{{ CLIENT_TYPE_LABELS[client.type.value] }}</template>
          </p>
        </div>

        <div class="hero__tools">
          <!-- Знижка — умова роботи з людиною, тож правиться просто тут. -->
          <div v-if="discounting" class="disc">
            <input
              ref="discountInput"
              v-model="discount"
              class="ctl disc__input"
              :class="{ 'ctl--bad': discountError }"
              type="text"
              inputmode="decimal"
              aria-label="Персональна знижка, %"
              :aria-invalid="discountError ? true : undefined"
              :title="discountError"
              @keydown.enter.prevent="saveDiscount"
              @keydown.esc="discounting = false"
            />
            <span class="disc__unit">%</span>

            <button
              type="button"
              class="disc__ok"
              aria-label="Зберегти знижку"
              @click="saveDiscount"
            >
              <AppIcon name="check" />
            </button>
            <button
              type="button"
              class="disc__no"
              aria-label="Скасувати"
              @click="discounting = false"
            >
              <AppIcon name="close" />
            </button>
          </div>

          <button
            v-else
            type="button"
            class="rate"
            :class="{ 'rate--off': client.discount === 0 }"
            :title="
              client.discount === 0
                ? 'Персональної знижки немає'
                : 'Знижка підставляється в нові обʼєкти замовника'
            "
            @click="startDiscount"
          >
            <span class="rate__cap">Знижка</span>
            <span class="rate__value">
              <template v-if="client.discount > 0">−{{ client.discount }}%</template>
              <template v-else>немає</template>
            </span>
            <AppIcon name="edit" />
          </button>

          <button v-if="!editing" type="button" class="tool" @click="startEdit">
            <AppIcon name="edit" />
            <span>Редагувати</span>
          </button>
        </div>
      </div>

      <!-- Контакти: у спокої це смуга звʼязку, у правці — форма на її місці. -->
      <div v-if="editing" class="edit">
        <div class="edit__types" role="radiogroup" aria-label="Хто замовник">
          <button
            v-for="type in ['person', 'company'] as ClientType[]"
            :key="type"
            type="button"
            class="edit__type"
            :class="{ 'edit__type--on': form.type === type }"
            role="radio"
            :aria-checked="form.type === type"
            @click="chooseType(type)"
          >
            <AppIcon :name="type === 'company' ? 'building' : 'user'" />
            {{ CLIENT_TYPE_LABELS[type] }}
          </button>
        </div>

        <div class="edit__grid">
          <TextField
            v-model="form.name"
            :label="editingCompany ? 'Назва компанії' : 'Імʼя та прізвище'"
            :error="errors.name"
          />
          <TextField
            v-if="editingCompany"
            v-model="form.contact"
            label="Контактна особа"
            optional
            placeholder="З ким саме розмовляємо"
            :error="errors.contact"
          />
          <TextField
            v-model="form.phone"
            label="Телефон"
            optional
            inputmode="tel"
            autocomplete="tel"
            placeholder="+380 67 000 00 00"
            :error="errors.phone"
          >
            <template #prefix><AppIcon name="phone" /></template>
          </TextField>
          <TextField
            v-model="form.email"
            label="Пошта"
            optional
            type="email"
            inputmode="email"
            placeholder="office@company.ua"
            :error="errors.email"
          >
            <template #prefix><AppIcon name="mail" /></template>
          </TextField>
        </div>

        <div class="edit__actions">
          <button type="button" class="btn btn--primary btn--sm" @click="save">Зберегти</button>
          <button type="button" class="btn btn--ghost btn--sm" @click="editing = false">
            Скасувати
          </button>
        </div>
      </div>

      <ClientContacts v-else :client="client" @fill="startEdit" />
    </section>

    <div class="figs">
      <section class="fig">
        <h2 class="fig__label">Обʼєктів усього</h2>
        <p class="fig__value">{{ totals.objects }}</p>

        <p class="fig__foot">
          <template v-if="totals.archived > 0">
            {{ totals.done }} завершено · {{ totals.archived }} в архіві
          </template>
          <template v-else-if="totals.done > 0">з них {{ totals.done }} завершено</template>
          <template v-else-if="totals.objects > 0">перший обʼєкт замовника</template>
          <template v-else>обʼєктів ще немає</template>
        </p>
      </section>

      <section class="fig">
        <h2 class="fig__label">Активних зараз</h2>
        <p class="fig__value">{{ totals.active }}</p>

        <p class="fig__foot">заплановані й ті, що в роботі</p>
      </section>

      <section class="fig fig--money" :class="`fig--${state}`">
        <h2 class="fig__label">{{ overpaid ? 'Переплата' : 'Залишок до сплати' }}</h2>
        <p class="fig__value">
          {{ formatAmount(Math.abs(totals.due)) }} <span class="cur">₴</span>
        </p>

        <span class="track">
          <span class="track__fill" :style="{ width: `${paidPercent}%` }" />
        </span>

        <p class="fig__foot fig__foot--state">
          {{ DUE_STATE_LABELS[state] }} · оплачено {{ paidPercent }}%
        </p>
      </section>
    </div>
  </header>
</template>

<style scoped>
.chead {
  display: grid;
  gap: 12px;
}

.chead__crumbs {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 2px;
}

.chead__crumb {
  color: inherit;
  text-decoration: none;
  transition: color 0.16s var(--ease);
}

.chead__crumb:hover {
  color: var(--ink);
}

/* ── Карта замовника ───────────────────────────────────────────── */

/*
 * Рівне світле полотно без підсвіток: карту замовника виділяє її зміст і
 * розмір, а не кольоровий відсвіт у куті. Кольору на екрані рівно стільки,
 * скільки в ньому значення — решта тримається на лініях і типографіці.
 */
.hero {
  display: grid;
  gap: 16px;
  padding: 20px 20px 14px;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

.hero__top {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--line);
}

/*
 * Смуга контактів має власні внутрішні відступи — витягуємо її на них, щоб
 * значки стали рівно під аватаром, а не з відступом у відступі.
 */
.hero .strip {
  margin: 0 -14px;
}

/* Монограма графітова: імʼя людини — не акцентна дія, підсвічувати його
   брендовим зеленим немає за що. */
.mono {
  display: grid;
  place-items: center;
  flex: none;
  width: 56px;
  height: 56px;
  border-radius: var(--r-md);
  background: var(--ink);
  color: #fff;
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.hero__intro {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.hero__title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: clamp(22px, 2.6vw, 30px);
}

/* Мітка постійного — факт, а не нагорода: тихий контур і лише значок
   тримає брендовий колір. */
.regular {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 11px 4px 9px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  color: var(--ink-muted);
  font-family: var(--font-body);
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.regular :deep(.icon) {
  width: 13px;
  height: 13px;
  color: var(--brand-strong);
}

.edit__types {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
}

.edit__type {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-muted);
  transition:
    border-color 0.18s var(--ease),
    background-color 0.18s var(--ease),
    color 0.18s var(--ease);
}

.edit__type :deep(.icon) {
  width: 15px;
  height: 15px;
}

.edit__type--on {
  border-color: var(--brand);
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.hero__contact {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13.5px;
  color: var(--ink-muted);
}

.hero__contact :deep(.icon) {
  flex: none;
  width: 15px;
  height: 15px;
  color: var(--ink-faint);
}

.hero__tools {
  display: flex;
  align-items: center;
  flex: none;
  gap: 8px;
  margin-left: auto;
}

.tool {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 15px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: var(--paper-raised);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease);
}

.tool:hover {
  border-color: var(--ink);
  background: var(--paper-sunk);
}

.tool :deep(.icon) {
  width: 15px;
  height: 15px;
  color: var(--ink-faint);
}

/* ── Знижка ────────────────────────────────────────────────────── */

/* Знижка підписана словом, а не лише цифрою: так її не читають як ще один
   показник у ряду. Кнопка тримається того ж контуру, що й «Редагувати». */
.rate {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 13px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: var(--paper-raised);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease);
}

.rate:hover {
  border-color: var(--ink);
  background: var(--paper-sunk);
}

.rate__cap {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.rate :deep(.icon) {
  width: 14px;
  height: 14px;
  color: var(--ink-faint);
}

/* Знижки немає — кнопка не має вдавати умову, якої не існує. */
.rate--off .rate__value {
  font-weight: 500;
  color: var(--ink-faint);
}

.disc {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 38px;
  padding: 0 6px 0 10px;
  border: 1px solid var(--brand);
  border-radius: 999px;
  background: var(--paper-raised);
  box-shadow: 0 0 0 3px var(--brand-glow);
}

.disc__input {
  width: 62px;
  height: 28px;
  padding: 0 4px;
  border: 0;
  background: transparent;
  text-align: right;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.disc__input:focus {
  box-shadow: none;
}

.disc__unit {
  margin-right: 2px;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-faint);
}

.disc__ok,
.disc__no {
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ink-faint);
  transition:
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.disc__ok:hover {
  background: var(--brand);
  color: #08210a;
}

.disc__no:hover {
  background: var(--paper-sunk);
  color: var(--ink);
}

.disc__ok :deep(.icon),
.disc__no :deep(.icon) {
  width: 15px;
  height: 15px;
}

/* ── Правка контактів ──────────────────────────────────────────── */

.edit {
  display: grid;
  gap: 16px;
  padding-bottom: 6px;
}

.edit__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px 20px;
}

.edit__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

/* ── Три цифри ─────────────────────────────────────────────────── */

/*
 * Одна смуга, поділена волосяними лініями: gap в один піксель на кольорі
 * лінії лишається рівним і тоді, коли колонки переносяться на другий рядок.
 */
.figs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1px;
  overflow: hidden;
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

/* Залишок — світлофор: колір ставиться раз і йде в смугу та підпис. */
.fig--money {
  --tone: var(--ink-muted);
  --tone-soft: var(--paper-sunk);
}

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

.fig__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ink-faint);
}

/* Цифра тим самим шрифтом, що й на дашборді: це показник, а не підпис. */
.fig__value {
  font-family: var(--font-display);
  font-size: clamp(21px, 2vw, 26px);
  font-weight: 600;
  letter-spacing: -0.04em;
  line-height: 1.15;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.cur {
  margin-left: 2px;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-faint);
}

.fig__foot {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.fig__foot--state {
  margin-top: 2px;
  font-weight: 600;
  color: var(--tone);
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

@media (width <= 620px) {
  .hero__top {
    flex-wrap: wrap;
  }

  .hero__tools {
    width: 100%;
    margin-left: 0;
  }

  .tool {
    flex: 1;
    justify-content: center;
  }
}
</style>
