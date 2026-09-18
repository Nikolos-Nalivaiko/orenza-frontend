<script setup lang="ts">
import { computed, ref } from 'vue'
import SettingsCard from '@/components/settings/SettingsCard.vue'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { todayIso } from '@/lib/objects'
import { exportFileName, exportFiles, exportSummary, sectionAnchor } from '@/lib/settings'
import { useEmployeesStore } from '@/stores/employees'
import { useObjectsStore } from '@/stores/objects'
import { useSettingsStore } from '@/stores/settings'
import { useWorkspacesStore } from '@/stores/workspaces'

const settings = useSettingsStore()
const objects = useObjectsStore()
const employees = useEmployeesStore()
const workspaces = useWorkspacesStore()

const error = ref<string | null>(null)

const loading = computed(() => objects.isLoading || objects.isLoadingClients)
const exporting = computed(() => settings.pending === 'export')

const summary = computed(() =>
  exportSummary(objects.current, objects.clients, workspaces.hasTeam ? employees.items.length : 0),
)

const counts = computed(() => {
  const value = summary.value

  return [
    {
      key: 'objects',
      label: 'Обʼєкти',
      value: value.objects,
      note: value.archived > 0 ? `у т. ч. ${value.archived} в архіві` : '',
    },
    { key: 'clients', label: 'Замовники', value: value.clients, note: '' },
    {
      key: 'estimate',
      label: 'Позиції кошторисів',
      value: value.materials + value.services,
      note: '',
    },
    { key: 'payments', label: 'Платежі', value: value.payments, note: '' },
    ...(workspaces.hasTeam
      ? [{ key: 'team', label: 'Команда', value: value.employees, note: '' }]
      : []),
  ]
})

const files = computed(() => exportFiles(workspaces.hasTeam))

const fileName = computed(() => exportFileName(workspaces.current?.slug ?? 'workspace', todayIso()))

const timeFormat = new Intl.DateTimeFormat('uk-UA', { hour: '2-digit', minute: '2-digit' })

const lastExport = computed(() =>
  settings.lastExport === null ? null : timeFormat.format(settings.lastExport),
)

async function download(): Promise<void> {
  error.value = null

  const result = await settings.exportData()

  if (!result.ok) {
    error.value = result.message
  }
}
</script>

<template>
  <SettingsCard
    :anchor="sectionAnchor('data')"
    title="Дані та експорт"
    lead="Копія всіх даних простору в одному архіві. Доступна будь-коли, без звернення в підтримку."
  >
    <SettingsRow label="Обсяг даних" hint="Разом з архівними обʼєктами.">
      <dl class="counts" :aria-busy="loading">
        <div v-for="item in counts" :key="item.key" class="counts__row">
          <dt>{{ item.label }}</dt>
          <dd>
            <span v-if="item.note" class="counts__note">{{ item.note }}</span>
            <span v-if="loading" class="counts__sk" aria-hidden="true" />
            <span v-else class="counts__value">{{ item.value }}</span>
          </dd>
        </div>
      </dl>
    </SettingsRow>

    <SettingsRow
      label="Склад архіву"
      hint="CSV відкривається в Excel і Google Таблицях. Фото й обкладинки не входять."
    >
      <div class="archive">
        <p class="archive__name">{{ fileName }}</p>

        <ul class="archive__files">
          <li v-for="file in files" :key="file.name" class="archive__file">
            <code>{{ file.name }}</code>
            <span>{{ file.description }}</span>
          </li>
        </ul>
      </div>
    </SettingsRow>

    <template #footer>
      <p class="status" :class="{ 'status--error': error }" role="status">
        <template v-if="error">{{ error }}</template>
        <template v-else-if="exporting">Формуємо архів…</template>
        <template v-else-if="lastExport">Останнє завантаження о {{ lastExport }}</template>
        <template v-else>Архів формується в момент запиту</template>
      </p>

      <button
        type="button"
        class="btn btn--ink btn--sm dl"
        :disabled="exporting || loading"
        @click="download"
      >
        <span v-if="exporting" class="spinner" aria-hidden="true" />
        <span>{{ exporting ? 'Формуємо…' : 'Завантажити архів' }}</span>
      </button>
    </template>
  </SettingsCard>
</template>

<style scoped>
.counts {
  display: grid;
  margin: 0;
}

.counts__row {
  display: flex;
  align-items: baseline;
  gap: 16px;
  padding: 7px 0;
  font-size: 13px;
}

.counts__row + .counts__row {
  border-top: 1px dashed var(--line);
}

.counts__row:first-child {
  padding-top: 0;
}

.counts__row dt {
  color: var(--ink-soft);
}

.counts__row dd {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 0 0 0 auto;
}

.counts__note {
  font-size: 12px;
  color: var(--ink-faint);
}

.counts__value {
  min-width: 3ch;
  font-weight: 600;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.counts__sk {
  display: inline-block;
  width: 26px;
  height: 12px;
  border-radius: 4px;
  background: var(--paper-sunk);
}

.archive {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--r-xs);
}

.archive__name {
  padding: 9px 12px;
  border-bottom: 1px solid var(--line);
  background: var(--paper);
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 12.5px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.archive__files {
  display: grid;
  margin: 0;
  padding: 4px 12px;
  list-style: none;
}

.archive__file {
  display: grid;
  grid-template-columns: 118px minmax(0, 1fr);
  align-items: baseline;
  gap: 12px;
  padding: 6px 0;
  font-size: 12.5px;
  color: var(--ink-muted);
}

.archive__file + .archive__file {
  border-top: 1px dashed var(--line);
}

.archive__file code {
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 12px;
  color: var(--ink);
}

.status {
  min-width: 0;
  font-size: 12.5px;
  color: var(--ink-faint);
}

.status--error {
  color: var(--danger);
}

.dl {
  margin-left: auto;
}

@media (width <= 560px) {
  .archive__file {
    grid-template-columns: minmax(0, 1fr);
    gap: 1px;
  }

  .dl {
    width: 100%;
  }
}
</style>
