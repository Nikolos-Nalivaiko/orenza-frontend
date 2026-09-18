<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import ClientCreateDialog from '@/components/clients/ClientCreateDialog.vue'
import DashEvents from '@/components/dashboard/DashEvents.vue'
import DashMetrics from '@/components/dashboard/DashMetrics.vue'
import DashObjects from '@/components/dashboard/DashObjects.vue'
import ObjectPicker from '@/components/dashboard/ObjectPicker.vue'
import PanelCard from '@/components/dashboard/PanelCard.vue'
import IncomeChart from '@/components/finance/IncomeChart.vue'
import PaymentDialog from '@/components/objects/PaymentDialog.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import type { ClientForm } from '@/lib/clients'
import {
  crewAccrued,
  dashboardEvents,
  dashboardKpis,
  dashboardTotals,
  formatObjects,
  payableObjects,
  portfolio,
  UPCOMING_DAYS,
} from '@/lib/dashboard'
import type { PaymentPayload } from '@/lib/finance'
import { todayIso } from '@/lib/objects'
import { incomeByMonth } from '@/lib/workspaceFinance'
import { useAuthStore } from '@/stores/auth'
import { useObjectsStore } from '@/stores/objects'
import { useWorkspacesStore } from '@/stores/workspaces'

const router = useRouter()
const auth = useAuthStore()
const workspaces = useWorkspacesStore()
const objects = useObjectsStore()

const today = todayIso()

const items = computed(() => objects.current)

const totals = computed(() => dashboardTotals(items.value, today))

const crew = computed(() =>
  workspaces.current?.type.value === 'company' ? crewAccrued(items.value) : null,
)

const kpis = computed(() => dashboardKpis(totals.value, crew.value))
const rows = computed(() => portfolio(items.value, today))
const events = computed(() => dashboardEvents(items.value, today))
const payable = computed(() => payableObjects(items.value, today))
const income = computed(() => incomeByMonth(items.value, today, 5, 1))

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

const dateLabel = new Intl.DateTimeFormat('uk-UA', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(new Date())

const blank = computed(() => !objects.isLoading && items.value.length === 0)

const creatingClient = ref(false)
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

async function savePayment(payload: PaymentPayload): Promise<void> {
  const id = payTo.value

  payTo.value = null

  if (id !== null) {
    await objects.addPayment(id, payload)
  }
}
</script>

<template>
  <div class="dash">
    <header class="head">
      <div class="head__text">
        <p class="head__date">{{ dateLabel }}</p>
        <h1 class="head__title">{{ greeting }}, {{ name }}</h1>
      </div>

      <div class="acts">
        <button type="button" class="act" :disabled="payable.length === 0" @click="picking = true">
          <AppIcon name="wallet" />
          Платіж
        </button>
        <button type="button" class="act" @click="creatingClient = true">
          <AppIcon name="user" />
          Замовник
        </button>
        <RouterLink class="act act--primary" :to="{ name: 'object-create' }">
          <AppIcon name="plus" />
          Новий обʼєкт
        </RouterLink>
      </div>
    </header>

    <template v-if="objects.isLoading && items.length === 0">
      <span class="sk sk--strip" aria-hidden="true" />
      <div class="cols" aria-hidden="true">
        <span class="sk sk--main" />
        <span class="sk sk--side" />
      </div>
    </template>

    <section v-else-if="blank" class="blank">
      <span class="blank__icon" aria-hidden="true"><AppIcon name="building" /></span>

      <h2 class="blank__title">Простір поки порожній</h2>
      <p class="blank__text">
        Дашборд збирається сам — із обʼєктів: гроші, дедлайни й платежі приходять із їхніх карток.
        Заведіть перший обʼєкт, і зведення зʼявиться тут.
      </p>

      <RouterLink class="act act--primary" :to="{ name: 'object-create' }">
        <AppIcon name="plus" />
        Створити обʼєкт
      </RouterLink>
    </section>

    <template v-else>
      <DashMetrics :kpis="kpis" />

      <div class="cols">
        <div class="col">
          <PanelCard
            title="Обʼєкти в роботі"
            :hint="`${formatObjects(totals.active)} · найтерміновіші зверху`"
            flush
          >
            <template #action>
              <RouterLink class="link" :to="{ name: 'objects' }">Усі обʼєкти</RouterLink>
            </template>

            <DashObjects v-if="rows.length > 0" :rows="rows" />
            <p v-else class="empty empty--pad">
              Активних обʼєктів немає — усі або завершені, або в архіві.
            </p>
          </PanelCard>

          <IncomeChart :months="income" :height="170" />
        </div>

        <div class="col">
          <PanelCard
            v-if="events.alarm.length > 0"
            title="Потребує уваги"
            :hint="
              events.alarmAmount > 0
                ? `${formatAmount(events.alarmAmount)} ₴ не надійшло вчасно`
                : 'дати вже минули'
            "
          >
            <template #action>
              <span class="count">{{ events.alarm.length }}</span>
            </template>

            <DashEvents :events="events.alarm" />
          </PanelCard>

          <PanelCard
            :title="`Найближчі ${UPCOMING_DAYS} днів`"
            hint="початок робіт, здачі й платежі"
          >
            <template #action>
              <RouterLink class="link" :to="{ name: 'schedule' }">Графік</RouterLink>
            </template>

            <DashEvents v-if="events.upcoming.length > 0" :events="events.upcoming" grouped />
            <p v-else class="empty">На тиждень уперед подій немає.</p>
          </PanelCard>
        </div>
      </div>
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
.dash {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
  width: 100%;
  max-width: 1420px;
  margin: 0 auto;
}

.head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 16px;
  padding-bottom: 6px;
}

.head__text {
  display: grid;
  gap: 4px;
}

.head__date {
  font-size: 12.5px;
  color: var(--ink-faint);
}

.head__date::first-letter {
  text-transform: uppercase;
}

.head__title {
  font-family: var(--font-display);
  font-size: clamp(20px, 2vw, 24px);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.15;
}

.acts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.act {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  padding: 0 14px;
  border: 1px solid var(--line-strong);
  border-radius: 10px;
  background: var(--paper-raised);
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease);
}

.act:hover:not(:disabled) {
  border-color: var(--ink-muted);
}

.act:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.act :deep(.icon) {
  width: 15px;
  height: 15px;
  color: var(--ink-muted);
}

.act--primary {
  border-color: var(--brand);
  background: var(--brand);
  color: var(--on-brand);
}

.act--primary :deep(.icon) {
  color: var(--on-brand);
}

.act--primary:hover:not(:disabled) {
  border-color: var(--brand-soft);
  background: var(--brand-soft);
}

.cols {
  display: grid;
  grid-template-columns: minmax(0, 1.75fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.col {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 16px;
}

.link {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-muted);
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.16s var(--ease);
}

.link::after {
  content: ' →';
}

.link:hover {
  color: var(--ink);
}

.count {
  display: inline-grid;
  place-items: center;
  min-width: 22px;
  height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  background: var(--danger-tint);
  color: var(--danger);
  font-size: 12px;
  font-weight: 700;
}

.empty {
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink-muted);
}

.empty--pad {
  padding: 0 22px 22px;
}

.sk {
  display: block;
  border-radius: var(--r-md);
  background: linear-gradient(
    90deg,
    var(--paper-sunk) 0%,
    var(--paper-raised) 50%,
    var(--paper-sunk) 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

.sk--strip {
  height: 112px;
}

.sk--main {
  height: 420px;
}

.sk--side {
  height: 320px;
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
  padding: 28px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-md);
  background: var(--paper-raised);
}

.blank__icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.blank__icon :deep(.icon) {
  width: 21px;
  height: 21px;
}

.blank__title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.03em;
}

.blank__text {
  max-width: 52ch;
  font-size: 14px;
  line-height: 1.55;
  color: var(--ink-muted);
}

@media (width <= 1080px) {
  .cols {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (width <= 560px) {
  .acts {
    width: 100%;
  }

  .act {
    flex: 1 1 auto;
    justify-content: center;
  }
}
</style>
