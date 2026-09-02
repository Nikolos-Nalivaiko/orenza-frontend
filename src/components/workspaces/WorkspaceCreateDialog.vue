<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  useId,
  useTemplateRef,
  watch,
} from 'vue'
import TextField from '@/components/ui/TextField.vue'
import {
  validateWorkspaceForm,
  type WorkspaceErrors,
  type WorkspaceForm,
  type WorkspaceType,
} from '@/lib/workspaces'

const props = defineProps<{
  /** Персональний простір може бути лише один. */
  personalTaken: boolean
  ownerName: string
  saving: boolean
  serverError: string | null
}>()

const emit = defineEmits<{ submit: [form: WorkspaceForm]; close: [] }>()

const titleId = useId()
const dialog = useTemplateRef<HTMLElement>('dialog')

const form = reactive<WorkspaceForm>({
  type: props.personalTaken ? 'company' : 'personal',
  name: '',
})

const errors = ref<WorkspaceErrors>({})

watch(form, () => {
  errors.value = {}
})

const isCompany = computed(() => form.type === 'company')

function choose(type: WorkspaceType): void {
  if (type === 'personal' && props.personalTaken) {
    return
  }

  form.type = type
}

function submit(): void {
  errors.value = validateWorkspaceForm(form)

  if (Object.keys(errors.value).length > 0) {
    return
  }

  emit('submit', { ...form })
}

/** Escape закриває, Tab не випускає фокус із діалогу. */
function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close')

    return
  }

  if (event.key !== 'Tab' || dialog.value === null) {
    return
  }

  const focusable = [
    ...dialog.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
    ),
  ]

  const first = focusable[0]
  const last = focusable[focusable.length - 1]

  if (first === undefined || last === undefined) {
    return
  }

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

const bodyOverflow = ref('')

onMounted(() => {
  bodyOverflow.value = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.body.style.overflow = bodyOverflow.value
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <form
      ref="dialog"
      class="dialog"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      novalidate
      @submit.prevent="submit"
    >
      <header class="dialog__head">
        <div>
          <p class="eyebrow">Крок до роботи</p>
          <h2 :id="titleId" class="dialog__title">Новий робочий простір</h2>
        </div>

        <button type="button" class="dialog__close" aria-label="Закрити" @click="emit('close')">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <path
              d="M4 4l8 8M12 4l-8 8"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </header>

      <fieldset class="types">
        <legend class="types__legend">Тип простору</legend>

        <button
          type="button"
          class="type"
          :class="{ 'type--on': !isCompany }"
          :disabled="personalTaken"
          :aria-pressed="!isCompany"
          @click="choose('personal')"
        >
          <span class="type__icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none">
              <path
                d="m11.6 5.4 3 3-6.2 6.2-3-3 6.2-6.2Z"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linejoin="round"
              />
              <path
                d="m13.4 3.6 3 3M5.4 13.4 3 17l3.6-2.4"
                stroke="currentColor"
                stroke-width="1.6"
                stroke-linecap="round"
              />
            </svg>
          </span>

          <span class="type__body">
            <span class="type__name">Особистий</span>
            <span class="type__hint">
              {{ personalTaken ? 'Уже створений' : 'Власні обʼєкти, один на акаунт' }}
            </span>
          </span>

          <span class="type__tick" aria-hidden="true">
            <svg viewBox="0 0 14 14">
              <path
                d="M3 7.3l2.6 2.6L11 4.4"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </button>

        <button
          type="button"
          class="type"
          :class="{ 'type--on': isCompany }"
          :aria-pressed="isCompany"
          @click="choose('company')"
        >
          <span class="type__icon" aria-hidden="true">
            <svg viewBox="0 0 20 20" fill="none">
              <path d="M2.5 17.5V5.8L9 3l6.5 2.8v11.7" stroke="currentColor" stroke-width="1.6" />
              <path d="M6.5 17.5v-5h5v5M17.5 17.5h-15" stroke="currentColor" stroke-width="1.6" />
            </svg>
          </span>

          <span class="type__body">
            <span class="type__name">Компанія</span>
            <span class="type__hint">Бригади, кошториси, спільні доступи</span>
          </span>

          <span class="type__tick" aria-hidden="true">
            <svg viewBox="0 0 14 14">
              <path
                d="M3 7.3l2.6 2.6L11 4.4"
                fill="none"
                stroke="currentColor"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </span>
        </button>
      </fieldset>

      <TextField
        v-model="form.name"
        label="Назва"
        :optional="!isCompany"
        :placeholder="isCompany ? 'ТОВ «БудКомпанія»' : ownerName"
        :hint="
          isCompany ? 'Її бачитимуть усі учасники простору.' : 'Порожнє поле — візьмемо ваше імʼя.'
        "
        :error="errors.name"
        autofocus
      />

      <p v-if="serverError" class="dialog__error" role="alert">{{ serverError }}</p>

      <div class="dialog__actions">
        <button type="button" class="btn btn--ghost" @click="emit('close')">Скасувати</button>

        <button type="submit" class="btn btn--primary dialog__submit" :disabled="saving">
          <span v-if="saving" class="spinner" aria-hidden="true" />
          <span>{{ saving ? 'Створюємо…' : 'Створити простір' }}</span>
          <svg v-if="!saving" class="btn__arrow" viewBox="0 0 18 18" aria-hidden="true">
            <path
              d="M3.5 9h11M10 4.5 14.5 9 10 13.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 20px;
  overflow-y: auto;
  background: rgb(9 13 10 / 46%);
  backdrop-filter: blur(6px);
}

.dialog {
  display: grid;
  align-content: start;
  gap: 22px;
  width: min(640px, 100%);
  padding: 34px;
  border-radius: var(--r-xl);
  background: var(--paper-raised);
  box-shadow: var(--shadow-lg);
}

.dialog__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.dialog__title {
  margin-top: 6px;
  font-family: var(--font-display);
  font-size: 27px;
  font-weight: 600;
  letter-spacing: -0.03em;
}

.dialog__close {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 12px;
  background: var(--paper-sunk);
  color: var(--ink-muted);
  transition:
    background-color 0.2s var(--ease),
    color 0.2s var(--ease);
}

.dialog__close:hover {
  background: var(--ink);
  color: #fff;
}

.dialog__close svg {
  width: 15px;
  height: 15px;
}

.types {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 0;
  padding: 0;
  border: 0;
}

.types__legend {
  padding: 0;
  margin-bottom: 9px;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* Вибір позначаємо рамкою, кільцем і галочкою — без заливки градієнтом. */
.type {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper);
  text-align: left;
  transition:
    border-color 0.2s var(--ease),
    background-color 0.2s var(--ease),
    box-shadow 0.2s var(--ease),
    transform 0.2s var(--ease);
}

.type:hover:not(:disabled) {
  transform: translateY(-2px);
  border-color: var(--line-strong);
  background: var(--paper-raised);
}

.type:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.type--on {
  border-color: var(--brand);
  background: var(--paper-raised);
  box-shadow:
    0 0 0 2px var(--brand-glow),
    var(--shadow-md);
}

.type__icon {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--paper-sunk);
  color: var(--ink-muted);
  transition:
    background-color 0.2s var(--ease),
    color 0.2s var(--ease);
}

.type--on .type__icon {
  background: var(--brand);
  color: #08210a;
}

.type__icon svg {
  width: 18px;
  height: 18px;
}

.type__body {
  display: grid;
  gap: 3px;
  padding-right: 18px;
}

.type__name {
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.type__hint {
  font-size: 12px;
  line-height: 1.4;
  color: var(--ink-muted);
}

.type__tick {
  position: absolute;
  top: 14px;
  right: 14px;
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--brand);
  color: #08210a;
  opacity: 0;
  transform: scale(0.6);
  transition:
    opacity 0.2s var(--ease),
    transform 0.2s var(--ease);
}

.type--on .type__tick {
  opacity: 1;
  transform: scale(1);
}

.type__tick svg {
  width: 11px;
  height: 11px;
}

.dialog__error {
  padding: 12px 14px;
  border: 1px solid rgb(200 52 31 / 30%);
  border-radius: var(--r-md);
  background: var(--danger-tint);
  color: var(--danger);
  font-size: 13px;
}

.dialog__actions {
  display: flex;
  gap: 10px;
  padding-top: 2px;
}

.dialog__submit {
  flex: 1;
}

@media (width <= 560px) {
  .dialog {
    padding: 24px;
  }

  .types {
    grid-template-columns: 1fr;
  }
}
</style>
