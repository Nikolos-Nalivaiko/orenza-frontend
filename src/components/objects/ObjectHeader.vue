<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import ObjectActions from '@/components/objects/ObjectActions.vue'
import ObjectStatusMenu from '@/components/objects/ObjectStatusMenu.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import { formatDay, type ConstructionObject, type ObjectStatus } from '@/lib/objects'
import { formatDeadline, servicesDone, type ObjectSummary } from '@/lib/objectList'
import { monogram } from '@/lib/workspaces'

const props = defineProps<{ object: ConstructionObject; summary: ObjectSummary }>()

const emit = defineEmits<{ status: [status: ObjectStatus]; archive: []; remove: [] }>()

const archived = computed(() => props.object.archived_at !== null)

/** Переплату показуємо як переплату — сума з мінусом нікому ні про що не каже. */
const overpaid = computed(() => props.summary.due < 0)

const works = computed(() => servicesDone(props.object))

const percent = computed(() =>
  props.summary.readiness === null ? null : Math.round(props.summary.readiness * 100),
)

const paidPercent = computed(() => Math.round(props.summary.progress * 100))
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

    <!-- Чотири блоки, за якими заходять на обʼєкт. Однакові в усіх вкладках. -->
    <div class="facts">
      <!-- Замовник розгорнутий одразу: телефон потрібен частіше, ніж будь-що інше. -->
      <section class="fact fact--client">
        <h2 class="fact__label">Замовник</h2>

        <template v-if="object.client">
          <div class="client">
            <span class="client__mono" aria-hidden="true">{{ monogram(object.client.name) }}</span>

            <span class="client__body">
              <span class="client__name">{{ object.client.name }}</span>
              <span class="client__contact">{{ object.client.contact }}</span>
            </span>
          </div>

          <p class="client__row">
            <AppIcon name="user" />
            <a v-if="object.client.phone" class="client__tel" :href="`tel:${object.client.phone}`">
              {{ object.client.phone }}
            </a>
            <span v-else class="fact__none">телефон не вказано</span>
          </p>

          <p v-if="object.client.discount > 0" class="client__disc">
            Персональна знижка −{{ object.client.discount }}%
          </p>
        </template>

        <p v-else class="fact__none">Обʼєкт без замовника</p>
      </section>

      <!-- Готовність рахується з робіт: руками її не виставляють. -->
      <section class="fact">
        <h2 class="fact__label">Готовність</h2>

        <p class="fact__value fact__value--big">{{ percent === null ? '—' : `${percent}%` }}</p>

        <span class="track">
          <span class="track__fill" :style="{ width: `${percent ?? 0}%` }" />
        </span>

        <p class="fact__sub">
          <template v-if="works.total > 0">
            {{ works.done }} з {{ works.total }} робіт виконано
          </template>
          <template v-else>робіт ще немає — рахувати нічого</template>
        </p>
      </section>

      <section class="fact fact--money">
        <h2 class="fact__label">{{ overpaid ? 'Переплата' : 'Залишок до сплати' }}</h2>

        <p class="fact__value fact__value--big">{{ formatAmount(Math.abs(summary.due)) }} ₴</p>

        <span class="track">
          <span class="track__fill track__fill--pay" :style="{ width: `${paidPercent}%` }" />
        </span>

        <p class="fact__sub">
          оплачено {{ formatAmount(summary.paid) }} з {{ formatAmount(summary.client) }} ₴
        </p>
      </section>

      <section class="fact" :class="{ 'fact--late': summary.overdue }">
        <h2 class="fact__label">Дедлайн</h2>

        <p class="fact__value fact__value--big">
          {{ object.finished_at === null ? '—' : formatDay(object.finished_at) }}
        </p>

        <p class="fact__strong">{{ formatDeadline(summary.daysLeft, summary.overdue) }}</p>

        <p class="fact__sub">
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
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-raised);
}

.fact__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.fact__value {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
}

/* Цифрам, по які сюди й заходять, потрібен розмір. */
.fact__value--big {
  font-size: 24px;
  letter-spacing: -0.02em;
}

.fact__strong {
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-muted);
}

.fact__sub {
  font-size: 12px;
  line-height: 1.45;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.fact__none {
  font-size: 13px;
  color: var(--ink-faint);
}

.fact--money {
  border-color: var(--line-strong);
}

.fact--late .fact__value,
.fact--late .fact__strong {
  color: var(--danger);
}

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

.client__row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.client__row :deep(.icon) {
  flex: none;
  width: 14px;
  height: 14px;
  color: var(--ink-faint);
}

/* Номер набирається одним дотиком: картку часто відкривають з телефону. */
.client__tel {
  color: inherit;
  text-decoration: none;
}

.client__tel:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.client__disc {
  justify-self: start;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--brand-tint);
  color: var(--brand-strong);
  font-size: 11.5px;
  font-weight: 600;
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
