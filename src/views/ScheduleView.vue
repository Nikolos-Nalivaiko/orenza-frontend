<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ScheduleCalendar from '@/components/schedule/ScheduleCalendar.vue'
import ScheduleFeed from '@/components/schedule/ScheduleFeed.vue'
import ScheduleOverdue from '@/components/schedule/ScheduleOverdue.vue'
import ScheduleToolbar from '@/components/schedule/ScheduleToolbar.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import { todayIso } from '@/lib/objects'
import {
  buildEvents,
  buildSchedule,
  countKinds,
  defaultScheduleFilters,
  matchesFilters,
  monthOf,
  objectsOf,
  type ScheduleFilters,
  type ScheduleMode,
} from '@/lib/schedule'
import { useObjectsStore } from '@/stores/objects'

/**
 * Графік робіт. Свого джерела даних у нього немає: планові дати обʼєктів і
 * очікувані платежі вже лежать у картках, і графік лише перекладає їх у
 * розріз часу — що горить сьогодні, що чекає цього тижня.
 */
const objects = useObjectsStore()

/** День фіксуємо на час життя екрана: прострочення не має мигати опівночі. */
const today = todayIso()

const filters = ref<ScheduleFilters>(defaultScheduleFilters())
const mode = ref<ScheduleMode>('feed')

const month = ref(monthOf(today))
const selected = ref('')

const events = computed(() => buildEvents(objects.current, today))

/** Сітці період не потрібен — місяць задає його сам. */
const filtered = computed(() =>
  events.value.filter((event) => matchesFilters(event, filters.value)),
)

const schedule = computed(() => buildSchedule(events.value, filters.value, today))

const options = computed(() => objectsOf(events.value))
const counts = computed(() => countKinds(events.value, filters.value.objectId))

/** Порожній простір, порожній графік і порожня вибірка — різні екрани. */
const state = computed(() => {
  if (objects.isLoading) {
    return 'loading'
  }

  if (objects.current.length === 0) {
    return 'blank'
  }

  if (events.value.length === 0) {
    return 'empty'
  }

  return filtered.value.length === 0 ? 'nothing' : 'list'
})

const feedEmpty = computed(
  () => schedule.value.upcoming.length === 0 && schedule.value.overdue.length === 0,
)

onMounted(() => {
  void objects.fetchObjects()
})

function reset(): void {
  filters.value = defaultScheduleFilters()
}
</script>

<template>
  <div class="sched">
    <header class="sched__head">
      <div class="sched__intro">
        <p class="eyebrow">Графік робіт</p>
        <h1 class="display sched__title">Що попереду</h1>
        <p class="sched__sub">
          Планові дати обʼєктів і очікувані платежі однією стрічкою. Записи ті самі, що в картках —
          правити їх треба там, де вони живуть.
        </p>
      </div>

      <p v-if="state === 'list' && schedule.expected > 0" class="money">
        <span class="money__label">Очікується в періоді</span>
        <span class="money__sum">{{ formatAmount(schedule.expected) }} <span>₴</span></span>
      </p>
    </header>

    <ScheduleToolbar
      v-if="state === 'list' || state === 'nothing'"
      v-model="filters"
      :objects="options"
      :counts="counts"
      :mode="mode"
      :shown="schedule.upcoming.length"
      @mode="mode = $event"
      @reset="reset"
    />

    <!-- Скелетон повторює форму стрічки, щоб список не смикнувся, коли доїде. -->
    <div v-if="state === 'loading'" class="sk" aria-hidden="true">
      <span v-for="index in 5" :key="index" class="sk__row" />
    </div>

    <!-- У просторі ще немає жодного обʼєкта. -->
    <section v-else-if="state === 'blank'" class="blank">
      <span class="blank__icon" aria-hidden="true"><AppIcon name="calendar" /></span>

      <h2 class="display blank__title">Графік порожній</h2>
      <p class="blank__text">
        Він збирається сам — із дат і платежів обʼєктів. Заведіть перший обʼєкт, і найближчі події
        зʼявляться тут.
      </p>

      <RouterLink class="btn btn--primary btn--sm blank__cta" :to="{ name: 'object-create' }">
        Створити обʼєкт
      </RouterLink>
    </section>

    <!-- Обʼєкти є, але дат і платежів у них ще не проставили. -->
    <section v-else-if="state === 'empty'" class="blank">
      <span class="blank__icon" aria-hidden="true"><AppIcon name="calendar" /></span>

      <h2 class="display blank__title">Подій ще немає</h2>
      <p class="blank__text">
        В обʼєктах не проставлені планові дати, а платежі — або оплачені, або без дати очікування.
        Графік підхопить їх одразу, щойно вони зʼявляться в картці.
      </p>

      <RouterLink class="btn btn--ghost btn--sm blank__cta" :to="{ name: 'objects' }">
        До обʼєктів
      </RouterLink>
    </section>

    <section v-else-if="state === 'nothing'" class="nothing">
      <p class="nothing__text">Під ці умови не підпадає жодна подія.</p>
      <button type="button" class="btn btn--ghost btn--sm" @click="reset">Скинути фільтри</button>
    </section>

    <template v-else>
      <ScheduleOverdue
        v-if="schedule.overdue.length > 0"
        :events="schedule.overdue"
        :amount="schedule.overdueAmount"
      />

      <template v-if="mode === 'feed'">
        <ScheduleFeed v-if="schedule.upcoming.length > 0" :weeks="schedule.weeks" />

        <p v-else class="quiet">
          <template v-if="feedEmpty">
            У найближчому періоді подій немає — можна розширити його вище.
          </template>
          <template v-else>
            Попереду тихо: у періоді подій немає, лишилось тільки прострочене.
          </template>
        </p>
      </template>

      <ScheduleCalendar
        v-else
        v-model:month="month"
        v-model:selected="selected"
        :events="filtered"
        :today="today"
      />
    </template>
  </div>
</template>

<style scoped>
.sched {
  display: grid;
  gap: 18px;
  width: 100%;
}

.sched__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px 20px;
}

.sched__intro {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.sched__title {
  font-size: clamp(24px, 2.8vw, 34px);
}

.sched__sub {
  max-width: 68ch;
  font-size: 13.5px;
  color: var(--ink-muted);
}

.money {
  display: grid;
  gap: 2px;
  margin-left: auto;
  padding: 10px 16px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-raised);
  text-align: right;
}

.money__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.money__sum {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}

.money__sum span {
  color: var(--ink-faint);
}

/* ── Стани ─────────────────────────────────────────────────────── */

.sk {
  display: grid;
  gap: 6px;
}

.sk__row {
  height: 58px;
  border-radius: var(--r-sm);
  background: linear-gradient(
    90deg,
    var(--paper-sunk) 0%,
    var(--paper-raised) 50%,
    var(--paper-sunk) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

.blank {
  display: grid;
  justify-items: start;
  gap: 12px;
  width: 100%;
  max-width: 560px;
  padding: 32px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

.blank__icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 15px;
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.blank__icon :deep(.icon) {
  width: 23px;
  height: 23px;
}

.blank__title {
  font-size: clamp(20px, 2.4vw, 26px);
}

.blank__text {
  max-width: 52ch;
  font-size: 14px;
  line-height: 1.55;
  color: var(--ink-muted);
}

.blank__cta {
  margin-top: 6px;
  text-decoration: none;
}

.nothing {
  display: grid;
  justify-items: start;
  gap: 12px;
  padding: 26px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-md);
}

.nothing__text {
  max-width: 58ch;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--ink-muted);
}

.quiet {
  padding: 22px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-md);
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--ink-muted);
}

@media (width <= 560px) {
  .money {
    margin-left: 0;
    text-align: left;
  }
}
</style>
