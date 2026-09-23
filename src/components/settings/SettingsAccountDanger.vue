<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import AccountDeleteDialog from '@/components/settings/AccountDeleteDialog.vue'
import SettingsCard from '@/components/settings/SettingsCard.vue'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { formatUnits, sectionAnchor } from '@/lib/settings'
import { useSettingsStore } from '@/stores/settings'
import { useWorkspacesStore } from '@/stores/workspaces'

const settings = useSettingsStore()
const workspaces = useWorkspacesStore()
const router = useRouter()

const open = ref(false)
const error = ref<string | null>(null)

const owned = computed(() => workspaces.items)
const deleting = computed(() => settings.pending === 'account-delete')

function close(): void {
  if (!deleting.value) {
    open.value = false
    error.value = null
  }
}

async function confirm(password: string): Promise<void> {
  error.value = null

  const result = await settings.deleteAccount(password)

  if (result.ok) {
    await router.replace({ name: 'login' })
  } else {
    error.value = result.fields.password ?? result.message
  }
}
</script>

<template>
  <SettingsCard
    :anchor="sectionAnchor('account-danger')"
    title="Видалення акаунта"
    lead="Дія незворотна. Перед видаленням рекомендуємо експортувати дані просторів."
    tone="danger"
  >
    <SettingsRow label="Що буде видалено">
      <ul class="facts">
        <li>
          <span class="facts__key">Ваші простори</span>
          <span class="facts__value">
            {{
              owned.length === 0
                ? '—'
                : formatUnits(owned.length, 'простір', 'простори', 'просторів')
            }}
          </span>
        </li>
        <li>
          <span class="facts__key">Обʼєкти, замовники, команда, платежі, фото</span>
          <span class="facts__value">усі дані просторів</span>
        </li>
        <li>
          <span class="facts__key">Посилання для замовників</span>
          <span class="facts__value">перестануть відкриватися</span>
        </li>
      </ul>
    </SettingsRow>

    <SettingsRow label="Видалити акаунт" hint="Знадобиться пароль від акаунта.">
      <div class="action">
        <button type="button" class="btn btn--sm danger" @click="open = true">
          Видалити акаунт…
        </button>
      </div>
    </SettingsRow>

    <AccountDeleteDialog
      v-if="open"
      :workspaces="owned"
      :saving="deleting"
      :server-error="error"
      @confirm="confirm"
      @close="close"
    />
  </SettingsCard>
</template>

<style scoped>
.facts {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.facts li {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 2px 16px;
  padding: 8px 0;
  font-size: 13px;
}

.facts li + li {
  border-top: 1px dashed var(--line);
}

.facts li:first-child {
  padding-top: 0;
}

.facts__key {
  color: var(--ink-soft);
}

.facts__value {
  margin-left: auto;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

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
