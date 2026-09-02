<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'
import CostSplit from '@/components/dashboard/CostSplit.vue'
import CrewPanel from '@/components/dashboard/CrewPanel.vue'
import DashboardSkeleton from '@/components/dashboard/DashboardSkeleton.vue'
import FeedPanel from '@/components/dashboard/FeedPanel.vue'
import FlowChart from '@/components/dashboard/FlowChart.vue'
import PanelCard from '@/components/dashboard/PanelCard.vue'
import PeriodSwitch from '@/components/dashboard/PeriodSwitch.vue'
import SitesPanel from '@/components/dashboard/SitesPanel.vue'
import StatTile from '@/components/dashboard/StatTile.vue'
import TasksPanel from '@/components/dashboard/TasksPanel.vue'
import { PERIODS, type Period } from '@/lib/dashboard'
import { useAuthStore } from '@/stores/auth'
import { useDashboardStore } from '@/stores/dashboard'
import { useWorkspacesStore } from '@/stores/workspaces'

const auth = useAuthStore()
const workspaces = useWorkspacesStore()
const dashboard = useDashboardStore()

// Повернення на дашборд не має заново блимати даними — вони вже в сторі.
onMounted(() => {
  if (!dashboard.hasData) {
    void dashboard.load()
  }
})

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

const periodHint = computed(
  () => PERIODS.find((item) => item.value === dashboard.period)?.hint ?? '',
)

const data = computed(() => dashboard.data)

const tasksDone = computed(() => data.value?.tasks.filter((task) => task.done).length ?? 0)

const sitesHint = computed(() => {
  const count = data.value?.sites.length ?? 0
  const late = data.value?.sites.filter((site) => site.status !== 'ok').length ?? 0

  return late === 0 ? `${count} активних` : `${count} активних · ${late} потребують уваги`
})

function setPeriod(value: Period): void {
  void dashboard.load(value)
}
</script>

<template>
  <div class="dash">
    <header class="dash__head">
      <div class="dash__text">
        <p class="eyebrow">
          <span class="dash__live" aria-hidden="true" />
          Зведення простору
        </p>
        <h1 class="display dash__title">{{ greeting }}, {{ name }}</h1>
        <p class="muted dash__sub">
          Ось що відбувається в «{{ workspaces.current?.name }}» за {{ periodHint }}.
        </p>
      </div>

      <PeriodSwitch :model-value="dashboard.period" @update:model-value="setPeriod" />
    </header>

    <DashboardSkeleton v-if="dashboard.isLoading" />

    <template v-else-if="data">
      <section class="tiles" aria-label="Ключові показники">
        <StatTile v-for="metric in data.metrics" :key="metric.key" :metric="metric" />
      </section>

      <div class="grid">
        <div class="grid__col">
          <PanelCard
            title="Рух коштів"
            hint="надходження проти витрат, ₴"
            :dim="dashboard.isRefetching"
          >
            <FlowChart :points="data.flow" />
          </PanelCard>

          <PanelCard title="Обʼєкти в роботі" :hint="sitesHint" :dim="dashboard.isRefetching" flush>
            <template #action>
              <RouterLink class="link" :to="{ name: 'objects' }">Усі обʼєкти</RouterLink>
            </template>

            <SitesPanel :sites="data.sites" />
          </PanelCard>
        </div>

        <div class="grid__col">
          <PanelCard
            title="Структура витрат"
            hint="за статтями кошторису"
            :dim="dashboard.isRefetching"
          >
            <CostSplit :slices="data.costs" />
          </PanelCard>

          <PanelCard
            title="Найближчі дедлайни"
            :hint="`${tasksDone} з ${data.tasks.length} закрито`"
          >
            <template #action>
              <RouterLink class="link" :to="{ name: 'schedule' }">Графік</RouterLink>
            </template>

            <TasksPanel :tasks="data.tasks" @toggle="dashboard.toggleTask" />
          </PanelCard>

          <PanelCard
            title="Завантаження бригад"
            hint="частка робочого часу"
            :dim="dashboard.isRefetching"
          >
            <CrewPanel :crews="data.crews" />
          </PanelCard>

          <PanelCard title="Стрічка подій" hint="останні дії в просторі">
            <FeedPanel :items="data.feed" />
          </PanelCard>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dash {
  display: grid;
  gap: 18px;
  width: 100%;
  max-width: 1420px;
  margin: 0 auto;
}

.dash__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.dash__text {
  display: grid;
  gap: 7px;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* Пульсуюча крапка: дані живі, а не знімок. */
.dash__live {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand);
  animation: pulse 2.4s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgb(56 176 0 / 50%);
  }

  70% {
    box-shadow: 0 0 0 8px rgb(56 176 0 / 0%);
  }

  100% {
    box-shadow: 0 0 0 0 rgb(56 176 0 / 0%);
  }
}

.dash__title {
  font-size: clamp(24px, 2.8vw, 34px);
}

.dash__sub {
  font-size: 14px;
}

.tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px;
}

.grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

.grid__col {
  display: grid;
  align-content: start;
  gap: 16px;
  min-width: 0;
}

.link {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-muted);
  text-decoration: none;
  border-bottom: 1px solid var(--line-strong);
  transition:
    color 0.16s var(--ease),
    border-color 0.16s var(--ease);
}

.link:hover {
  color: var(--ink);
  border-color: var(--ink);
}

@media (width <= 1040px) {
  .grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
