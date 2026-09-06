<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ObjectCard from '@/components/objects/ObjectCard.vue'
import ObjectsTable from '@/components/objects/ObjectsTable.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import type { ConstructionObject } from '@/lib/objects'
import { buildObjectRows, defaultObjectFilters } from '@/lib/objectList'
import { useObjectsStore } from '@/stores/objects'

/**
 * Вкладка «Обʼєкти» замовника — той самий список, що й у розділі обʼєктів, з
 * єдиною відмінністю: фільтр «замовник» тут уже стоїть і не знімається.
 * Новий UI тут був би зайвим: людина вже знає ці картки й цю таблицю, а нам
 * не доводиться підтримувати другий список.
 */

const props = defineProps<{
  /** Обʼєкти саме цього замовника — фільтр уже застосовано. */
  items: ConstructionObject[]
  clientId: number
  today: string
}>()

const objects = useObjectsStore()

/** Архів лежить окремо — так само, як у загальному списку. */
const archived = ref(false)

const rows = computed(() =>
  buildObjectRows(
    props.items,
    // Статуси не звужуємо: у картці замовника показуємо все, що в нього є,
    // включно із завершеним — саме за цим сюди й заходять.
    { ...defaultObjectFilters(), statuses: [], clientId: props.clientId, archived: archived.value },
    props.today,
  ),
)

const inArchive = computed(() => props.items.filter((item) => item.archived_at !== null).length)
</script>

<template>
  <section class="cobjects">
    <header class="cobjects__head">
      <h2 class="cobjects__title">
        {{ archived ? 'Архів замовника' : 'Обʼєкти замовника' }}
        <span class="cobjects__count">{{ rows.length }}</span>
      </h2>

      <div class="cobjects__tools">
        <!-- Обʼєкт створюють прямо звідси: замовник у формі вже стоятиме. -->
        <RouterLink
          class="btn btn--primary btn--sm cobjects__new"
          :to="{ name: 'object-create', query: { client: clientId } }"
        >
          <AppIcon name="plus" />
          <span>Новий обʼєкт</span>
        </RouterLink>

        <button
          v-if="inArchive > 0"
          type="button"
          class="toggle"
          :class="{ 'toggle--on': archived }"
          :aria-pressed="archived"
          @click="archived = !archived"
        >
          Архів
          <span class="toggle__count">{{ inArchive }}</span>
        </button>

        <div class="view" role="group" aria-label="Вигляд списку">
          <button
            type="button"
            class="view__btn"
            :class="{ 'view__btn--on': objects.view === 'table' }"
            :aria-pressed="objects.view === 'table'"
            title="Таблицею"
            @click="objects.setView('table')"
          >
            <AppIcon name="menu" />
          </button>
          <button
            type="button"
            class="view__btn"
            :class="{ 'view__btn--on': objects.view === 'cards' }"
            :aria-pressed="objects.view === 'cards'"
            title="Картками"
            @click="objects.setView('cards')"
          >
            <AppIcon name="dashboard" />
          </button>
        </div>
      </div>
    </header>

    <p v-if="rows.length === 0" class="empty">
      <template v-if="archived">У цього замовника немає архівних обʼєктів.</template>
      <template v-else>
        За цим замовником ще немає жодного обʼєкта. Створіть перший — знижка й контакти
        підставляться у форму самі.
      </template>
    </p>

    <template v-else>
      <ObjectsTable v-if="objects.view === 'table'" :rows="rows" />

      <TransitionGroup v-else tag="ul" name="cards" class="grid">
        <ObjectCard v-for="row in rows" :key="row.object.id" :row="row" />
      </TransitionGroup>
    </template>
  </section>
</template>

<style scoped>
.cobjects {
  display: grid;
  gap: 14px;
}

.cobjects__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.cobjects__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.cobjects__count {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 11px;
  text-align: center;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

.cobjects__tools {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.cobjects__new {
  text-decoration: none;
}

.cobjects__new :deep(.icon) {
  width: 15px;
  height: 15px;
}

.toggle {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 42px;
  padding: 0 14px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-muted);
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.toggle:hover {
  border-color: var(--ink);
  color: var(--ink);
}

.toggle--on {
  border-color: transparent;
  background: var(--ink);
  color: #fff;
}

.toggle__count {
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--paper-sunk);
  color: var(--ink-muted);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

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
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-faint);
  transition:
    background-color 0.18s var(--ease),
    color 0.18s var(--ease),
    box-shadow 0.18s var(--ease);
}

.view__btn:hover {
  color: var(--ink);
}

.view__btn--on {
  background: var(--paper-raised);
  color: var(--ink);
  box-shadow: var(--shadow-sm);
}

.view__btn :deep(.icon) {
  width: 16px;
  height: 16px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(272px, 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.empty {
  max-width: 62ch;
  padding: 22px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-md);
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink-muted);
}

.cards-enter-active,
.cards-leave-active {
  transition:
    opacity 0.24s var(--ease),
    transform 0.24s var(--ease);
}

.cards-enter-from,
.cards-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

.cards-leave-active {
  position: absolute;
}

.cards-move {
  transition: transform 0.28s var(--ease);
}

@media (width <= 560px) {
  .cobjects__new {
    flex: 1;
  }
}
</style>
