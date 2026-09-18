<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import SettingsDialog from '@/components/settings/SettingsDialog.vue'
import CheckBox from '@/components/ui/CheckBox.vue'
import PasswordField from '@/components/ui/PasswordField.vue'
import { isDeleteConfirmed } from '@/lib/settings'
import type { Workspace } from '@/lib/workspaces'

const props = defineProps<{
  workspaces: Workspace[]
  saving: boolean
  serverError: string | null
}>()

const emit = defineEmits<{ confirm: [password: string]; close: [] }>()

const password = ref('')
const agreed = ref(false)
const passwordError = ref<string | undefined>(undefined)

const ready = computed(() => isDeleteConfirmed(password.value, agreed.value))

watch(password, () => (passwordError.value = undefined))

function submit(): void {
  if (password.value === '') {
    passwordError.value = 'Введіть пароль від акаунта'

    return
  }

  if (ready.value && !props.saving) {
    emit('confirm', password.value)
  }
}
</script>

<template>
  <SettingsDialog
    title="Видалення акаунта"
    :busy="saving"
    :error="serverError"
    @submit="submit"
    @close="emit('close')"
  >
    <p>
      Акаунт буде видалено остаточно разом із просторами, власником яких ви є, і всіма даними в них.
      Відновлення неможливе.
    </p>

    <ul v-if="workspaces.length > 0" class="list">
      <li v-for="item in workspaces" :key="item.id" class="list__row">
        <span class="list__name">{{ item.name }}</span>
        <span class="list__type">{{
          item.type.value === 'company' ? 'Компанія' : 'Приватна особа'
        }}</span>
      </li>
    </ul>

    <PasswordField
      v-model="password"
      label="Пароль для підтвердження"
      autocomplete="current-password"
      :error="passwordError"
    />

    <CheckBox v-model="agreed"
      >Я розумію, що дані буде видалено без можливості відновлення</CheckBox
    >

    <template #actions>
      <button type="button" class="btn btn--ghost" :disabled="saving" @click="emit('close')">
        Скасувати
      </button>

      <button type="submit" class="btn btn--danger" :disabled="!agreed || saving">
        <span v-if="saving" class="spinner" aria-hidden="true" />
        <span>{{ saving ? 'Видаляємо…' : 'Видалити акаунт' }}</span>
      </button>
    </template>
  </SettingsDialog>
</template>

<style scoped>
.list {
  display: grid;
  margin: 0;
  padding: 0;
  border: 1px solid var(--line);
  border-radius: var(--r-xs);
  list-style: none;
}

.list__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 12px;
  font-size: 13px;
}

.list__row + .list__row {
  border-top: 1px solid var(--line);
}

.list__name {
  min-width: 0;
  font-weight: 600;
  color: var(--ink);
  overflow-wrap: anywhere;
}

.list__type {
  margin-left: auto;
  font-size: 12px;
  color: var(--ink-faint);
  white-space: nowrap;
}
</style>
