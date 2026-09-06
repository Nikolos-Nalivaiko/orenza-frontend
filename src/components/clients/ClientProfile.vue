<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { formatAmount } from '@/lib/amount'
import { formatObjects, formatSpell, type ClientProfile, type ClientTotals } from '@/lib/clients'
import { formatDay } from '@/lib/objects'

/**
 * Портрет замовника — те, що видно лише збоку від окремої будови: відколи ця
 * людина з нами, на яку суму зазвичай заходить і як платить. Чотири факти, з
 * яких складається відповідь на питання «а хто це взагалі такий», коли з
 * останнього обʼєкта минув рік.
 *
 * Це довідка, а не дашборд: рядок «підпис — значення», розділені лініями.
 * Так вона читається згори вниз за один раз і спокійно стоїть вузькою
 * колонкою збоку від опису замовника.
 */

const props = defineProps<{ profile: ClientProfile; totals: ClientTotals }>()

/** Скільки платежів уже пройшло — решта ще попереду. */
const left = computed(() => props.profile.payments - props.profile.received)
</script>

<template>
  <section class="prof">
    <h2 class="prof__title">Портрет замовника</h2>

    <dl class="facts">
      <div class="fact">
        <dt class="fact__label">З нами з</dt>

        <dd class="fact__value">
          {{ profile.since === null ? '—' : formatDay(profile.since) }}
        </dd>

        <p class="fact__sub">
          <template v-if="profile.days !== null && profile.days > 0">
            співпраці вже {{ formatSpell(profile.days) }}
          </template>
          <template v-else-if="profile.since !== null">перший обʼєкт зовсім свіжий</template>
          <template v-else>обʼєктів ще не було</template>
        </p>
      </div>

      <div class="fact">
        <dt class="fact__label">Середній чек</dt>

        <dd class="fact__value">{{ formatAmount(profile.average) }} <span class="cur">₴</span></dd>

        <p class="fact__sub">
          на обʼєкт · {{ formatObjects(totals.objects - totals.archived) }} поза архівом
        </p>
      </div>

      <div class="fact" :class="{ 'fact--late': totals.overdue > 0 }">
        <dt class="fact__label">Платежі</dt>

        <dd class="fact__value">{{ profile.received }} / {{ profile.payments }}</dd>

        <p class="fact__sub">
          <template v-if="totals.overdue > 0">
            прострочено {{ formatAmount(totals.overdue) }} ₴
          </template>
          <template v-else-if="left > 0">
            ще чекаємо {{ formatAmount(totals.pending) }} ₴
          </template>
          <template v-else-if="profile.payments > 0">усе отримано</template>
          <template v-else>платежів ще не було</template>
        </p>
      </div>

      <div class="fact">
        <dt class="fact__label">Останній обʼєкт</dt>

        <dd class="fact__value fact__value--name">
          <RouterLink
            v-if="profile.last"
            class="fact__link"
            :to="{ name: 'object', params: { id: profile.last.id } }"
          >
            {{ profile.last.name }}
          </RouterLink>
          <template v-else>—</template>
        </dd>

        <p class="fact__sub">
          <template v-if="profile.last?.at">заведений {{ formatDay(profile.last.at) }}</template>
          <template v-else-if="profile.last">дата створення невідома</template>
          <template v-else>створіть перший — і він зʼявиться тут</template>
        </p>
      </div>
    </dl>
  </section>
</template>

<style scoped>
.prof {
  display: grid;
  align-content: start;
  gap: 4px;
  padding: 20px 22px 8px;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

.prof__title {
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.facts {
  display: grid;
  margin: 0;
}

/*
 * Рядок довідки: ліворуч підпис і пояснення, праворуч — саме значення.
 * Волосяна лінія між рядками замінює чотири окремі плитки.
 */
.fact {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 2px 18px;
  padding: 13px 0;
  border-bottom: 1px solid var(--line);
}

.fact:last-child {
  border-bottom: 0;
}

.fact__label {
  grid-column: 1;
  grid-row: 1;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ink);
}

.fact__value {
  grid-column: 2;
  grid-row: 1 / span 2;
  margin: 0;
  font-family: var(--font-display);
  font-size: 18px;
  font-weight: 600;
  letter-spacing: -0.04em;
  line-height: 1.2;
  text-align: right;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* Назва обʼєкта — не цифра: їй потрібен перенос, а не табличні нулі. */
.fact__value--name {
  max-width: 22ch;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: normal;
  overflow-wrap: anywhere;
}

.fact__link {
  color: inherit;
  text-decoration: none;
  transition: color 0.16s var(--ease);
}

.fact__link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.cur {
  font-family: var(--font-body);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-faint);
}

.fact__sub {
  grid-column: 1;
  grid-row: 2;
  font-size: 12px;
  line-height: 1.45;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

/* Єдиний колір у довідці — прострочення: це те, через що дзвонять. */
.fact--late .fact__sub {
  font-weight: 600;
  color: var(--danger);
}
</style>
