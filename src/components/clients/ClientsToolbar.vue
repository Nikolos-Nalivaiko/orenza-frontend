<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'
import {
  CLIENT_SORTS,
  isDefaultClientFilters,
  type ClientCounts,
  type ClientFilters,
  type ClientKind,
} from '@/lib/clientList'

/**
 * Панель списку замовників. Фільтрів навмисно три, і кожен відповідає на
 * питання, яке власник ставить собі сам: «хто до нас повертається», «хто
 * заходив один раз» і «хто винен грошей». Скидки й дати реєстрації тут немає —
 * за нею не шукають, а місце в панелі вона займає нарівні з рештою.
 */

defineProps<{ counts: ClientCounts; shown: number }>()

const emit = defineEmits<{ reset: [] }>()

const filters = defineModel<ClientFilters>({ required: true })

/** Повторний клік по виду знімає фільтр — окремої кнопки «усі» не треба. */
function toggleKind(kind: ClientKind): void {
  filters.value.kind = filters.value.kind === kind ? 'all' : kind
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
          aria-label="Пошук замовників"
          placeholder="Імʼя, контактна особа або телефон"
        />
      </div>

      <select v-model="filters.sort" class="ctl ctl--select pick" aria-label="Сортування">
        <option v-for="option in CLIENT_SORTS" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>

    <div class="bar__row bar__row--chips">
      <button
        type="button"
        class="chip"
        :class="{ 'chip--on': filters.kind === 'regular' }"
        :aria-pressed="filters.kind === 'regular'"
        @click="toggleKind('regular')"
      >
        Постійні
        <span class="chip__count">{{ counts.regular }}</span>
      </button>

      <button
        type="button"
        class="chip"
        :class="{ 'chip--on': filters.kind === 'single' }"
        :aria-pressed="filters.kind === 'single'"
        @click="toggleKind('single')"
      >
        Разові
        <span class="chip__count">{{ counts.single }}</span>
      </button>

      <!-- Борг — не вид замовника, а стан: він вмикається поверх будь-якого. -->
      <button
        type="button"
        class="chip chip--debt"
        :class="{ 'chip--on': filters.debtOnly }"
        :aria-pressed="filters.debtOnly"
        @click="filters.debtOnly = !filters.debtOnly"
      >
        <AppIcon name="wallet" />
        Є заборгованість
        <span class="chip__count">{{ counts.debt }}</span>
      </button>

      <p class="bar__count">
        {{ shown }} з {{ counts.all }}
        <button
          v-if="!isDefaultClientFilters(filters)"
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

.chip--debt :deep(.icon) {
  width: 14px;
  height: 14px;
}

/* Борг — єдиний фільтр, який має право на червоне: це проблема, а не вид. */
.chip--debt.chip--on {
  border-color: var(--danger);
  background: var(--danger-tint);
  color: var(--danger);
}

.chip--debt.chip--on .chip__count {
  background: rgb(200 52 31 / 14%);
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
