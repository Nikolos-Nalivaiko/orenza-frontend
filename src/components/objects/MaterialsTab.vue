<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MaterialAddDialog from '@/components/objects/MaterialAddDialog.vue'
import MaterialsBulk from '@/components/objects/MaterialsBulk.vue'
import MaterialsSummary from '@/components/objects/MaterialsSummary.vue'
import MaterialsTable from '@/components/objects/MaterialsTable.vue'
import MaterialsToolbar from '@/components/objects/MaterialsToolbar.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import {
  defaultMaterialFilters,
  filterMaterials,
  materialsSummary,
  type MaterialPayload,
  type MaterialStatus,
} from '@/lib/materials'
import type { ConstructionObject } from '@/lib/objects'
import { useObjectsStore } from '@/stores/objects'

/**
 * Вкладка «Матеріали»: закупівлі обʼєкта від «потрібно» до «використано».
 *
 * Порядок блоків — порядок питань: скільки всього й на якій стадії → що саме
 * шукаємо → самі позиції. Правки йдуть у сховище одразу: окремої кнопки
 * «Зберегти» тут немає, бо кожна дія тут самостійна й дрібна.
 */

const props = defineProps<{ object: ConstructionObject }>()

const objects = useObjectsStore()

const filters = ref(defaultMaterialFilters())
/** Обрані позиції для масових дій; id, а не індекси — список пересортовують. */
const selected = ref<number[]>([])
const adding = ref(false)

const summary = computed(() => materialsSummary(props.object.materials))
const rows = computed(() => filterMaterials(props.object.materials, filters.value))
const isEmpty = computed(() => props.object.materials.length === 0)

/** Вибір живе рівно доти, доки позиції на екрані: фільтр його ж і чистить. */
watch(rows, (list) => {
  selected.value = selected.value.filter((id) => list.some((row) => row.id === id))
})

function toggleStage(status: MaterialStatus): void {
  const current = filters.value.statuses

  filters.value.statuses = current.includes(status)
    ? current.filter((item) => item !== status)
    : [...current, status]
}

function pick(id: number, on: boolean): void {
  selected.value = on ? [...selected.value, id] : selected.value.filter((item) => item !== id)
}

/** Головний чекбокс бере тільки показані позиції — приховані фільтром не чіпає. */
function pickAll(on: boolean): void {
  selected.value = on ? rows.value.map((row) => row.id) : []
}

function setStatus(id: number, status: MaterialStatus): void {
  objects.setMaterialStatus(props.object.id, [id], status)
}

function setStatusForSelected(status: MaterialStatus): void {
  objects.setMaterialStatus(props.object.id, selected.value, status)
  selected.value = []
}

function approve(id: number, on: boolean): void {
  objects.setMaterialApproved(props.object.id, id, on)
}

function remove(id: number): void {
  objects.removeMaterial(props.object.id, id)
}

function add(payload: MaterialPayload): void {
  objects.addMaterial(props.object.id, payload)
}
</script>

<template>
  <div class="mat">
    <!-- Порожній обʼєкт: зведення з нулів і фільтри по нічому лише заважали б. -->
    <section v-if="isEmpty" class="card empty">
      <span class="empty__icon" aria-hidden="true"><AppIcon name="box" /></span>

      <h2 class="empty__title">Закупівель ще немає</h2>

      <p class="empty__text">
        Список закупівель ведеться прямо тут: що потрібно, що вже замовлено й що лежить на
        майданчику. Стадію позиції можна міняти одним дотиком просто в таблиці.
      </p>

      <button type="button" class="btn btn--primary btn--sm" @click="adding = true">
        <AppIcon name="plus" />
        Додати матеріал
      </button>
    </section>

    <template v-else>
      <section class="card card--strip">
        <MaterialsSummary :summary="summary" :statuses="filters.statuses" @stage="toggleStage" />
      </section>

      <section class="card">
        <MaterialsToolbar
          v-model="filters"
          :shown="rows.length"
          :total="object.materials.length"
          @add="adding = true"
          @reset="filters = defaultMaterialFilters()"
        />

        <MaterialsTable
          v-if="rows.length > 0"
          :rows="rows"
          :selected="selected"
          @pick="pick"
          @all="pickAll"
          @status="setStatus"
          @approve="approve"
          @remove="remove"
        />

        <p v-else class="void">
          Під цей фільтр не підпадає жодна позиція.
          <button type="button" class="void__reset" @click="filters = defaultMaterialFilters()">
            Показати всі
          </button>
        </p>

        <Transition name="lift">
          <MaterialsBulk
            v-if="selected.length > 0"
            :count="selected.length"
            @status="setStatusForSelected"
            @clear="selected = []"
          />
        </Transition>
      </section>
    </template>

    <MaterialAddDialog v-if="adding" @add="add" @close="adding = false" />
  </div>
</template>

<style scoped>
.mat {
  display: grid;
  gap: 16px;
}

.card {
  display: grid;
  gap: 20px;
  padding: 24px 26px;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

/* Зведення — тонка смуга, а не плашки як у фінансах: тут це підпис до
   таблиці під ним, а не самостійні показники. */
.card--strip {
  padding: 18px 26px;
}

.void {
  padding: 28px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-md);
  font-size: 13px;
  color: var(--ink-muted);
}

.void__reset {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* ── Порожньо ──────────────────────────────────────────────────── */

.empty {
  justify-items: start;
  gap: 14px;
  padding: 36px;
}

.empty__icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.empty__icon :deep(.icon) {
  width: 21px;
  height: 21px;
}

.empty__title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.empty__text {
  max-width: 62ch;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--ink-muted);
}

.empty .btn :deep(.icon) {
  width: 15px;
  height: 15px;
}

.lift-enter-active,
.lift-leave-active {
  transition:
    opacity 0.2s var(--ease),
    transform 0.2s var(--ease);
}

.lift-enter-from,
.lift-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
