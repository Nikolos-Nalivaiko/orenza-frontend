<script setup lang="ts">
import ClientFilter from '@/components/objects/ClientFilter.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { OBJECT_STATUSES, type ObjectStatus } from '@/lib/objects'
import {
  isDefaultFilters,
  OBJECT_SORTS,
  type ClientOption,
  type ObjectFilters,
} from '@/lib/objectList'
import type { ObjectsView } from '@/stores/objects'

defineProps<{
  /** Замовники, у яких справді є обʼєкти. */
  clients: ClientOption[]
  counts: Record<ObjectStatus, number>
  view: ObjectsView
  shown: number
  total: number
}>()

const emit = defineEmits<{ view: [ObjectsView]; reset: [] }>()

const filters = defineModel<ObjectFilters>({ required: true })

/** Порожній список статусів — це «усі»: так знімається фільтр цілком. */
function toggleStatus(value: ObjectStatus): void {
  const current = filters.value.statuses

  filters.value.statuses = current.includes(value)
    ? current.filter((status) => status !== value)
    : [...current, value]
}

function isOn(value: ObjectStatus): boolean {
  return filters.value.statuses.includes(value)
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
          aria-label="Пошук обʼєктів"
          placeholder="Назва, адреса або замовник"
        />
      </div>

      <select v-model="filters.sort" class="ctl ctl--select pick" aria-label="Сортування">
        <option v-for="option in OBJECT_SORTS" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>

      <ClientFilter v-model="filters.clientId" :clients="clients" :total="total" />

      <!-- Перемикач подання: таблиця для порівняння, картки для перегляду. -->
      <div class="view" role="group" aria-label="Вигляд списку">
        <button
          type="button"
          class="view__btn"
          :class="{ 'view__btn--on': view === 'table' }"
          :aria-pressed="view === 'table'"
          title="Таблицею"
          @click="emit('view', 'table')"
        >
          <AppIcon name="menu" />
        </button>
        <button
          type="button"
          class="view__btn"
          :class="{ 'view__btn--on': view === 'cards' }"
          :aria-pressed="view === 'cards'"
          title="Картками"
          @click="emit('view', 'cards')"
        >
          <AppIcon name="dashboard" />
        </button>
      </div>
    </div>

    <div class="bar__row bar__row--chips">
      <button
        v-for="status in OBJECT_STATUSES"
        :key="status.value"
        type="button"
        class="chip"
        :class="{ 'chip--on': isOn(status.value) }"
        :aria-pressed="isOn(status.value)"
        @click="toggleStatus(status.value)"
      >
        {{ status.label }}
        <span class="chip__count">{{ counts[status.value] }}</span>
      </button>

      <button
        type="button"
        class="chip chip--late"
        :class="{ 'chip--on': filters.overdueOnly }"
        :aria-pressed="filters.overdueOnly"
        @click="filters.overdueOnly = !filters.overdueOnly"
      >
        <AppIcon name="alert" />
        Тільки прострочені
      </button>

      <p class="bar__count">
        {{ shown }} з {{ total }}
        <button
          v-if="!isDefaultFilters(filters)"
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
  height: 40px;
  flex: none;
  border-radius: 999px;
  padding-inline: 14px 30px;
  background-position:
    right 14px center,
    right 9px center;
}

/* ── Подання ───────────────────────────────────────────────────── */

.view {
  display: flex;
  gap: 2px;
  padding: 3px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-sunk);
}

.view__btn {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-faint);
  transition:
    background-color 0.18s var(--ease),
    color 0.18s var(--ease),
    box-shadow 0.18s var(--ease);
}

.view__btn :deep(.icon) {
  width: 16px;
  height: 16px;
}

.view__btn--on {
  background: var(--paper-raised);
  color: var(--ink);
  box-shadow: var(--shadow-sm);
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
  border-color: var(--brand);
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.chip__count {
  min-width: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 11px;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.chip--on .chip__count {
  background: rgb(56 176 0 / 18%);
}

.chip--late :deep(.icon) {
  width: 14px;
  height: 14px;
}

.chip--late.chip--on {
  border-color: var(--danger);
  background: var(--danger-tint);
  color: var(--danger);
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
