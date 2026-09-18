<script setup lang="ts">
import { computed, ref } from 'vue'
import SettingsDialog from '@/components/settings/SettingsDialog.vue'
import TextField from '@/components/ui/TextField.vue'
import { isWorkspaceDeleteConfirmed } from '@/lib/settings'

const props = defineProps<{
  name: string
  alone: boolean
  saving: boolean
  serverError: string | null
}>()

const emit = defineEmits<{ confirm: []; close: [] }>()

const typed = ref('')

const ready = computed(() => isWorkspaceDeleteConfirmed(typed.value, props.name))

function submit(): void {
  if (ready.value && !props.saving) {
    emit('confirm')
  }
}
</script>

<template>
  <SettingsDialog
    title="Видалення простору"
    :busy="saving"
    :error="serverError"
    @submit="submit"
    @close="emit('close')"
  >
    <p>
      Простір <strong class="strong">«{{ name }}»</strong> буде видалено разом з обʼєктами,
      замовниками, командою, платежами й фото. Посилання для замовників перестануть відкриватися.
      Відновлення неможливе.
    </p>

    <p v-if="alone" class="note">
      Це ваш єдиний простір. Після видалення потрібно буде створити новий, щоб продовжити роботу.
    </p>

    <TextField
      v-model="typed"
      label="Для підтвердження введіть назву простору"
      autocomplete="off"
      :placeholder="name"
    />

    <template #actions>
      <button type="button" class="btn btn--ghost" :disabled="saving" @click="emit('close')">
        Скасувати
      </button>

      <button type="submit" class="btn btn--danger" :disabled="!ready || saving">
        <span v-if="saving" class="spinner" aria-hidden="true" />
        <span>{{ saving ? 'Видаляємо…' : 'Видалити простір' }}</span>
      </button>
    </template>
  </SettingsDialog>
</template>

<style scoped>
.strong {
  font-weight: 600;
  color: var(--ink);
  overflow-wrap: anywhere;
}

.note {
  padding: 10px 12px;
  border-left: 2px solid var(--amber);
  background: var(--paper);
  font-size: 12.5px;
  color: var(--ink-soft);
}
</style>
