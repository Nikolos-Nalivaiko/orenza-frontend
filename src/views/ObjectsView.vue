<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import ObjectCard from '@/components/objects/ObjectCard.vue'
import ObjectsSkeleton from '@/components/objects/ObjectsSkeleton.vue'
import ObjectsTable from '@/components/objects/ObjectsTable.vue'
import ObjectsToolbar from '@/components/objects/ObjectsToolbar.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { todayIso } from '@/lib/objects'
import {
  buildObjectRows,
  clientsOf,
  countArchived,
  countByStatus,
  defaultObjectFilters,
  type ObjectFilters,
} from '@/lib/objectList'
import { useObjectsStore, type ObjectsView } from '@/stores/objects'

const objects = useObjectsStore()

const filters = ref<ObjectFilters>(defaultObjectFilters())

/** День фіксуємо на час життя екрана: прострочення не має мигати опівночі. */
const today = todayIso()

const items = computed(() => objects.current)
const rows = computed(() => buildObjectRows(items.value, filters.value, today))

const counts = computed(() => countByStatus(items.value))
const archived = computed(() => countArchived(items.value))
const clients = computed(() => clientsOf(items.value))

const late = computed(() => rows.value.filter((row) => row.summary.overdue).length)

/** Порожній простір і порожня вибірка — різні екрани й різні дії. */
const state = computed(() => {
  if (objects.isLoading) {
    return 'loading'
  }

  if (items.value.length === 0) {
    return 'blank'
  }

  return rows.value.length === 0 ? 'nothing' : 'list'
})

onMounted(() => {
  void objects.fetchObjects()
})

function setView(view: ObjectsView): void {
  objects.setView(view)
}

function reset(): void {
  filters.value = defaultObjectFilters()
}
</script>

<template>
  <div class="objects">
    <header class="objects__head">
      <div class="objects__intro">
        <p class="eyebrow">Обʼєкти</p>
        <h1 class="display objects__title">Будівельні обʼєкти</h1>
        <p class="objects__sub">
          Активні обʼєкти простору. Завершені лишаються в історії — вмикаються фільтром статусу.
        </p>
      </div>

      <!-- Створення — найчастіша дія на екрані, тож кнопка стоїть згори. -->
      <RouterLink class="btn btn--primary objects__new" :to="{ name: 'object-create' }">
        <AppIcon name="plus" />
        <span>Новий обʼєкт</span>
      </RouterLink>
    </header>

    <ObjectsToolbar
      v-if="state !== 'blank'"
      v-model="filters"
      :clients="clients"
      :counts="counts"
      :archived="archived"
      :view="objects.view"
      :shown="rows.length"
      :total="items.length"
      @view="setView"
      @reset="reset"
    />

    <p v-if="state === 'list' && late > 0 && !filters.overdueOnly" class="alarm">
      <AppIcon name="alert" />
      <span>
        {{ late }} обʼєкт(и) вийшли за плановий строк.
        <button type="button" class="alarm__link" @click="filters.overdueOnly = true">
          Показати тільки їх
        </button>
      </span>
    </p>

    <ObjectsSkeleton v-if="state === 'loading'" :view="objects.view" />

    <!-- У просторі ще немає жодного обʼєкта. -->
    <section v-else-if="state === 'blank'" class="blank">
      <span class="blank__icon" aria-hidden="true"><AppIcon name="building" /></span>

      <h2 class="display blank__title">Обʼєктів ще немає</h2>
      <p class="blank__text">
        Обʼєкт — це рамка для матеріалів, робіт і грошей: усе, що ви заведете далі, живе всередині
        його картки.
      </p>

      <RouterLink class="btn btn--primary btn--sm blank__cta" :to="{ name: 'object-create' }">
        <span>Створити перший обʼєкт</span>
        <svg class="btn__arrow" viewBox="0 0 18 18" aria-hidden="true">
          <path
            d="M3.5 9h11M10 4.5 14.5 9 10 13.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </RouterLink>
    </section>

    <!-- Обʼєкти є, але під фільтри не підпадає жоден. -->
    <section v-else-if="state === 'nothing'" class="nothing">
      <p class="nothing__text">
        Під ці умови не підпадає жоден обʼєкт. Спробуйте інший запит або зніміть фільтри.
      </p>
      <button type="button" class="btn btn--ghost btn--sm" @click="reset">Скинути фільтри</button>
    </section>

    <template v-else>
      <ObjectsTable v-if="objects.view === 'table'" :rows="rows" />

      <TransitionGroup v-else tag="ul" name="cards" class="grid">
        <ObjectCard v-for="row in rows" :key="row.object.id" :row="row" />
      </TransitionGroup>
    </template>
  </div>
</template>

<style scoped>
.objects {
  display: grid;
  gap: 18px;
  width: 100%;
}

.objects__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px 20px;
}

.objects__intro {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.objects__title {
  font-size: clamp(24px, 2.8vw, 34px);
}

.objects__sub {
  max-width: 68ch;
  font-size: 13.5px;
  color: var(--ink-muted);
}

.objects__new {
  margin-left: auto;
  text-decoration: none;
}

.objects__new :deep(.icon) {
  width: 17px;
  height: 17px;
}

/* Прострочене — єдине, що екран говорить сам, не чекаючи фільтра. */
.alarm {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 10px 14px;
  border: 1px solid rgb(200 52 31 / 26%);
  border-radius: var(--r-md);
  background: var(--danger-tint);
  color: var(--danger);
  font-size: 13px;
}

.alarm :deep(.icon) {
  flex: none;
  width: 16px;
  height: 16px;
}

.alarm__link {
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-size: 13px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(272px, 1fr));
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
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
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.blank__icon :deep(.icon) {
  width: 23px;
  height: 23px;
}

.blank__title {
  font-size: clamp(20px, 2.4vw, 26px);
}

.blank__text {
  max-width: 52ch;
  font-size: 14px;
  line-height: 1.55;
  color: var(--ink-muted);
}

.blank__cta {
  margin-top: 6px;
  text-decoration: none;
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
  .objects__new {
    width: 100%;
  }
}
</style>
