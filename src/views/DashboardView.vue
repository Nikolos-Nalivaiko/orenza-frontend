<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import ClientCreateDialog from '@/components/clients/ClientCreateDialog.vue'
import KpiTile from '@/components/dashboard/KpiTile.vue'
import ObjectPicker from '@/components/dashboard/ObjectPicker.vue'
import PanelCard from '@/components/dashboard/PanelCard.vue'
import ObjectsTable from '@/components/objects/ObjectsTable.vue'
import PaymentDialog from '@/components/objects/PaymentDialog.vue'
import ScheduleOverdue from '@/components/schedule/ScheduleOverdue.vue'
import ScheduleRow from '@/components/schedule/ScheduleRow.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import type { ClientForm } from '@/lib/clients'
import {
  crewAccrued,
  dashboardEvents,
  dashboardKpis,
  dashboardTotals,
  payableObjects,
  portfolio,
  UPCOMING_DAYS,
} from '@/lib/dashboard'
import type { PaymentPayload } from '@/lib/finance'
import { todayIso } from '@/lib/objects'
import { useAuthStore } from '@/stores/auth'
import { useObjectsStore } from '@/stores/objects'
import { useWorkspacesStore } from '@/stores/workspaces'

/**
 * Дашборд власника. Він нічого не рахує сам: цифри — це гроші обʼєктів,
 * список — рядки сторінки «Обʼєкти», події — стрічка графіка робіт. Питання,
 * на яке екран відповідає, одне: з чого почати сьогодні. Тому зверху стоїть
 * прострочене, а не вітання з красивим графіком.
 */
const router = useRouter()
const auth = useAuthStore()
const workspaces = useWorkspacesStore()
const objects = useObjectsStore()

/** День фіксуємо на час життя екрана: прострочення не має мигати опівночі. */
const today = todayIso()

const items = computed(() => objects.current)

const totals = computed(() => dashboardTotals(items.value, today))

/** Бригад в особистому просторі немає — питання «скільки винен людям» не стоїть. */
const crew = computed(() =>
  workspaces.current?.type.value === 'company' ? crewAccrued(items.value) : null,
)

const kpis = computed(() => dashboardKpis(totals.value, crew.value))

/** Цифри йдуть двома блоками: робота в руках і розрахунки по ній. */
const work = computed(() => kpis.value.filter((kpi) => kpi.group === 'work'))
const settlement = computed(() => kpis.value.filter((kpi) => kpi.group === 'settlement'))

const rows = computed(() => portfolio(items.value, today))
const events = computed(() => dashboardEvents(items.value, today))
const payable = computed(() => payableObjects(items.value, today))

const greeting = computed(() => {
  const hour = new Date().getHours()

  if (hour < 5) {
    return 'Доброї ночі'
  }

  if (hour < 12) {
    return 'Доброго ранку'
  }

  return hour < 18 ? 'Доброго дня' : 'Доброго вечора'
})

const name = computed(() => auth.user?.first_name ?? '')

const blank = computed(() => !objects.isLoading && items.value.length === 0)

/* ── Швидкі дії ────────────────────────────────────────────────── */

const creatingClient = ref(false)
/** Платіж заводять у два кроки: спочатку обʼєкт, далі — звичайне вікно платежу. */
const picking = ref(false)
const payTo = ref<number | null>(null)

const target = computed(() => payable.value.find((row) => row.object.id === payTo.value) ?? null)

onMounted(() => {
  if (!objects.loaded) {
    void objects.fetchObjects()
  }
})

async function createClient(form: ClientForm): Promise<void> {
  const client = await objects.createClient(form)

  if (client === null) {
    return
  }

  creatingClient.value = false
  await router.push({ name: 'client', params: { id: client.id } })
}

function pick(id: number): void {
  picking.value = false
  payTo.value = id
}

function savePayment(payload: PaymentPayload): void {
  if (payTo.value !== null) {
    objects.addPayment(payTo.value, payload)
  }

  payTo.value = null
}
</script>

<template>
  <div class="dash">
    <header class="dash__head">
      <div class="dash__text">
        <p class="eyebrow">Зведення простору</p>
        <h1 class="display dash__title">{{ greeting }}, {{ name }}</h1>
        <p class="muted dash__sub">
          Ось що відбувається в «{{ workspaces.current?.name }}» просто зараз.
        </p>
      </div>

      <!-- Швидкі дії: три речі, заради яких найчастіше й заходять. -->
      <div class="acts">
        <RouterLink class="btn btn--primary btn--sm acts__btn" :to="{ name: 'object-create' }">
          <AppIcon name="plus" />
          <span>Новий обʼєкт</span>
        </RouterLink>

        <button
          type="button"
          class="btn btn--ghost btn--sm acts__btn"
          @click="creatingClient = true"
        >
          <AppIcon name="plus" />
          <span>Новий замовник</span>
        </button>

        <button
          type="button"
          class="btn btn--ghost btn--sm acts__btn"
          :disabled="payable.length === 0"
          @click="picking = true"
        >
          <AppIcon name="wallet" />
          <span>Додати платіж</span>
        </button>
      </div>
    </header>

    <!-- Скелетон повторює форму екрана, щоб цифри не смикнули розкладку. -->
    <template v-if="objects.isLoading && items.length === 0">
      <div class="tiles tiles--2" aria-hidden="true">
        <span v-for="index in 2" :key="index" class="sk__tile" />
      </div>
      <div class="tiles tiles--3" aria-hidden="true">
        <span v-for="index in 3" :key="index" class="sk__tile" />
      </div>
      <div class="sk" aria-hidden="true">
        <span v-for="index in 5" :key="index" class="sk__row" />
      </div>
    </template>

    <!-- У просторі ще немає жодного обʼєкта: рахувати нічого. -->
    <section v-else-if="blank" class="blank">
      <span class="blank__icon" aria-hidden="true"><AppIcon name="building" /></span>

      <h2 class="display blank__title">Простір поки порожній</h2>
      <p class="blank__text">
        Дашборд збирається сам — із обʼєктів: гроші, дедлайни й платежі приходять із їхніх карток.
        Заведіть перший обʼєкт, і зведення зʼявиться тут.
      </p>

      <RouterLink class="btn btn--primary btn--sm blank__cta" :to="{ name: 'object-create' }">
        Створити обʼєкт
      </RouterLink>
    </section>

    <template v-else>
      <!-- 1. Потребує уваги: те саме прострочене, що й у графіку робіт. -->
      <ScheduleOverdue
        v-if="events.alarm.length > 0"
        :events="events.alarm"
        :amount="events.alarmAmount"
      />

      <!-- 2. Гроші: спершу те, що в руках, потім те, як за це розраховуються. -->
      <section class="block" aria-labelledby="kpi-work">
        <header class="block__head">
          <h2 id="kpi-work" class="block__title">Робота в руках</h2>
          <span class="block__rule" aria-hidden="true" />
          <p class="block__hint">по живих обʼєктах простору</p>
        </header>

        <div class="tiles tiles--2">
          <KpiTile v-for="kpi in work" :key="kpi.key" :kpi="kpi" />
        </div>
      </section>

      <section class="block" aria-labelledby="kpi-settlement">
        <header class="block__head">
          <h2 id="kpi-settlement" class="block__title">Розрахунки</h2>
          <span class="block__rule" aria-hidden="true" />
          <p class="block__hint">гроші отримані, очікувані й нараховані</p>
        </header>

        <div class="tiles" :class="`tiles--${settlement.length}`">
          <KpiTile v-for="kpi in settlement" :key="kpi.key" :kpi="kpi" />
        </div>
      </section>

      <!-- 3. Списки: з чим працювати сьогодні. -->
      <section class="block" aria-labelledby="lists">
        <header class="block__head">
          <h2 id="lists" class="block__title">Сьогоднішня робота</h2>
          <span class="block__rule" aria-hidden="true" />
        </header>

        <div class="grid">
          <PanelCard title="Портфель обʼєктів" hint="найтерміновіші зверху" flush>
            <template #action>
              <RouterLink class="link" :to="{ name: 'objects' }">Показати всі →</RouterLink>
            </template>

            <div class="portfolio">
              <ObjectsTable v-if="rows.length > 0" :rows="rows" />
              <p v-else class="empty">Активних обʼєктів немає — усі або завершені, або в архіві.</p>
            </div>
          </PanelCard>

          <PanelCard title="Найближчі події" :hint="`наступні ${UPCOMING_DAYS} днів`">
            <template #action>
              <RouterLink class="link" :to="{ name: 'schedule' }">Графік робіт →</RouterLink>
            </template>

            <ul v-if="events.upcoming.length > 0" class="feed">
              <ScheduleRow
                v-for="event in events.upcoming"
                :key="event.id"
                :event="event"
                with-date
              />
            </ul>

            <p v-else class="empty">
              На тиждень уперед подій немає — ані дедлайнів, ані очікуваних платежів.
            </p>
          </PanelCard>
        </div>
      </section>
    </template>

    <ClientCreateDialog
      v-if="creatingClient"
      :saving="objects.isSaving"
      :server-error="objects.error"
      @create="createClient"
      @dirty="objects.reset()"
      @close="creatingClient = false"
    />

    <ObjectPicker v-if="picking" :rows="payable" @pick="pick" @close="picking = false" />

    <!--
      Другий крок швидкого платежу — те саме вікно, що й у картці обʼєкта:
      правила в грошей одні, звідки б їх не заводили.
    -->
    <PaymentDialog
      v-if="target"
      :today="today"
      :due="target.summary.due"
      @save="savePayment"
      @close="payTo = null"
    />
  </div>
</template>

<style scoped>
/*
 * Екран іде блоками: вітання, тривога, дві групи цифр, списки. Ритм тримають
 * два кроки — 30px між блоками і 14px усередині блоку.
 */
.dash {
  display: grid;
  gap: 30px;
  width: 100%;
  max-width: 1420px;
  margin: 0 auto;
}

.dash__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  padding-bottom: 22px;
  border-bottom: 1px solid var(--line);
}

.dash__text {
  display: grid;
  gap: 7px;
}

.dash__title {
  font-size: clamp(26px, 3vw, 36px);
}

.dash__sub {
  font-size: 14px;
}

/* ── Блок ──────────────────────────────────────────────────────── */

.block {
  display: grid;
  gap: 14px;
}

/* Назва блоку, лінійка на весь залишок ширини, підпис у кінці рядка. */
.block__head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.block__title {
  flex: none;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.block__rule {
  flex: 1;
  height: 1px;
  background: var(--line);
}

.block__hint {
  flex: none;
  font-size: 12px;
  color: var(--ink-faint);
}

.acts {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-left: auto;
}

.acts__btn {
  text-decoration: none;
}

.acts__btn :deep(.icon) {
  width: 16px;
  height: 16px;
}

/*
 * Кількість колонок задає сам блок, а не auto-fit: інакше пʼята плитка
 * лишається сама в ряду й розтягується на всю ширину.
 */
.tiles {
  display: grid;
  gap: 14px;
}

.tiles--2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.tiles--3 {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  gap: 14px;
  /* Карти тягнуться до однієї висоти — низи колонок мають збігатись. */
  align-items: stretch;
}

/* Таблиця обʼєктів іде в край карти, але з полями по боках рядків. */
.portfolio {
  padding: 0 22px 22px;
}

.feed {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.empty {
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink-muted);
}

.link {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-muted);
  text-decoration: none;
  white-space: nowrap;
  border-bottom: 1px solid var(--line-strong);
  transition:
    color 0.16s var(--ease),
    border-color 0.16s var(--ease);
}

.link:hover {
  color: var(--ink);
  border-color: var(--ink);
}

/* ── Скелетон ──────────────────────────────────────────────────── */

.sk {
  display: grid;
  gap: 6px;
}

.sk__tile,
.sk__row {
  border-radius: var(--r-lg);
  background: linear-gradient(
    90deg,
    var(--paper-sunk) 0%,
    var(--paper-raised) 50%,
    var(--paper-sunk) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

.sk__tile {
  height: 182px;
}

.sk__row {
  height: 58px;
  border-radius: var(--r-sm);
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

/* ── Порожній простір ──────────────────────────────────────────── */

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

@media (width <= 1180px) {
  .tiles--3 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (width <= 1040px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (width <= 720px) {
  .tiles--2,
  .tiles--3 {
    grid-template-columns: minmax(0, 1fr);
  }

  /* У вузькій колонці підпис блоку не влазить у той самий рядок. */
  .block__hint {
    display: none;
  }
}

@media (width <= 560px) {
  .acts {
    width: 100%;
    margin-left: 0;
  }

  .acts__btn {
    flex: 1 1 auto;
  }
}
</style>
