<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'
import type { Employee } from '@/lib/employees'
import { isDefaultServiceFilters, SERVICE_SORTS, type ServiceFilters } from '@/lib/services'

/**
 * Пошук, виконавець і сортування. Стадії сюди не йдуть — вони вже стоять у
 * зведенні над таблицею й фільтрують звідти.
 *
 * Фільтр за виконавцем відповідає на питання «де зайнятий Петров» — це
 * найближче, що є до завантаження людини, поки немає розділу співробітників.
 */

defineProps<{
  shown: number
  total: number
  /** Довідник простору: у приватному його немає, тож і фільтра теж. */
  employees: Employee[]
  solo: boolean
}>()

const emit = defineEmits<{ add: []; reset: [] }>()

const filters = defineModel<ServiceFilters>({ required: true })
</script>

<template>
  <div class="bar">
    <div class="search">
      <AppIcon name="search" class="search__icon" />
      <input
        v-model="filters.query"
        class="search__input"
        type="search"
        aria-label="Пошук роботи за назвою"
        placeholder="Назва роботи"
      />
    </div>

    <select
      v-if="!solo && employees.length > 0"
      v-model="filters.employeeId"
      class="ctl ctl--select pick"
      aria-label="Виконавець"
    >
      <option :value="null">Усі виконавці</option>
      <option v-for="employee in employees" :key="employee.id" :value="employee.id">
        {{ employee.name }}
      </option>
    </select>

    <select v-model="filters.sort" class="ctl ctl--select pick" aria-label="Сортування">
      <option v-for="option in SERVICE_SORTS" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <p class="count">
      {{ shown }} з {{ total }}
      <button
        v-if="!isDefaultServiceFilters(filters)"
        type="button"
        class="count__reset"
        @click="emit('reset')"
      >
        Скинути
      </button>
    </p>

    <button type="button" class="add" @click="emit('add')">
      <AppIcon name="plus" />
      Додати роботу
    </button>
  </div>
</template>

<style scoped>
.bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.search {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 200px;
  min-width: 0;
}

.search__icon {
  position: absolute;
  left: 12px;
  width: 16px;
  height: 16px;
  color: var(--ink-faint);
  pointer-events: none;
}

.search__input {
  width: 100%;
  min-width: 0;
  height: 40px;
  padding: 0 12px 0 36px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-raised);
  font-size: 13.5px;
  outline: none;
  transition:
    border-color 0.16s var(--ease),
    box-shadow 0.16s var(--ease);
}

.search__input:hover {
  border-color: var(--line-strong);
}

.search__input:focus {
  border-color: rgb(56 176 0 / 55%);
  box-shadow: 0 0 0 3px var(--brand-glow);
}

.search__input::placeholder {
  color: var(--ink-faint);
}

.pick {
  width: auto;
  max-width: 200px;
  height: 40px;
  flex: none;
  border-radius: 999px;
  padding-inline: 14px 30px;
  background-position:
    right 14px center,
    right 9px center;
}

.count {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
  font-size: 12.5px;
  color: var(--ink-faint);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.count__reset {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  font-size: 12.5px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* Додавання — найчастіша дія на цій вкладці, тож кнопка стоїть у рядку
   фільтрів, а не десь під таблицею. */
.add {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 40px;
  padding: 0 16px 0 12px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  transition: background-color 0.18s var(--ease);
}

.add:hover {
  background: var(--ink-soft);
}

.add :deep(.icon) {
  width: 15px;
  height: 15px;
}

@media (width <= 720px) {
  .count {
    order: 5;
    width: 100%;
    margin-left: 0;
  }

  .add {
    order: 6;
  }
}
</style>
