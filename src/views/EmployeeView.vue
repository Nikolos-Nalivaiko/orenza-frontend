<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import EmployeeFacts from '@/components/employees/EmployeeFacts.vue'
import EmployeeHeader from '@/components/employees/EmployeeHeader.vue'
import EmployeeNotes from '@/components/employees/EmployeeNotes.vue'
import EmployeeObjects from '@/components/employees/EmployeeObjects.vue'
import EmployeePayroll from '@/components/employees/EmployeePayroll.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import type { EmployeeForm } from '@/lib/employees'
import { todayIso } from '@/lib/objects'
import { employeeCharges, payrollTotals } from '@/lib/payroll'
import { useEmployeesStore } from '@/stores/employees'
import { useObjectsStore } from '@/stores/objects'

/**
 * Картка співробітника. Порядок вкладок — порядок питань до людини: хто це й
 * як із нею працювати → де вона задіяна → скільки на ній нараховано.
 */

type TabKey = 'overview' | 'objects' | 'payroll'

const route = useRoute()
const employees = useEmployeesStore()
const objects = useObjectsStore()

const tab = ref<TabKey>('overview')

/** День фіксуємо на час життя екрана: місяць не має мінятись опівночі. */
const today = todayIso()

const id = computed(() => Number(route.params.id))
const employee = computed(() => employees.find(id.value))

/** Нарахування — те, з чого зроблені всі три вкладки. */
const charges = computed(() => employeeCharges(objects.current, id.value))
const totals = computed(() => payrollTotals(charges.value, today))

const loading = computed(() => employees.isLoading || objects.isLoading)

const tabs = computed<{ key: TabKey; label: string; count: number | null }[]>(() => [
  { key: 'overview', label: 'Огляд', count: null },
  { key: 'objects', label: 'Обʼєкти', count: totals.value.objects },
  { key: 'payroll', label: 'Фінанси', count: null },
])

onMounted(() => {
  // Картку відкривають і прямим посиланням — тоді ще не їхало ні те, ні те.
  if (employees.items.length === 0) {
    void employees.fetchEmployees()
  }

  if (!objects.loaded) {
    void objects.fetchObjects()
  }
})

function save(form: EmployeeForm): void {
  employees.updateEmployee(id.value, form)
}

function setStatus(active: boolean): void {
  employees.setEmployeeStatus(id.value, active ? 'active' : 'inactive')
}

function setNotes(notes: string): void {
  employees.setEmployeeNotes(id.value, notes)
}
</script>

<template>
  <div class="employee">
    <p v-if="loading && employee === null" class="loading">Відкриваємо картку співробітника…</p>

    <!-- Людини немає: чужий простір, видалений запис або друкарка в адресі. -->
    <section v-else-if="employee === null" class="missing">
      <span class="missing__icon" aria-hidden="true"><AppIcon name="alert" /></span>
      <h1 class="display missing__title">Такого співробітника немає</h1>
      <p class="missing__text">Можливо, його видалили або він належить іншому робочому простору.</p>
      <RouterLink class="btn btn--ghost btn--sm" :to="{ name: 'objects' }">
        До списку обʼєктів
      </RouterLink>
    </section>

    <template v-else>
      <EmployeeHeader
        :employee="employee"
        :totals="totals"
        :today="today"
        @save="save"
        @status="setStatus"
      />

      <nav class="tabs" aria-label="Розділи картки співробітника">
        <button
          v-for="item in tabs"
          :key="item.key"
          type="button"
          class="tab"
          :class="{ 'tab--on': tab === item.key }"
          :aria-current="tab === item.key ? 'true' : undefined"
          @click="tab = item.key"
        >
          {{ item.label }}
          <span v-if="item.count" class="tab__count">{{ item.count }}</span>
        </button>
      </nav>

      <div v-if="tab === 'overview'" class="ov">
        <EmployeeNotes :notes="employee.notes" @save="setNotes" />

        <EmployeeFacts :employee="employee" :totals="totals" :today="today" />
      </div>

      <EmployeeObjects v-else-if="tab === 'objects'" :charges="charges" />

      <EmployeePayroll v-else :charges="charges" :totals="totals" :today="today" />
    </template>
  </div>
</template>

<style scoped>
.employee {
  /* Ширину міряємо по вмісту, а не по вікні: бічна панель буває розгорнутою,
     згорнутою в рейку й схованою зовсім. */
  container-type: inline-size;

  display: grid;
  gap: 16px;
  width: 100%;
}

.loading {
  padding: 40px 0;
  font-size: 13.5px;
  color: var(--ink-faint);
}

/* ── Вкладки ───────────────────────────────────────────────────── */

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-sunk);
  justify-self: start;
}

.tab {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-muted);
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  transition:
    background-color 0.2s var(--ease),
    color 0.2s var(--ease),
    box-shadow 0.2s var(--ease);
}

.tab:hover {
  color: var(--ink);
}

.tab--on {
  background: var(--paper-raised);
  color: var(--ink);
  box-shadow: var(--shadow-sm);
}

.tab__count {
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.tab--on .tab__count {
  background: var(--paper-sunk);
  color: var(--ink);
}

/* Огляд у дві колонки: опис займає всю ширину, яку йому дає екран, а
   праворуч від нього стоїть довідка. */
.ov {
  display: grid;
  align-items: start;
  gap: 12px;
}

@container (min-width: 1020px) {
  .ov {
    grid-template-columns: minmax(0, 1.7fr) minmax(300px, 0.85fr);
  }
}

/* ── Немає людини ──────────────────────────────────────────────── */

.missing {
  display: grid;
  justify-items: start;
  gap: 12px;
  width: 100%;
  max-width: 520px;
  padding: 32px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

.missing__icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 15px;
  background: var(--amber-tint);
  color: var(--amber);
}

.missing__icon :deep(.icon) {
  width: 22px;
  height: 22px;
}

.missing__title {
  font-size: clamp(20px, 2.4vw, 26px);
}

.missing__text {
  max-width: 46ch;
  font-size: 14px;
  line-height: 1.55;
  color: var(--ink-muted);
}

.missing .btn {
  margin-top: 4px;
  text-decoration: none;
}
</style>
