<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ObjectActions from '@/components/objects/ObjectActions.vue'
import ObjectShare from '@/components/objects/ObjectShare.vue'
import ObjectStatusMenu from '@/components/objects/ObjectStatusMenu.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import { daysBetween, formatDay, type ConstructionObject, type ObjectStatus } from '@/lib/objects'
import { formatDeadline, servicesDone, type ObjectSummary } from '@/lib/objectList'
import { monogram } from '@/lib/workspaces'

/** Куди веде картка показника: до вкладки, де ця цифра й робиться. */
export type HeaderTab = 'overview' | 'services' | 'finance'

const props = defineProps<{ object: ConstructionObject; summary: ObjectSummary }>()

const emit = defineEmits<{
  status: [status: ObjectStatus]
  archive: []
  remove: []
  tab: [tab: HeaderTab]
}>()

const archived = computed(() => props.object.archived_at !== null)

/** Переплату показуємо як переплату — сума з мінусом нікому ні про що не каже. */
const overpaid = computed(() => props.summary.due < 0)

const works = computed(() => servicesDone(props.object))

const percent = computed(() =>
  props.summary.readiness === null ? null : Math.round(props.summary.readiness * 100),
)

const paidPercent = computed(() => Math.round(props.summary.progress * 100))

/**
 * Скільки строку вже минуло: дедлайн без цієї смуги — просто дата, а з нею
 * видно, чи встигаємо. Рахуємо від планового початку, а не від факту: план
 * і є те, з чим звіряються.
 */
const timePercent = computed(() => {
  const { started_at: start, finished_at: end } = props.object
  const left = props.summary.daysLeft

  if (start === null || end === null || left === null) {
    return null
  }

  const total = daysBetween(start, end)

  if (total === null || total <= 0) {
    return null
  }

  return Math.round(Math.min(1, Math.max(0, (total - left) / total)) * 100)
})

/** Дедлайн уже на носі — підпис стає жовтим, ще до прострочення. */
const soon = computed(() => {
  const left = props.summary.daysLeft

  return left !== null && left >= 0 && left <= 3
})

const copied = ref(false)

let copiedTimer: number | undefined

/** Номер із картки частіше не набирають, а переносять у месенджер. */
async function copyPhone(): Promise<void> {
  const phone = props.object.client?.phone

  if (!phone) {
    return
  }

  try {
    await navigator.clipboard.writeText(phone)
  } catch {
    return
  }

  copied.value = true
  window.clearTimeout(copiedTimer)
  copiedTimer = window.setTimeout(() => (copied.value = false), 1600)
}

onBeforeUnmount(() => window.clearTimeout(copiedTimer))
</script>

<template>
  <header class="ohead">
    <!-- Хлібні крихти йдуть окремим рядком: у колонці з назвою вони робили
         текст на рядок вищим за обкладинку, і адреса звисала збоку. -->
    <p class="eyebrow ohead__crumbs">
      <RouterLink class="ohead__crumb" :to="{ name: 'objects' }">Обʼєкти</RouterLink>
      <span aria-hidden="true">/</span>
      Картка
    </p>

    <div class="ohead__top">
      <!-- Обкладинка маленька: вона впізнає обʼєкт, а не прикрашає екран. -->
      <span class="cover">
        <img v-if="object.cover" class="cover__photo" :src="object.cover" alt="" />
        <span v-else class="cover__ghost" aria-hidden="true"><AppIcon name="building" /></span>
      </span>

      <div class="ohead__intro">
        <h1 class="display ohead__title">
          {{ object.name }}
          <span v-if="archived" class="ohead__archived">Архів</span>
        </h1>

        <p class="ohead__addr">
          <AppIcon name="pin" />
          <span>{{ object.address }}</span>
        </p>
      </div>

      <div class="ohead__tools">
        <ObjectShare :token="object.public_token" :name="object.name" />

        <ObjectStatusMenu
          :status="object.status.value"
          :label="object.status.label"
          @change="emit('status', $event)"
        />

        <ObjectActions
          :archived="archived"
          :removable="
            object.materials.length === 0 &&
            object.services.length === 0 &&
            object.payments.length === 0
          "
          @archive="emit('archive')"
          @remove="emit('remove')"
        />
      </div>
    </div>

    <!--
      Чотири блоки, за якими заходять на обʼєкт. Усі складені однаково —
      підпис, цифра, смуга, рядок пояснення, — і рядки вирівняні між картками
      через subgrid: інакше цифри стрибають одна відносно одної.

      Три з них ведуть у вкладку, де ця цифра й робиться, четвертий — замовник
      — тримає його телефон під рукою.
    -->
    <div class="facts">
      <section class="fact fact--client">
        <header class="fact__top">
          <h2 class="fact__label">Замовник</h2>

          <span v-if="(object.client?.discount ?? 0) > 0" class="chip chip--brand">
            −{{ object.client?.discount }}%
          </span>
        </header>

        <div class="fact__main">
          <div v-if="object.client" class="client">
            <span class="client__mono" aria-hidden="true">{{ monogram(object.client.name) }}</span>

            <span class="client__body">
              <span class="client__name">{{ object.client.name }}</span>
              <span class="client__contact">{{
                object.client.contact || 'контакт не вказано'
              }}</span>
            </span>
          </div>

          <p v-else class="fact__none">Обʼєкт без замовника</p>
        </div>

        <div class="fact__meter" />

        <div class="fact__foot fact__foot--row">
          <template v-if="object.client?.phone">
            <a class="tel" :href="`tel:${object.client.phone}`">
              <AppIcon name="phone" />
              <span>{{ object.client.phone }}</span>
            </a>

            <!-- Номер частіше переносять у месенджер, ніж набирають з екрана. -->
            <button
              type="button"
              class="copy"
              :class="{ 'copy--done': copied }"
              :title="copied ? 'Скопійовано' : 'Скопіювати номер'"
              :aria-label="copied ? 'Номер скопійовано' : 'Скопіювати номер'"
              @click="copyPhone"
            >
              <AppIcon :name="copied ? 'check' : 'copy'" />
            </button>
          </template>

          <span v-else-if="object.client" class="fact__none">телефон не вказано</span>
        </div>
      </section>

      <!-- Готовність рахується з робіт: руками її не виставляють. -->
      <section class="fact fact--go">
        <header class="fact__top">
          <h2 class="fact__label">Готовність</h2>

          <button
            type="button"
            class="fact__jump"
            aria-label="Відкрити вкладку «Послуги»"
            @click="emit('tab', 'services')"
          >
            <AppIcon name="forward" />
          </button>
        </header>

        <div class="fact__main">
          <p class="fact__value">{{ percent === null ? '—' : `${percent}%` }}</p>
        </div>

        <div class="fact__meter">
          <span class="track">
            <span class="track__fill" :style="{ width: `${percent ?? 0}%` }" />
          </span>
        </div>

        <p class="fact__foot">
          <template v-if="works.total > 0">
            <span class="fact__strong">{{ works.done }} з {{ works.total }}</span>
            робіт виконано
          </template>
          <template v-else>робіт ще немає — рахувати нічого</template>
        </p>
      </section>

      <section class="fact fact--go fact--money">
        <header class="fact__top">
          <h2 class="fact__label">{{ overpaid ? 'Переплата' : 'Залишок до сплати' }}</h2>

          <button
            type="button"
            class="fact__jump"
            aria-label="Відкрити вкладку «Фінанси»"
            @click="emit('tab', 'finance')"
          >
            <AppIcon name="forward" />
          </button>
        </header>

        <div class="fact__main">
          <p class="fact__value">
            {{ formatAmount(Math.abs(summary.due)) }} <span class="cur">₴</span>
          </p>
        </div>

        <div class="fact__meter">
          <span class="track">
            <span class="track__fill track__fill--pay" :style="{ width: `${paidPercent}%` }" />
          </span>
        </div>

        <p class="fact__foot">
          оплачено <span class="fact__strong">{{ paidPercent }}%</span> —
          {{ formatAmount(summary.paid) }} з {{ formatAmount(summary.client) }} ₴
        </p>
      </section>

      <section class="fact fact--go" :class="{ 'fact--late': summary.overdue }">
        <header class="fact__top">
          <h2 class="fact__label">Дедлайн</h2>

          <span
            class="chip"
            :class="{ 'chip--late': summary.overdue, 'chip--soon': soon && !summary.overdue }"
          >
            {{ formatDeadline(summary.daysLeft, summary.overdue) }}
          </span>

          <button
            type="button"
            class="fact__jump"
            aria-label="Відкрити вкладку «Огляд» — там правлять дати"
            @click="emit('tab', 'overview')"
          >
            <AppIcon name="forward" />
          </button>
        </header>

        <div class="fact__main">
          <p class="fact__value">
            {{ object.finished_at === null ? '—' : formatDay(object.finished_at) }}
          </p>
        </div>

        <div class="fact__meter">
          <!-- Смуга строку: скільки з планових днів уже позаду. -->
          <span v-if="timePercent !== null" class="track">
            <span class="track__fill track__fill--time" :style="{ width: `${timePercent}%` }" />
          </span>
        </div>

        <p class="fact__foot">
          <template v-if="object.started_at">початок {{ formatDay(object.started_at) }}</template>
          <template v-else>початок не вказано</template>
        </p>
      </section>
    </div>
  </header>
</template>

<style scoped>
.ohead {
  display: grid;
  gap: 16px;
}

.ohead__crumbs {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: -6px;
}

/* Обкладинка, назва з адресою та дії — один рядок, вирівняний по центру:
   текстова колонка тепер тієї самої висоти, що й обкладинка. */
.ohead__top {
  display: flex;
  align-items: center;
  gap: 14px;
}

.cover {
  display: block;
  flex: none;
  overflow: hidden;
  width: 64px;
  height: 64px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-sunk);
}

.cover__photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover__ghost {
  display: grid;
  place-items: center;
  height: 100%;
  background: linear-gradient(135deg, var(--brand-tint), var(--paper-sunk));
  color: var(--brand-strong);
}

.cover__ghost :deep(.icon) {
  width: 26px;
  height: 26px;
  opacity: 0.6;
}

.ohead__intro {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.ohead__crumb {
  color: inherit;
  text-decoration: none;
  transition: color 0.16s var(--ease);
}

.ohead__crumb:hover {
  color: var(--ink);
}

.ohead__title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: clamp(22px, 2.6vw, 30px);
}

.ohead__archived {
  padding: 4px 10px;
  border: 1px solid var(--line);
  border-radius: 999px;
  font-family: var(--font-body);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.ohead__addr {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  font-size: 13.5px;
  color: var(--ink-muted);
}

.ohead__addr :deep(.icon) {
  flex: none;
  width: 15px;
  height: 15px;
  color: var(--ink-faint);
}

/* Довга адреса тисне саму себе, а не виштовхує статус і дії за край. */
.ohead__addr span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ohead__tools {
  display: flex;
  align-items: center;
  flex: none;
  gap: 8px;
  margin-left: auto;
}

/* ── Ключові блоки ─────────────────────────────────────────────── */

.facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(232px, 1fr));
  gap: 12px;
}

.fact {
  position: relative;
  display: grid;
  grid-template-rows: auto auto auto auto;
  align-content: start;
  row-gap: 10px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-raised);
  transition:
    border-color 0.16s var(--ease),
    box-shadow 0.2s var(--ease),
    transform 0.2s var(--ease);
}

/*
 * Рядки карток живуть на сітці батька: підпис до підпису, цифра до цифри,
 * смуга до смуги. Без цього блок замовника, у якого зверху аватар, зсував
 * усі свої рядки відносно сусідів.
 */
@supports (grid-template-rows: subgrid) {
  .fact {
    grid-row: span 4;
    grid-template-rows: subgrid;
  }
}

.fact__top {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
}

.fact__main {
  display: flex;
  align-items: center;
  min-width: 0;
}

.fact__meter {
  display: grid;
  align-content: center;
  min-height: 5px;
}

.fact__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--ink-faint);
}

/* Цифрам, по які сюди й заходять, потрібен розмір. */
.fact__value {
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

.fact__strong {
  font-weight: 600;
  color: var(--ink-muted);
}

.fact__foot {
  font-size: 12px;
  line-height: 1.45;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.fact__foot--row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.fact__none {
  font-size: 13px;
  color: var(--ink-faint);
}

.fact--money {
  border-color: var(--line-strong);
}

.fact--late .fact__value {
  color: var(--danger);
}

/* ── Перехід у вкладку ─────────────────────────────────────────── */

/* Показник — це двері в розділ, де його рахують: уся картка клікабельна,
   стрілка лише позначає, що двері є. */
.fact--go {
  cursor: pointer;
}

.fact--go:hover {
  border-color: var(--line-strong);
  box-shadow: var(--shadow-sm);
  transform: translateY(-2px);
}

.fact--go:focus-within {
  border-color: var(--brand);
}

.fact__jump {
  display: grid;
  place-items: center;
  flex: none;
  width: 24px;
  height: 24px;
  margin-left: auto;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-faint);
  opacity: 0.4;
  transition:
    opacity 0.18s var(--ease),
    transform 0.18s var(--ease),
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

/* Кнопка тягне за собою всю картку — тож і клік по будь-якому її місцю. */
.fact__jump::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--r-md);
}

.fact--go:hover .fact__jump {
  opacity: 1;
  transform: translateX(2px);
  background: var(--paper-sunk);
  color: var(--ink);
}

.fact__jump :deep(.icon) {
  width: 15px;
  height: 15px;
}

/* ── Смуги ─────────────────────────────────────────────────────── */

.track {
  overflow: hidden;
  height: 5px;
  border-radius: 999px;
  background: var(--paper-sunk);
}

.track__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--ink-muted);
  transition: width 0.35s var(--ease);
}

.track__fill--pay {
  background: var(--brand);
}

.track__fill--time {
  background: var(--line-strong);
}

.fact--late .track__fill--time {
  background: var(--danger);
}

/* ── Плашки ────────────────────────────────────────────────────── */

.chip {
  margin-left: auto;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--ink-muted);
}

.chip--brand {
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.chip--soon {
  background: var(--amber-tint);
  color: #8a5c00;
}

.chip--late {
  background: var(--danger-tint);
  color: var(--danger);
}

/* Плашка вже зайняла праву межу — стрілці лишається стати поруч. */
.chip + .fact__jump {
  margin-left: 0;
}

/* ── Замовник ──────────────────────────────────────────────────── */

.client {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.client__mono {
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--brand-tint);
  color: var(--brand-strong);
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
}

.client__body {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.client__name {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.client__contact {
  font-size: 12px;
  color: var(--ink-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Номер набирається одним дотиком: картку часто відкривають з телефону. */
.tel {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  padding: 3px 8px;
  margin-left: -8px;
  border-radius: var(--r-xs);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  text-decoration: none;
  font-variant-numeric: tabular-nums;
  transition:
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.tel:hover {
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.tel :deep(.icon) {
  flex: none;
  width: 14px;
  height: 14px;
  color: var(--ink-faint);
  transition: color 0.16s var(--ease);
}

.tel:hover :deep(.icon) {
  color: var(--brand-strong);
}

.tel span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copy {
  display: grid;
  place-items: center;
  flex: none;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--ink-faint);
  transition:
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.copy:hover {
  background: var(--paper-sunk);
  color: var(--ink);
}

/* Підтвердження живе півтори секунди — рівно щоб його встигли побачити. */
.copy--done,
.copy--done:hover {
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.copy :deep(.icon) {
  width: 14px;
  height: 14px;
}

@media (width <= 560px) {
  .ohead__top {
    flex-wrap: wrap;
  }

  .ohead__tools {
    width: 100%;
    margin-left: 0;
  }
}
</style>
