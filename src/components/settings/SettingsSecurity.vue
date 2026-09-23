<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import SettingsCard from '@/components/settings/SettingsCard.vue'
import SettingsFooter from '@/components/settings/SettingsFooter.vue'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import PasswordField from '@/components/ui/PasswordField.vue'
import PasswordMeter from '@/components/ui/PasswordMeter.vue'
import {
  emptyPasswordForm,
  isPasswordFormTouched,
  passwordErrorsFrom,
  sectionAnchor,
  validatePasswordForm,
  type PasswordForm,
} from '@/lib/settings'
import { hasErrors, type Errors } from '@/lib/validation'
import { useSettingsStore } from '@/stores/settings'

const emit = defineEmits<{ dirty: [value: boolean] }>()

const settings = useSettingsStore()

const form = reactive<PasswordForm>(emptyPasswordForm())
const errors = ref<Errors<PasswordForm>>({})
const serverError = ref<string | null>(null)
const saved = ref(false)

const sessionsDone = ref(false)
const sessionsError = ref<string | null>(null)

let savedTimer: ReturnType<typeof setTimeout> | undefined

const saving = computed(() => settings.pending === 'password')
const signingOut = computed(() => settings.pending === 'sessions')
const touched = computed(() => isPasswordFormTouched(form))

watch(touched, (value) => emit('dirty', value), { immediate: true })

watch(form, () => {
  errors.value = {}
  serverError.value = null

  if (touched.value) {
    saved.value = false
  }
})

function reset(): void {
  Object.assign(form, emptyPasswordForm())
  errors.value = {}
}

async function submit(): Promise<void> {
  errors.value = validatePasswordForm(form)

  if (hasErrors(errors.value)) {
    return
  }

  const result = await settings.changePassword({ ...form })

  if (!result.ok) {
    errors.value = passwordErrorsFrom(result.fields)
    serverError.value = hasErrors(errors.value) ? null : result.message

    return
  }

  reset()
  saved.value = true
  clearTimeout(savedTimer)
  savedTimer = setTimeout(() => (saved.value = false), 4000)
}

async function signOutOthers(): Promise<void> {
  sessionsError.value = null

  const result = await settings.signOutOthers()

  if (result.ok) {
    sessionsDone.value = true
  } else {
    sessionsError.value = result.message
  }
}

onBeforeUnmount(() => clearTimeout(savedTimer))
</script>

<template>
  <SettingsCard
    :anchor="sectionAnchor('security')"
    title="Безпека"
    lead="Пароль і активні сеанси акаунта."
    form
    @submit="submit"
  >
    <input
      type="text"
      class="sr-only"
      autocomplete="username"
      :value="settings.profile.email"
      tabindex="-1"
      aria-hidden="true"
      readonly
    />

    <SettingsRow label="Поточний пароль" hint="Потрібен, щоб підтвердити зміну.">
      <div class="pair">
        <PasswordField
          v-model="form.current"
          label="Поточний пароль"
          autocomplete="current-password"
          :error="errors.current"
        />
      </div>
    </SettingsRow>

    <SettingsRow
      label="Новий пароль"
      hint="Не менше 8 символів. Надійніше — від 10, з літерами, цифрами й спецсимволом."
    >
      <div class="pair">
        <PasswordField
          v-model="form.password"
          label="Новий пароль"
          autocomplete="new-password"
          :error="errors.password"
        />

        <PasswordField
          v-model="form.confirmation"
          label="Підтвердження"
          autocomplete="new-password"
          :error="errors.confirmation"
        />
      </div>

      <PasswordMeter v-if="form.password !== ''" :password="form.password" />
    </SettingsRow>

    <template #footer>
      <SettingsFooter
        :dirty="touched"
        :saving="saving"
        :saved="saved"
        :error="serverError"
        idle-text="Пароль не змінювався"
        saved-text="Пароль змінено. Сеанси на інших пристроях завершено."
        submit-label="Змінити пароль"
        saving-label="Змінюємо…"
        @reset="reset"
      />
    </template>

    <template #extra>
      <SettingsRow label="Активні сеанси" hint="Завершує вхід на всіх пристроях, крім поточного.">
        <div class="sessions">
          <p class="sessions__state" :class="{ 'sessions__state--error': sessionsError }">
            <template v-if="sessionsError">{{ sessionsError }}</template>
            <template v-else-if="sessionsDone">Інші сеанси завершено.</template>
            <template v-else>Поточний пристрій залишиться в системі.</template>
          </p>

          <button
            type="button"
            class="btn btn--ghost btn--sm"
            :disabled="signingOut || sessionsDone"
            @click="signOutOthers"
          >
            <span v-if="signingOut" class="spinner" aria-hidden="true" />
            <span>{{ signingOut ? 'Завершуємо…' : 'Завершити інші сеанси' }}</span>
          </button>
        </div>
      </SettingsRow>
    </template>
  </SettingsCard>
</template>

<style scoped>
.pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 14px;
}

.sessions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 16px;
}

.sessions__state {
  flex: 1 1 200px;
  font-size: 13px;
  color: var(--ink-muted);
}

.sessions__state--error {
  color: var(--danger);
}

@media (width <= 560px) {
  .pair {
    grid-template-columns: minmax(0, 1fr);
  }

  .sessions .btn {
    width: 100%;
  }
}
</style>
