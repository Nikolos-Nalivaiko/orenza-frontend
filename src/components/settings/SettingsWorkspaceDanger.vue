<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import SettingsCard from '@/components/settings/SettingsCard.vue'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import WorkspaceDeleteDialog from '@/components/settings/WorkspaceDeleteDialog.vue'
import { sectionAnchor } from '@/lib/settings'
import { useSettingsStore } from '@/stores/settings'
import { useWorkspacesStore } from '@/stores/workspaces'

const emit = defineEmits<{ export: [] }>()

const settings = useSettingsStore()
const workspaces = useWorkspacesStore()
const router = useRouter()

const open = ref(false)
const error = ref<string | null>(null)

const deleting = computed(() => settings.pending === 'workspace-delete')
const alone = computed(() => workspaces.items.length <= 1)

function close(): void {
  if (!deleting.value) {
    open.value = false
    error.value = null
  }
}

async function confirm(name: string): Promise<void> {
  error.value = null

  const result = await settings.deleteWorkspace(name)

  if (!result.ok) {
    error.value = result.fields.name ?? result.message

    return
  }

  open.value = false

  const next = workspaces.items[0]

  await router.replace(
    next === undefined
      ? { name: 'workspaces' }
      : { name: 'dashboard', params: { workspace: next.slug } },
  )
}
</script>

<template>
  <SettingsCard
    :anchor="sectionAnchor('workspace-danger')"
    title="Видалення простору"
    lead="Видаляє простір і всі його дані. Ваш акаунт та інші простори залишаться."
    tone="danger"
  >
    <SettingsRow label="Резервна копія" hint="Рекомендуємо зберегти архів перед видаленням.">
      <div class="action">
        <button type="button" class="btn btn--ghost btn--sm" @click="emit('export')">
          Перейти до експорту
        </button>
      </div>
    </SettingsRow>

    <SettingsRow label="Видалити простір" hint="Потрібно буде ввести назву простору.">
      <div class="action">
        <button type="button" class="btn btn--sm danger" @click="open = true">
          Видалити простір…
        </button>
      </div>
    </SettingsRow>

    <WorkspaceDeleteDialog
      v-if="open"
      :name="settings.workspace.name"
      :alone="alone"
      :saving="deleting"
      :server-error="error"
      @confirm="confirm"
      @close="close"
    />
  </SettingsCard>
</template>

<style scoped>
.action {
  display: flex;
}

.danger {
  --btn-border: rgb(200 52 31 / 45%);
  --btn-fg: var(--danger);
}

.danger:hover:not(:disabled) {
  --btn-bg: var(--danger);
  --btn-border: var(--danger);
  --btn-fg: #fff;
}
</style>
