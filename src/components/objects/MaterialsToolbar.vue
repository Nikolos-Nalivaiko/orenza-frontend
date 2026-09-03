<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'
import {
  isDefaultMaterialFilters,
  MATERIAL_BUYER_LABELS,
  MATERIAL_SORTS,
  type MaterialFilters,
} from '@/lib/materials'

/**
 * Пошук, «хто купує» й сортування. Стадії закупівлі сюди не йдуть — вони вже
 * стоять у зведенні над таблицею й фільтрують звідти: один і той самий фільтр
 * у двох місцях однаково збиває.
 */

defineProps<{ shown: number; total: number }>()

const emit = defineEmits<{ add: []; reset: [] }>()

const filters = defineModel<MaterialFilters>({ required: true })
</script>

<template>
  <div class="bar">
    <div class="search">
      <AppIcon name="search" class="search__icon" />
      <input
        v-model="filters.query"
        class="search__input"
        type="search"
        aria-label="Пошук матеріалу за назвою"
        placeholder="Назва матеріалу"
      />
    </div>

    <select v-model="filters.buyer" class="ctl ctl--select pick" aria-label="Хто купує">
      <option :value="null">Купують усі</option>
      <option v-for="(label, value) in MATERIAL_BUYER_LABELS" :key="value" :value="value">
        Купує: {{ label.toLowerCase() }}
      </option>
    </select>

    <select v-model="filters.sort" class="ctl ctl--select pick" aria-label="Сортування">
      <option v-for="option in MATERIAL_SORTS" :key="option.value" :value="option.value">
        {{ option.label }}
      </option>
    </select>

    <p class="count">
      {{ shown }} з {{ total }}
      <button
        v-if="!isDefaultMaterialFilters(filters)"
        type="button"
        class="count__reset"
        @click="emit('reset')"
      >
        Скинути
      </button>
    </p>

    <button type="button" class="add" @click="emit('add')">
      <AppIcon name="plus" />
      Додати матеріал
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
  flex: 1 1 220px;
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
   фільтрів, а не десь під таблицею на 60 позицій нижче. */
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
