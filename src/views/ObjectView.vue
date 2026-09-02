<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import ObjectDeleteDialog from '@/components/objects/ObjectDeleteDialog.vue'
import ObjectHeader from '@/components/objects/ObjectHeader.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { todayIso, type ObjectStatus } from '@/lib/objects'
import { objectSummary } from '@/lib/objectList'
import { useObjectsStore } from '@/stores/objects'

type TabKey = 'overview' | 'materials' | 'services' | 'finance'

/**
 * Порядок вкладок — порядок роботи з обʼєктом: спочатку розуміємо, що це,
 * потім закуповуємо, робимо й рахуємо гроші.
 */
const TABS: readonly { key: TabKey; label: string; plan: string }[] = [
  {
    key: 'overview',
    label: 'Огляд',
    plan: 'Загальна інформація, фото з майданчика, нотатки й стрічка подій по обʼєкту.',
  },
  {
    key: 'materials',
    label: 'Матеріали',
    plan: 'Закупівлі: що потрібно, що замовлено, що вже на майданчику.',
  },
  { key: 'services', label: 'Послуги', plan: 'Роботи з обсягами, виконавцями та ставками.' },
  { key: 'finance', label: 'Фінанси', plan: 'Сума для клієнта, знижка й платежі замовника.' },
]

const route = useRoute()
const router = useRouter()
const objects = useObjectsStore()

const tab = ref<TabKey>('overview')
const confirming = ref(false)

/** День фіксуємо на час життя екрана: прострочення не має мигати опівночі. */
const today = todayIso()

const id = computed(() => Number(route.params.id))
const object = computed(() => objects.find(id.value))
const summary = computed(() => (object.value === null ? null : objectSummary(object.value, today)))

const current = computed(() => TABS.find((item) => item.key === tab.value) ?? TABS[0])

/** Порожній обʼєкт можна видалити; з історією — лише в архів. */
const removable = computed(
  () =>
    object.value !== null &&
    object.value.materials.length === 0 &&
    object.value.services.length === 0 &&
    object.value.payments.length === 0,
)

onMounted(() => {
  // Картку відкривають і прямим посиланням — тоді список ще не їхав.
  if (!objects.loaded) {
    void objects.fetchObjects()
  }
})

function setStatus(status: ObjectStatus): void {
  objects.setStatus(id.value, status)
}

function toggleArchive(): void {
  objects.setArchived(id.value, object.value?.archived_at === null)
}

async function remove(): Promise<void> {
  confirming.value = false
  objects.remove(id.value)

  await router.push({ name: 'objects' })
}

function archiveFromDialog(): void {
  confirming.value = false
  objects.setArchived(id.value, true)
}
</script>

<template>
  <div class="object">
    <p v-if="objects.isLoading" class="loading">Відкриваємо картку…</p>

    <!-- Обʼєкта немає: чужий простір, видалений запис або просто друкарка в адресі. -->
    <section v-else-if="object === null || summary === null" class="missing">
      <span class="missing__icon" aria-hidden="true"><AppIcon name="alert" /></span>
      <h1 class="display missing__title">Такого обʼєкта немає</h1>
      <p class="missing__text">Можливо, його видалили або він належить іншому робочому простору.</p>
      <RouterLink class="btn btn--ghost btn--sm" :to="{ name: 'objects' }">
        До списку обʼєктів
      </RouterLink>
    </section>

    <template v-else>
      <ObjectHeader
        :object="object"
        :summary="summary"
        @status="setStatus"
        @archive="toggleArchive"
        @remove="confirming = true"
      />

      <nav class="tabs" aria-label="Розділи картки обʼєкта">
        <button
          v-for="item in TABS"
          :key="item.key"
          type="button"
          class="tab"
          :class="{ 'tab--on': tab === item.key }"
          :aria-current="tab === item.key ? 'true' : undefined"
          @click="tab = item.key"
        >
          {{ item.label }}
        </button>
      </nav>

      <!-- Вміст вкладок робимо наступними кроками — поки кожна чесно каже,
           що в ній зʼявиться. -->
      <section class="pane">
        <span class="pane__icon" aria-hidden="true"><AppIcon name="estimate" /></span>
        <h2 class="pane__title">{{ current?.label }}</h2>
        <p class="pane__text">{{ current?.plan }}</p>
      </section>
    </template>

    <ObjectDeleteDialog
      v-if="confirming && object"
      :name="object.name"
      :blocked="!removable"
      @confirm="remove"
      @archive="archiveFromDialog"
      @close="confirming = false"
    />
  </div>
</template>

<style scoped>
.object {
  display: grid;
  gap: 18px;
  width: 100%;
}

.loading {
  padding: 40px 0;
  font-size: 13.5px;
  color: var(--ink-faint);
}

/* ── Вкладки ───────────────────────────────────────────────────── */

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-sunk);
  justify-self: start;
}

.tab {
  padding: 9px 18px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-muted);
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  transition:
    background-color 0.2s var(--ease),
    color 0.2s var(--ease),
    box-shadow 0.2s var(--ease);
}

.tab:hover {
  color: var(--ink);
}

.tab--on {
  background: var(--paper-raised);
  color: var(--ink);
  box-shadow: var(--shadow-sm);
}

/* ── Заготовка вкладки ─────────────────────────────────────────── */

.pane {
  display: grid;
  justify-items: start;
  gap: 10px;
  padding: 30px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

.pane__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 13px;
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.pane__icon :deep(.icon) {
  width: 20px;
  height: 20px;
}

.pane__title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.pane__text {
  max-width: 58ch;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--ink-muted);
}

/* ── Немає обʼєкта ─────────────────────────────────────────────── */

.missing {
  display: grid;
  justify-items: start;
  gap: 12px;
  width: 100%;
  max-width: 520px;
  padding: 32px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

.missing__icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 15px;
  background: var(--amber-tint);
  color: var(--amber);
}

.missing__icon :deep(.icon) {
  width: 22px;
  height: 22px;
}

.missing__title {
  font-size: clamp(20px, 2.4vw, 26px);
}

.missing__text {
  max-width: 46ch;
  font-size: 14px;
  line-height: 1.55;
  color: var(--ink-muted);
}

.missing .btn {
  margin-top: 4px;
  text-decoration: none;
}
</style>
