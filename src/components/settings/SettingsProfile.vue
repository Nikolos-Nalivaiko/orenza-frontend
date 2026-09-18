<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import SettingsCard from '@/components/settings/SettingsCard.vue'
import SettingsFooter from '@/components/settings/SettingsFooter.vue'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import PhoneField from '@/components/ui/PhoneField.vue'
import TextField from '@/components/ui/TextField.vue'
import {
  emailChanged,
  formatLongDate,
  fullNameOf,
  initialsOf,
  sameProfile,
  sectionAnchor,
  validateProfile,
  type ProfileForm,
} from '@/lib/settings'
import { hasErrors, normaliseEmail, type Errors } from '@/lib/validation'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'

const emit = defineEmits<{ dirty: [value: boolean] }>()

const auth = useAuthStore()
const settings = useSettingsStore()

const form = reactive<ProfileForm>({ ...settings.profile })
const errors = ref<Errors<ProfileForm>>({})
const serverError = ref<string | null>(null)
const saved = ref(false)

let savedTimer: ReturnType<typeof setTimeout> | undefined

const saving = computed(() => settings.pending === 'profile')
const dirty = computed(() => !sameProfile(form, settings.profile))
const newEmail = computed(() => emailChanged(settings.profile, form) && form.email.trim() !== '')

const since = computed(() => formatLongDate(auth.user?.created_at))

watch(dirty, (value) => emit('dirty', value), { immediate: true })

watch(
  () => settings.profile,
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
  Object.assign(form, settings.profile)
  errors.value = {}
}

async function submit(): Promise<void> {
  errors.value = validateProfile(form)

  if (hasErrors(errors.value)) {
    return
  }

  const result = await settings.saveProfile({ ...form })

  if (!result.ok) {
    serverError.value = result.message

    return
  }

  saved.value = true
  clearTimeout(savedTimer)
  savedTimer = setTimeout(() => (saved.value = false), 3000)
}

onBeforeUnmount(() => clearTimeout(savedTimer))
</script>

<template>
  <SettingsCard
    :anchor="sectionAnchor('profile')"
    title="Профіль"
    lead="Особисті дані власника акаунта."
    form
    @submit="submit"
  >
    <SettingsRow label="Обліковий запис" :hint="since ? `Зареєстровано ${since}` : undefined">
      <div class="who">
        <span class="who__avatar" aria-hidden="true">{{ initialsOf(settings.profile) }}</span>

        <div class="who__text">
          <p class="who__name">{{ fullNameOf(settings.profile) || 'Без імені' }}</p>
          <p class="who__mail">{{ settings.profile.email }}</p>
        </div>
      </div>
    </SettingsRow>

    <SettingsRow label="ПІБ власника" hint="Так вас бачать учасники простору й замовники.">
      <div class="pair">
        <TextField
          v-model="form.firstName"
          label="Імʼя"
          autocomplete="given-name"
          :error="errors.firstName"
        />

        <TextField
          v-model="form.lastName"
          label="Прізвище"
          autocomplete="family-name"
          :error="errors.lastName"
        />
      </div>
    </SettingsRow>

    <SettingsRow label="Пошта" hint="Використовується як логін для входу.">
      <TextField
        v-model="form.email"
        label="Електронна пошта"
        type="email"
        inputmode="email"
        autocomplete="email"
        :error="errors.email"
      />

      <p v-if="newEmail && !errors.email" class="note" role="note">
        Після збереження вхід буде за адресою
        <strong>{{ normaliseEmail(form.email) }}</strong
        >. Попередня адреса перестане діяти.
      </p>
    </SettingsRow>

    <SettingsRow label="Телефон" hint="Для звʼязку із замовниками та командою.">
      <div class="pair">
        <PhoneField v-model="form.phone" label="Номер телефону" optional :error="errors.phone" />
      </div>
    </SettingsRow>

    <template #footer>
      <SettingsFooter
        :dirty="dirty"
        :saving="saving"
        :saved="saved"
        :error="serverError"
        @reset="reset"
      />
    </template>
  </SettingsCard>
</template>

<style scoped>
.who {
  display: flex;
  align-items: center;
  gap: 14px;
}

.who__avatar {
  display: grid;
  flex: none;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--ink);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.who__text {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.who__name {
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.who__mail {
  font-size: 13px;
  color: var(--ink-muted);
  overflow-wrap: anywhere;
}

.pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 14px;
}

.note {
  padding: 10px 12px;
  border-left: 2px solid var(--amber);
  background: var(--paper);
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--ink-soft);
}

.note strong {
  font-weight: 600;
  overflow-wrap: anywhere;
}

@media (width <= 560px) {
  .pair {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
