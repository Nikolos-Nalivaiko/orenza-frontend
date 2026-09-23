<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import SettingsCard from '@/components/settings/SettingsCard.vue'
import SettingsFooter from '@/components/settings/SettingsFooter.vue'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import TextField from '@/components/ui/TextField.vue'
import {
  ACCOUNT_TYPE_INFO,
  formatLongDate,
  sameWorkspace,
  sectionAnchor,
  validateWorkspaceForm,
  type WorkspaceForm,
} from '@/lib/settings'
import { hasErrors, type Errors } from '@/lib/validation'
import { NAME_MAX } from '@/lib/workspaces'
import { useSettingsStore } from '@/stores/settings'
import { useWorkspacesStore } from '@/stores/workspaces'

const emit = defineEmits<{ dirty: [value: boolean] }>()

const settings = useSettingsStore()
const workspaces = useWorkspacesStore()

const form = reactive<WorkspaceForm>({ ...settings.workspace })
const errors = ref<Errors<WorkspaceForm>>({})
const serverError = ref<string | null>(null)
const saved = ref(false)
const copied = ref(false)

let savedTimer: ReturnType<typeof setTimeout> | undefined
let copiedTimer: ReturnType<typeof setTimeout> | undefined

const current = computed(() => workspaces.current)
const type = computed(() =>
  current.value === null ? null : ACCOUNT_TYPE_INFO[current.value.type.value],
)

const saving = computed(() => settings.pending === 'workspace')
const dirty = computed(() => !sameWorkspace(form, settings.workspace))
const nameLength = computed(() => form.name.trim().length)

const created = computed(() => formatLongDate(current.value?.created_at))

watch(dirty, (value) => emit('dirty', value), { immediate: true })

watch(
  () => settings.workspace,
  (next) => Object.assign(form, next),
)

watch(form, () => {
  errors.value = {}
  serverError.value = null

  if (dirty.value) {
    saved.value = false
  }
})

function reset(): void {
  Object.assign(form, settings.workspace)
  errors.value = {}
}

async function submit(): Promise<void> {
  errors.value = validateWorkspaceForm(form)

  if (hasErrors(errors.value)) {
    return
  }

  const result = await settings.saveWorkspace({ ...form })

  if (!result.ok) {
    if (result.fields.name !== undefined) {
      errors.value = { name: result.fields.name }
    } else {
      serverError.value = result.message
    }

    return
  }

  saved.value = true
  clearTimeout(savedTimer)
  savedTimer = setTimeout(() => (saved.value = false), 3000)
}

async function copySlug(): Promise<void> {
  const slug = current.value?.slug

  if (slug === undefined) {
    return
  }

  try {
    await navigator.clipboard.writeText(slug)
    copied.value = true
    clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => (copied.value = false), 1800)
  } catch {
    copied.value = false
  }
}

onBeforeUnmount(() => {
  clearTimeout(savedTimer)
  clearTimeout(copiedTimer)
})
</script>

<template>
  <SettingsCard
    :anchor="sectionAnchor('general')"
    title="Загальне"
    lead="Основні відомості про робочий простір."
    form
    @submit="submit"
  >
    <SettingsRow
      label="Назва простору"
      hint="Показується в меню, на сторінках для замовників і в експорті."
    >
      <div class="name">
        <TextField
          v-model="form.name"
          label="Назва"
          autocomplete="organization"
          :error="errors.name"
        />

        <span
          v-if="nameLength > 0"
          class="name__count"
          :class="{ 'name__count--over': nameLength > NAME_MAX }"
        >
          {{ nameLength }}/{{ NAME_MAX }}
        </span>
      </div>
    </SettingsRow>

    <SettingsRow label="Тип акаунта" hint="Визначається під час створення простору.">
      <div v-if="type" class="type">
        <p class="type__head">
          <span class="type__label">{{ type.label }}</span>
          <span class="badge">Не змінюється</span>
        </p>
        <p class="type__text">{{ type.description }}</p>
        <p class="type__more">
          Потрібен інший тип —
          <RouterLink class="link" :to="{ name: 'workspaces' }">створіть окремий простір</RouterLink
          >.
        </p>
      </div>
    </SettingsRow>

    <SettingsRow label="Відомості">
      <dl class="facts">
        <div v-if="created" class="facts__row">
          <dt>Створено</dt>
          <dd>{{ created }}</dd>
        </div>

        <div class="facts__row">
          <dt>Ідентифікатор</dt>
          <dd class="facts__slug">
            <code>{{ current?.slug }}</code>
            <button type="button" class="copy" @click="copySlug">
              {{ copied ? 'Скопійовано' : 'Копіювати' }}
            </button>
          </dd>
        </div>
      </dl>
    </SettingsRow>

    <template #footer>
      <SettingsFooter
        :dirty="dirty"
        :saving="saving"
        :saved="saved"
        :error="serverError"
        saved-text="Назву простору оновлено"
        @reset="reset"
      />
    </template>
  </SettingsCard>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--ink-muted);
  white-space: nowrap;
}

.name {
  position: relative;
}

.name__count {
  position: absolute;
  top: 1px;
  right: 0;
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  color: var(--ink-faint);
}

.name__count--over {
  color: var(--danger);
}

.type {
  display: grid;
  gap: 6px;
}

.type__head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.type__label {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.type__text {
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink-muted);
}

.type__more {
  font-size: 12.5px;
  color: var(--ink-faint);
}

.link {
  color: var(--ink);
  font-weight: 500;
  text-decoration: underline;
  text-decoration-color: var(--line-strong);
  text-underline-offset: 3px;
  transition: text-decoration-color 0.15s var(--ease);
}

.link:hover {
  text-decoration-color: var(--ink);
}

.facts {
  display: grid;
  margin: 0;
}

.facts__row {
  display: grid;
  grid-template-columns: 130px minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  min-height: 38px;
  padding: 6px 0;
  font-size: 13px;
}

.facts__row + .facts__row {
  border-top: 1px dashed var(--line);
}

.facts__row:first-child {
  padding-top: 0;
}

.facts__row dt {
  color: var(--ink-faint);
}

.facts__row dd {
  margin: 0;
  min-width: 0;
  color: var(--ink);
  overflow-wrap: anywhere;
}

.facts__slug {
  display: flex;
  align-items: center;
  gap: 10px;
}

.facts__slug code {
  min-width: 0;
  padding: 2px 7px;
  border-radius: 6px;
  background: var(--paper-sunk);
  font-family: ui-monospace, 'SF Mono', Menlo, monospace;
  font-size: 12.5px;
  overflow-wrap: anywhere;
}

.copy {
  flex: none;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink-muted);
  font-size: 12.5px;
  font-weight: 500;
  text-decoration: underline;
  text-decoration-color: var(--line-strong);
  text-underline-offset: 3px;
}

.copy:hover {
  color: var(--ink);
}

@media (width <= 560px) {
  .facts__row {
    grid-template-columns: minmax(0, 1fr);
    gap: 2px;
  }
}
</style>
