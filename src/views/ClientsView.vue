<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import ClientCreateDialog from '@/components/clients/ClientCreateDialog.vue'
import ClientDeleteDialog from '@/components/clients/ClientDeleteDialog.vue'
import ClientsTable from '@/components/clients/ClientsTable.vue'
import ClientsToolbar from '@/components/clients/ClientsToolbar.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import type { ClientForm } from '@/lib/clients'
import {
  applyClientFilters,
  clientRows,
  countClients,
  defaultClientFilters,
  totalDue,
  type ClientFilters,
  type ClientRow,
} from '@/lib/clientList'
import { todayIso } from '@/lib/objects'
import { useObjectsStore } from '@/stores/objects'

const router = useRouter()
const objects = useObjectsStore()

const filters = ref<ClientFilters>(defaultClientFilters())
const creating = ref(false)

const removing = ref<ClientRow | null>(null)
const deleting = ref(false)

const today = todayIso()

const all = computed(() => clientRows(objects.clients, objects.current, today))
const rows = computed(() => applyClientFilters(all.value, filters.value))

const counts = computed(() => countClients(all.value))
const debt = computed(() => totalDue(all.value))

const loading = computed(() => objects.isLoading || objects.isLoadingClients)

const state = computed(() => {
  if (loading.value && objects.clients.length === 0) {
    return 'loading'
  }

  if (all.value.length === 0) {
    return 'blank'
  }

  return rows.value.length === 0 ? 'nothing' : 'list'
})

onMounted(() => {
  if (!objects.loaded) {
    void objects.fetchObjects()
  }

  if (objects.clients.length === 0) {
    void objects.fetchClients()
  }
})

function reset(): void {
  filters.value = defaultClientFilters()
}

async function create(form: ClientForm): Promise<void> {
  const client = await objects.createClient(form)

  if (client === null) {
    return
  }

  creating.value = false
  await router.push({ name: 'client', params: { id: client.id } })
}

function askRemove(row: ClientRow): void {
  objects.reset()
  removing.value = row
}

async function remove(): Promise<void> {
  const row = removing.value

  if (row === null || deleting.value) {
    return
  }

  deleting.value = true

  const done = await objects.deleteClient(row.client.id)

  deleting.value = false

  if (done) {
    removing.value = null
  }
}

function closeRemove(): void {
  removing.value = null
  objects.reset()
}
</script>

<template>
  <div class="clients">
    <header class="clients__head">
      <div class="clients__intro">
        <p class="eyebrow">Замовники</p>
        <h1 class="display clients__title">Замовники простору</h1>
        <p class="clients__sub">
          Усі, з ким працювали чи працюємо: контакти під рукою, борги — на видноті.
        </p>
      </div>

      <button type="button" class="btn btn--primary clients__new" @click="creating = true">
        <AppIcon name="plus" />
        <span>Новий замовник</span>
      </button>
    </header>

    <ClientsToolbar
      v-if="state !== 'blank' && state !== 'loading'"
      v-model="filters"
      :counts="counts"
      :shown="rows.length"
      @reset="reset"
    />

    <!-- Одна цифра, заради якої в довідник заходять частіше за все. -->
    <p v-if="state === 'list' && counts.debt > 0 && !filters.debtOnly" class="alarm">
      <AppIcon name="wallet" />
      <span>
        {{ counts.debt }} з {{ counts.all }} замовників винні
        <strong>{{ formatAmount(debt) }} ₴</strong> разом.
        <button type="button" class="alarm__link" @click="filters.debtOnly = true">
          Показати тільки їх
        </button>
      </span>
    </p>

    <p v-if="state === 'loading'" class="loading">Завантажуємо замовників…</p>

    <!-- У просторі ще немає жодного замовника. -->
    <section v-else-if="state === 'blank'" class="blank">
      <span class="blank__icon" aria-hidden="true"><AppIcon name="user" /></span>

      <h2 class="display blank__title">Замовників ще немає</h2>
      <p class="blank__text">
        Замовник зʼявляється сам, щойно ви вкажете його у формі обʼєкта. Але контакт можна занести й
        заздалегідь — коли домовились, а будувати ще не почали.
      </p>

      <button type="button" class="btn btn--primary btn--sm blank__cta" @click="creating = true">
        Завести замовника
      </button>
    </section>

    <!-- Замовники є, але під фільтри не підпадає жоден. -->
    <section v-else-if="state === 'nothing'" class="nothing">
      <p class="nothing__text">
        Під ці умови не підпадає жоден замовник. Спробуйте інший запит або зніміть фільтри.
      </p>
      <button type="button" class="btn btn--ghost btn--sm" @click="reset">Скинути фільтри</button>
    </section>

    <ClientsTable v-else :rows="rows" :today="today" @remove="askRemove" />

    <ClientDeleteDialog
      v-if="removing"
      :name="removing.client.name"
      :objects="removing.totals.objects"
      :due="removing.totals.due"
      :saving="deleting"
      :server-error="objects.error"
      @confirm="remove"
      @close="closeRemove"
    />

    <ClientCreateDialog
      v-if="creating"
      :saving="objects.isSaving"
      :server-error="objects.error"
      @create="create"
      @dirty="objects.reset()"
      @close="creating = false"
    />
  </div>
</template>

<style scoped>
.clients {
  display: grid;
  gap: 18px;
  width: 100%;
}

.clients__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px 20px;
}

.clients__intro {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.clients__title {
  font-size: clamp(24px, 2.8vw, 34px);
}

.clients__sub {
  max-width: 68ch;
  font-size: 13.5px;
  color: var(--ink-muted);
}

.clients__new {
  margin-left: auto;
}

.clients__new :deep(.icon) {
  width: 17px;
  height: 17px;
}

.loading {
  padding: 40px 0;
  font-size: 13.5px;
  color: var(--ink-faint);
}

/* Борг — єдине, що екран говорить сам, не чекаючи фільтра. */
.alarm {
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

.alarm :deep(.icon) {
  flex: none;
  width: 16px;
  height: 16px;
  color: var(--ink-faint);
}

.alarm strong {
  color: var(--ink);
  font-variant-numeric: tabular-nums;
}

.alarm__link {
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
  .clients__new {
    width: 100%;
  }
}
</style>
