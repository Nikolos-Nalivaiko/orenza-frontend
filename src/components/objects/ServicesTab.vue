<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import ServiceAddDialog from '@/components/objects/ServiceAddDialog.vue'
import ServiceFactDialog from '@/components/objects/ServiceFactDialog.vue'
import ServicesBulk from '@/components/objects/ServicesBulk.vue'
import ServicesSummary from '@/components/objects/ServicesSummary.vue'
import ServicesTable from '@/components/objects/ServicesTable.vue'
import ServicesToolbar from '@/components/objects/ServicesToolbar.vue'
import ServiceWorkersDialog from '@/components/objects/ServiceWorkersDialog.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import type { ConstructionObject } from '@/lib/objects'
import {
  defaultServiceFilters,
  filterServices,
  servicesSummary,
  type ServicePayload,
  type ServiceStatus,
  type ServiceWorkerPayload,
} from '@/lib/services'
import { useEmployeesStore } from '@/stores/employees'
import { useObjectsStore } from '@/stores/objects'
import { useWorkspacesStore } from '@/stores/workspaces'

/**
 * Вкладка «Послуги»: роботи обʼєкта від «заплановано» до «виконано».
 *
 * Порядок блоків — порядок питань: скільки всього й на якій стадії → що саме
 * шукаємо → самі роботи. Правки йдуть у сховище одразу: окремої кнопки
 * «Зберегти» тут немає, бо кожна дія самостійна й дрібна.
 */

const props = defineProps<{ object: ConstructionObject }>()

const objects = useObjectsStore()
const employees = useEmployeesStore()
const workspaces = useWorkspacesStore()

/** Приватний простір: виконавців немає, а вся сума роботи — наш дохід. */
const solo = computed(() => workspaces.current?.type.value === 'personal')

const filters = ref(defaultServiceFilters())
/** Обрані роботи для масових дій; id, а не індекси — список пересортовують. */
const selected = ref<number[]>([])
const adding = ref(false)
/** Робота, якій зараз вносять факт-обсяг, і чи прийшли ми сюди з «Виконано». */
const factFor = ref<number | null>(null)
const factClosing = ref(false)
const crewFor = ref<number | null>(null)

const summary = computed(() => servicesSummary(props.object.services))
const rows = computed(() => filterServices(props.object.services, filters.value))
const isEmpty = computed(() => props.object.services.length === 0)

const factService = computed(
  () => props.object.services.find((item) => item.id === factFor.value) ?? null,
)

const crewService = computed(
  () => props.object.services.find((item) => item.id === crewFor.value) ?? null,
)

onMounted(() => {
  // У приватному просторі виконавців немає — довідник там ні до чого.
  if (!solo.value && employees.items.length === 0) {
    void employees.fetchEmployees()
  }
})

/** Вибір живе рівно доти, доки роботи на екрані: фільтр його ж і чистить. */
watch(rows, (list) => {
  selected.value = selected.value.filter((id) => list.some((row) => row.id === id))
})

function toggleStage(status: ServiceStatus): void {
  const current = filters.value.statuses

  filters.value.statuses = current.includes(status)
    ? current.filter((item) => item !== status)
    : [...current, status]
}

function pick(id: number, on: boolean): void {
  selected.value = on ? [...selected.value, id] : selected.value.filter((item) => item !== id)
}

/** Головний чекбокс бере тільки показані роботи — приховані фільтром не чіпає. */
function pickAll(on: boolean): void {
  selected.value = on ? rows.value.map((row) => row.id) : []
}

/**
 * Робота пішла в «Виконано» — одразу питаємо факт-обсяг. Статус на «готово»
 * ставлять щодня, а повертаються дозаповнити цифри майже ніколи, тож питання
 * має прозвучати тут, а не лишитись окремою справою на потім.
 */
function askFactIfDone(id: number, status: ServiceStatus): void {
  const service = props.object.services.find((item) => item.id === id)

  if (status === 'done' && service !== undefined && service.actual_volume === null) {
    factFor.value = id
    factClosing.value = true
  }
}

function setStatus(id: number, status: ServiceStatus): void {
  objects.setServiceStatus(props.object.id, [id], status)
  askFactIfDone(id, status)
}

function setStatusForSelected(status: ServiceStatus): void {
  const ids = [...selected.value]

  objects.setServiceStatus(props.object.id, ids, status)
  selected.value = []

  // Масово питати обсяг по кожній роботі — знущання; питаємо, лише якщо
  // закрили рівно одну.
  if (ids.length === 1 && ids[0] !== undefined) {
    askFactIfDone(ids[0], status)
  }
}

function openFact(id: number): void {
  factFor.value = id
  factClosing.value = false
}

function saveFact(volume: number | null): void {
  if (factFor.value !== null) {
    objects.setServiceFact(props.object.id, factFor.value, volume)
  }

  factFor.value = null
}

function saveWorkers(workers: ServiceWorkerPayload[]): void {
  if (crewFor.value !== null) {
    objects.setServiceWorkers(props.object.id, crewFor.value, workers)
  }

  crewFor.value = null
}

function remove(id: number): void {
  objects.removeService(props.object.id, id)
}

function add(payload: ServicePayload): void {
  objects.addService(props.object.id, payload)
}
</script>

<template>
  <div class="svc">
    <!-- Порожній обʼєкт: зведення з нулів і фільтри по нічому лише заважали б. -->
    <section v-if="isEmpty" class="card empty">
      <span class="empty__icon" aria-hidden="true"><AppIcon name="estimate" /></span>

      <h2 class="empty__title">Робіт ще немає</h2>

      <p class="empty__text">
        Роботи з обсягами та ціною для замовника ведуться прямо тут: стадію можна міняти одним
        дотиком просто в таблиці.
        <template v-if="!solo">
          Виконавці та їхні ставки дають собівартість, різниця — профіт із роботи.
        </template>
      </p>

      <button type="button" class="btn btn--primary btn--sm" @click="adding = true">
        <AppIcon name="plus" />
        Додати роботу
      </button>
    </section>

    <template v-else>
      <section class="card card--strip">
        <ServicesSummary
          :summary="summary"
          :statuses="filters.statuses"
          :solo="solo"
          @stage="toggleStage"
        />
      </section>

      <section class="card">
        <ServicesToolbar
          v-model="filters"
          :shown="rows.length"
          :total="object.services.length"
          :employees="employees.items"
          :solo="solo"
          @add="adding = true"
          @reset="filters = defaultServiceFilters()"
        />

        <ServicesTable
          v-if="rows.length > 0"
          :rows="rows"
          :selected="selected"
          :employees="employees.items"
          :solo="solo"
          @pick="pick"
          @all="pickAll"
          @status="setStatus"
          @fact="openFact"
          @workers="crewFor = $event"
          @remove="remove"
        />

        <p v-else class="void">
          Під цей фільтр не підпадає жодна робота.
          <button type="button" class="void__reset" @click="filters = defaultServiceFilters()">
            Показати всі
          </button>
        </p>

        <Transition name="lift">
          <ServicesBulk
            v-if="selected.length > 0"
            :count="selected.length"
            @status="setStatusForSelected"
            @clear="selected = []"
          />
        </Transition>
      </section>
    </template>

    <ServiceAddDialog
      v-if="adding"
      :employees="employees.items"
      :employees-loading="employees.isLoading"
      :solo="solo"
      @add="add"
      @close="adding = false"
    />

    <ServiceFactDialog
      v-if="factService"
      :service="factService"
      :closing="factClosing"
      @save="saveFact"
      @close="factFor = null"
    />

    <ServiceWorkersDialog
      v-if="crewService"
      :service="crewService"
      :employees="employees.items"
      :loading="employees.isLoading"
      @save="saveWorkers"
      @close="crewFor = null"
    />
  </div>
</template>

<style scoped>
.svc {
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
