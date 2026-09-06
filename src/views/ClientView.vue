<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import ClientFinance from '@/components/clients/ClientFinance.vue'
import ClientHeader from '@/components/clients/ClientHeader.vue'
import ClientNotes from '@/components/clients/ClientNotes.vue'
import ClientObjects from '@/components/clients/ClientObjects.vue'
import ClientProfile from '@/components/clients/ClientProfile.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { clientObjects, clientProfile, clientTotals, type ClientForm } from '@/lib/clients'
import { todayIso } from '@/lib/objects'
import { useObjectsStore } from '@/stores/objects'

/**
 * Картка замовника. Порядок вкладок — порядок питань до людини: хто це й як з
 * нею працювати → які в неї обʼєкти → скільки на ній грошей.
 */

type TabKey = 'overview' | 'objects' | 'finance'

const route = useRoute()
const objects = useObjectsStore()

const tab = ref<TabKey>('overview')

/** День фіксуємо на час життя екрана: прострочення не має мигати опівночі. */
const today = todayIso()

const id = computed(() => Number(route.params.id))
const client = computed(() => objects.findClient(id.value))

/** Обʼєкти замовника — з ними працюють усі три вкладки. */
const list = computed(() => clientObjects(objects.current, id.value))
const totals = computed(() => clientTotals(list.value, today))

const profile = computed(() => clientProfile(list.value, totals.value, today))

const loading = computed(() => objects.isLoading || objects.isLoadingClients)

const tabs = computed<{ key: TabKey; label: string; count: number | null }[]>(() => [
  { key: 'overview', label: 'Огляд', count: null },
  { key: 'objects', label: 'Обʼєкти', count: totals.value.objects },
  { key: 'finance', label: 'Фінанси', count: null },
])

onMounted(() => {
  // Картку відкривають і прямим посиланням — тоді ще не їхало ні те, ні те.
  if (!objects.loaded) {
    void objects.fetchObjects()
  }

  if (objects.clients.length === 0) {
    void objects.fetchClients()
  }
})

function save(form: ClientForm): void {
  objects.updateClient(id.value, form)
}

function setDiscount(percent: number): void {
  objects.setClientDiscount(id.value, percent)
}

function setNotes(notes: string): void {
  objects.setClientNotes(id.value, notes)
}
</script>

<template>
  <div class="client">
    <p v-if="loading" class="loading">Відкриваємо картку замовника…</p>

    <!-- Замовника немає: чужий простір, видалений запис або друкарка в адресі. -->
    <section v-else-if="client === null" class="missing">
      <span class="missing__icon" aria-hidden="true"><AppIcon name="alert" /></span>
      <h1 class="display missing__title">Такого замовника немає</h1>
      <p class="missing__text">Можливо, його видалили або він належить іншому робочому простору.</p>
      <RouterLink class="btn btn--ghost btn--sm" :to="{ name: 'clients' }">
        До списку замовників
      </RouterLink>
    </section>

    <template v-else>
      <ClientHeader :client="client" :totals="totals" @save="save" @discount="setDiscount" />

      <nav class="tabs" aria-label="Розділи картки замовника">
        <button
          v-for="item in tabs"
          :key="item.key"
          type="button"
          class="tab"
          :class="{ 'tab--on': tab === item.key }"
          :aria-current="tab === item.key ? 'true' : undefined"
          @click="tab = item.key"
        >
          {{ item.label }}
          <span v-if="item.count" class="tab__count">{{ item.count }}</span>
        </button>
      </nav>

      <div v-if="tab === 'overview'" class="ov">
        <ClientNotes :notes="client.notes" @save="setNotes" />

        <ClientProfile :profile="profile" :totals="totals" />
      </div>

      <ClientObjects v-else-if="tab === 'objects'" :items="list" :client-id="id" :today="today" />

      <ClientFinance v-else :objects="list" :totals="totals" :today="today" />
    </template>
  </div>
</template>

<style scoped>
/*
 * Один крок відступу на весь екран: шапка, вкладки й вміст стоять на тій
 * самій сітці, що й плитки всередині них. Різні відступи між блоками — і є
 * те, від чого сторінка здається розсипаною.
 */
.client {
  /* Ширину міряємо по вмісту, а не по вікні: бічна панель буває розгорнутою,
     згорнутою в рейку й схованою зовсім — сітка огляду має знати справжнє
     місце, яке в неї є. */
  container-type: inline-size;

  display: grid;
  gap: 16px;
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
  display: inline-flex;
  align-items: center;
  gap: 8px;
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

.tab__count {
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.tab--on .tab__count {
  background: var(--paper-sunk);
  color: var(--ink);
}

/*
 * Огляд у дві колонки: опис замовника займає всю ширину, яку йому дає екран,
 * а праворуч від нього стоїть довідка — інакше половина сторінки лишалась би
 * порожньою просто тому, що текст не має права бути надто широким.
 */
.ov {
  display: grid;
  align-items: start;
  gap: 12px;
}

/* Дві колонки вмикаємо лише тоді, коли опису від цього стане ширше, а не
   вужче: до цієї межі довідка чесніше стоїть під ним на всю ширину. */
@container (min-width: 1020px) {
  .ov {
    grid-template-columns: minmax(0, 1.7fr) minmax(300px, 0.85fr);
  }
}

/* ── Немає замовника ───────────────────────────────────────────── */

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
