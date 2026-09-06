<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import EmployeeCreateDialog from '@/components/employees/EmployeeCreateDialog.vue'
import EmployeesTable from '@/components/employees/EmployeesTable.vue'
import EmployeesToolbar from '@/components/employees/EmployeesToolbar.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import type { EmployeeForm } from '@/lib/employees'
import {
  applyEmployeeFilters,
  countEmployees,
  defaultEmployeeFilters,
  employeeRoles,
  employeeRows,
  type EmployeeFilters,
} from '@/lib/employeeList'
import { todayIso } from '@/lib/objects'
import { useEmployeesStore } from '@/stores/employees'
import { useObjectsStore } from '@/stores/objects'

/**
 * Довідник команди. Список один і той самий, таблицею: у людини немає ні
 * фото, ні статусу-обкладинки — є телефон, спеціальність і завантаження, а їх
 * порівнюють по колонках.
 *
 * За замовчуванням зверху стоять вільні: найчастіше сюди заходять не читати
 * список, а вибрати, кого поставити на нову роботу.
 */

const router = useRouter()
const employees = useEmployeesStore()
const objects = useObjectsStore()

const filters = ref<EmployeeFilters>(defaultEmployeeFilters())
const creating = ref(false)

/** День фіксуємо на час життя екрана: місяць не має мінятись опівночі. */
const today = todayIso()

const all = computed(() => employeeRows(employees.items, objects.current, today))
const rows = computed(() => applyEmployeeFilters(all.value, filters.value))

const counts = computed(() => countEmployees(all.value))
const roles = computed(() => employeeRoles(all.value))

const loading = computed(() => employees.isLoading || objects.isLoading)

/** Порожній простір і порожня вибірка — різні екрани й різні дії. */
const state = computed(() => {
  if (loading.value && employees.items.length === 0) {
    return 'loading'
  }

  if (all.value.length === 0) {
    return 'blank'
  }

  return rows.value.length === 0 ? 'nothing' : 'list'
})

onMounted(() => {
  if (employees.items.length === 0) {
    void employees.fetchEmployees()
  }

  if (!objects.loaded) {
    void objects.fetchObjects()
  }
})

function reset(): void {
  filters.value = defaultEmployeeFilters()
}

/**
 * Заведену людину одразу відкриваємо: далі в ній пишуть, як із нею працювати,
 * і дивляться завантаження — а це вже картка.
 */
function create(form: EmployeeForm): void {
  const employee = employees.createEmployee(form)

  void router.push({ name: 'employee', params: { id: employee.id } })
}
</script>

<template>
  <div class="team">
    <header class="team__head">
      <div class="team__intro">
        <p class="eyebrow">Команда</p>
        <h1 class="display team__title">Співробітники</h1>
        <p class="team__sub">
          Усі, хто працює на обʼєктах простору: контакти під рукою, завантаження — на видноті.
        </p>
      </div>

      <button type="button" class="btn btn--primary team__new" @click="creating = true">
        <AppIcon name="plus" />
        <span>Новий співробітник</span>
      </button>
    </header>

    <EmployeesToolbar
      v-if="state !== 'blank' && state !== 'loading'"
      v-model="filters"
      :counts="counts"
      :roles="roles"
      :shown="rows.length"
      @reset="reset"
    />

    <!-- Вільні руки — те, заради чого довідник найчастіше й відкривають. -->
    <p v-if="state === 'list' && counts.free > 0 && !filters.freeOnly" class="hint">
      <AppIcon name="user" />
      <span>
        Вільних зараз — <strong>{{ counts.free }}</strong> із {{ counts.active }} активних.
        <button type="button" class="hint__link" @click="filters.freeOnly = true">
          Показати тільки їх
        </button>
      </span>
    </p>

    <p v-if="state === 'loading'" class="loading">Завантажуємо команду…</p>

    <!-- У просторі ще немає жодної людини. -->
    <section v-else-if="state === 'blank'" class="blank">
      <span class="blank__icon" aria-hidden="true"><AppIcon name="team" /></span>

      <h2 class="display blank__title">Співробітників ще немає</h2>
      <p class="blank__text">
        Людина зʼявляється сама, щойно ви призначите її виконавцем у роботі обʼєкта. Але завести
        контакт можна й заздалегідь — коли найняли, а обʼєкта під неї ще немає.
      </p>

      <button type="button" class="btn btn--primary btn--sm blank__cta" @click="creating = true">
        Завести людину
      </button>
    </section>

    <!-- Люди є, але під фільтри не підпадає жодна. -->
    <section v-else-if="state === 'nothing'" class="nothing">
      <p class="nothing__text">
        Під ці умови не підпадає жоден співробітник. Спробуйте інший запит або зніміть фільтри.
      </p>
      <button type="button" class="btn btn--ghost btn--sm" @click="reset">Скинути фільтри</button>
    </section>

    <EmployeesTable v-else :rows="rows" :today="today" />

    <EmployeeCreateDialog v-if="creating" @create="create" @close="creating = false" />
  </div>
</template>

<style scoped>
.team {
  display: grid;
  gap: 18px;
  width: 100%;
}

.team__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px 20px;
}

.team__intro {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.team__title {
  font-size: clamp(24px, 2.8vw, 34px);
}

.team__sub {
  max-width: 68ch;
  font-size: 13.5px;
  color: var(--ink-muted);
}

.team__new {
  margin-left: auto;
}

.team__new :deep(.icon) {
  width: 17px;
  height: 17px;
}

.loading {
  padding: 40px 0;
  font-size: 13.5px;
  color: var(--ink-faint);
}

.hint {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-raised);
  font-size: 13px;
  color: var(--ink-muted);
}

.hint :deep(.icon) {
  flex: none;
  width: 16px;
  height: 16px;
  color: var(--ink-faint);
}

.hint strong {
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.hint__link {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
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
  background: var(--paper-sunk);
  color: var(--ink-muted);
}

.blank__icon :deep(.icon) {
  width: 23px;
  height: 23px;
}

.blank__title {
  font-size: clamp(20px, 2.4vw, 26px);
}

.blank__text {
  max-width: 56ch;
  font-size: 14px;
  line-height: 1.55;
  color: var(--ink-muted);
}

.blank__cta {
  margin-top: 6px;
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

@media (width <= 560px) {
  .team__new {
    width: 100%;
  }
}
</style>
