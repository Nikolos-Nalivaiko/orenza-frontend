<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'
import {
  EMPLOYEE_SORTS,
  isDefaultEmployeeFilters,
  type EmployeeCounts,
  type EmployeeFilters,
  type EmployeeStatusFilter,
  type RoleOption,
} from '@/lib/employeeList'

/**
 * Панель довідника команди. Фільтрів чотири, і кожен відповідає на питання,
 * яке власник ставить собі сам: «хто в нас працює», «хто зараз вільний», «хто
 * у нас плиточники» і «як швидко знайти конкретну людину».
 */

defineProps<{ counts: EmployeeCounts; roles: RoleOption[]; shown: number }>()

const emit = defineEmits<{ reset: [] }>()

const filters = defineModel<EmployeeFilters>({ required: true })

/** Повторний клік по статусу повертає показ активних — це стан спокою. */
function toggleStatus(status: EmployeeStatusFilter): void {
  filters.value.status = filters.value.status === status ? 'active' : status
}
</script>

<template>
  <div class="bar">
    <div class="bar__row">
      <div class="search">
        <AppIcon name="search" class="search__icon" />
        <input
          v-model="filters.query"
          class="search__input"
          type="search"
          aria-label="Пошук співробітників"
          placeholder="Імʼя або телефон"
        />
      </div>

      <select
        v-if="roles.length > 0"
        v-model="filters.role"
        class="ctl ctl--select pick"
        aria-label="Спеціальність"
      >
        <option :value="null">Усі спеціальності</option>
        <option v-for="role in roles" :key="role.value" :value="role.value">
          {{ role.value }} · {{ role.count }}
        </option>
      </select>

      <select v-model="filters.sort" class="ctl ctl--select pick" aria-label="Сортування">
        <option v-for="option in EMPLOYEE_SORTS" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>

    <div class="bar__row bar__row--chips">
      <!-- Вільні — те, заради чого список і відкривають перед призначенням. -->
      <button
        type="button"
        class="chip chip--free"
        :class="{ 'chip--on': filters.freeOnly }"
        :aria-pressed="filters.freeOnly"
        @click="filters.freeOnly = !filters.freeOnly"
      >
        Вільні зараз
        <span class="chip__count">{{ counts.free }}</span>
      </button>

      <button
        type="button"
        class="chip"
        :class="{ 'chip--on': filters.status === 'inactive' }"
        :aria-pressed="filters.status === 'inactive'"
        @click="toggleStatus('inactive')"
      >
        Неактивні
        <span class="chip__count">{{ counts.inactive }}</span>
      </button>

      <button
        type="button"
        class="chip"
        :class="{ 'chip--on': filters.status === 'all' }"
        :aria-pressed="filters.status === 'all'"
        @click="toggleStatus('all')"
      >
        Показати всіх
        <span class="chip__count">{{ counts.all }}</span>
      </button>

      <p class="bar__count">
        {{ shown }} з {{ counts.all }}
        <button
          v-if="!isDefaultEmployeeFilters(filters)"
          type="button"
          class="bar__reset"
          @click="emit('reset')"
        >
          Скинути фільтри
        </button>
      </p>
    </div>
  </div>
</template>

<style scoped>
.bar {
  display: grid;
  gap: 10px;
}

.bar__row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.bar__row--chips {
  gap: 6px;
}

/* ── Пошук ─────────────────────────────────────────────────────── */

.search {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 260px;
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
  max-width: 220px;
  height: 40px;
  flex: none;
  border-radius: 999px;
  padding-inline: 14px 30px;
  background-position:
    right 14px center,
    right 9px center;
}

/* ── Фільтри-чипи ──────────────────────────────────────────────── */

.chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-raised);
  color: var(--ink-muted);
  font-size: 12.5px;
  font-weight: 600;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.chip:hover {
  border-color: var(--line-strong);
  color: var(--ink);
}

.chip--on {
  border-color: var(--ink);
  background: var(--ink);
  color: #fff;
}

.chip__count {
  min-width: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 11px;
  text-align: center;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

.chip--on .chip__count {
  background: rgb(255 255 255 / 18%);
  color: #fff;
}

/* Вільні — єдиний фільтр із кольором: це не вид людини, а можливість. */
.chip--free.chip--on {
  border-color: var(--brand);
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.chip--free.chip--on .chip__count {
  background: rgb(56 176 0 / 18%);
  color: var(--brand-strong);
}

.bar__count {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
  font-size: 12.5px;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.bar__reset {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  font-size: 12.5px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (width <= 640px) {
  .bar__count {
    width: 100%;
    margin-left: 0;
  }
}
</style>
