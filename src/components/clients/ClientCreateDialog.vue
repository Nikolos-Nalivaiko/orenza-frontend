<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, useId, watch } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import PhoneField from '@/components/ui/PhoneField.vue'
import TextField from '@/components/ui/TextField.vue'
import {
  emptyClientForm,
  hasClientErrors,
  validateClientForm,
  type ClientErrors,
  type ClientForm,
} from '@/lib/clients'
import type { ClientType } from '@/lib/objects'

const props = defineProps<{ saving?: boolean; serverError?: string | null }>()

const emit = defineEmits<{ create: [form: ClientForm]; close: []; dirty: [] }>()

const titleId = useId()
const typesId = useId()

const form = reactive<ClientForm>(emptyClientForm())
const errors = ref<ClientErrors>({})

watch(form, () => {
  errors.value = {}
  emit('dirty')
})

const isCompany = computed(() => form.type === 'company')

const types: { value: ClientType; label: string; hint: string; icon: 'user' | 'building' }[] = [
  { value: 'person', label: 'Особа', hint: 'Приватний замовник', icon: 'user' },
  { value: 'company', label: 'Компанія', hint: 'ТОВ, ФОП, школа, ОСББ', icon: 'building' },
]

function choose(type: ClientType): void {
  form.type = type
}

function onTypeKeydown(event: KeyboardEvent): void {
  if (!['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)) {
    return
  }

  event.preventDefault()
  form.type = isCompany.value ? 'person' : 'company'
  ;(event.currentTarget as HTMLElement)
    .querySelector<HTMLElement>(`[data-type="${form.type}"]`)
    ?.focus()
}

function submit(): void {
  errors.value = validateClientForm(form)

  if (hasClientErrors(errors.value)) {
    return
  }

  emit('create', { ...form })
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close')

    return
  }

  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    submit()
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
      class="dialog"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      novalidate
      @submit.prevent="submit"
    >
      <header class="head">
        <div class="head__text">
          <p class="eyebrow">Довідник</p>
          <h2 :id="titleId" class="head__title">Новий замовник</h2>
          <p class="head__lead">
            Обовʼязкове лише імʼя — решту дозаповните, коли буде що записувати.
          </p>
        </div>

        <button type="button" class="close" aria-label="Закрити" @click="emit('close')">
          <AppIcon name="close" />
        </button>
      </header>

      <section class="section">
        <p :id="typesId" class="section__label">Хто замовник</p>

        <div class="types" role="radiogroup" :aria-labelledby="typesId" @keydown="onTypeKeydown">
          <button
            v-for="type in types"
            :key="type.value"
            type="button"
            class="type"
            :class="{ 'type--on': form.type === type.value }"
            :data-type="type.value"
            role="radio"
            :aria-checked="form.type === type.value"
            :tabindex="form.type === type.value ? 0 : -1"
            @click="choose(type.value)"
          >
            <span class="type__icon" aria-hidden="true"><AppIcon :name="type.icon" /></span>

            <span class="type__body">
              <span class="type__name">{{ type.label }}</span>
              <span class="type__hint">{{ type.hint }}</span>
            </span>

            <span class="dot" aria-hidden="true">
              <AppIcon name="check" />
            </span>
          </button>
        </div>
      </section>

      <section class="section">
        <div class="grid">
          <TextField
            v-model="form.name"
            class="grid__wide"
            :label="isCompany ? 'Назва компанії' : 'Імʼя та прізвище'"
            autofocus
            :placeholder="isCompany ? 'ТОВ «Мегабуд»' : 'Олександр Романюк'"
            :error="errors.name"
          />

          <TextField
            v-if="isCompany"
            v-model="form.contact"
            class="grid__wide"
            label="Контактна особа"
            optional
            placeholder="З ким саме розмовляємо"
            hint="Той, хто підписує акти й погоджує роботи."
            :error="errors.contact"
          />

          <PhoneField v-model="form.phone" optional :error="errors.phone" />

          <TextField
            v-model="form.email"
            label="Пошта"
            optional
            type="email"
            inputmode="email"
            placeholder="office@company.ua"
            :error="errors.email"
          >
            <template #prefix><AppIcon name="mail" /></template>
          </TextField>
        </div>
      </section>

      <p v-if="serverError" class="error" role="alert">{{ serverError }}</p>

      <footer class="foot">
        <div class="foot__actions">
          <button type="button" class="btn btn--ghost" @click="emit('close')">Скасувати</button>

          <button type="submit" class="btn btn--primary foot__submit" :disabled="props.saving">
            <span v-if="props.saving" class="spinner" aria-hidden="true" />
            <span>{{ props.saving ? 'Зберігаємо…' : 'Завести замовника' }}</span>
          </button>
        </div>

        <p class="foot__note">Знижку й нотатки про роботу з замовником поставите в його картці.</p>
      </footer>
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
  gap: 26px;
  width: min(720px, 100%);
  padding: 40px 42px 32px;
  border-radius: var(--r-xl);
  background: var(--paper-raised);
  box-shadow: var(--shadow-lg);
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
}

.head__text {
  display: grid;
  gap: 8px;
}

.head__title {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.head__lead {
  max-width: 44ch;
  font-size: 14px;
  line-height: 1.5;
  color: var(--ink-muted);
}

.close {
  display: grid;
  place-items: center;
  flex: none;
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 50%;
  background: var(--paper-sunk);
  color: var(--ink-muted);
  transition:
    background-color 0.2s var(--ease),
    color 0.2s var(--ease),
    transform 0.25s var(--ease);
}

.close:hover {
  background: var(--ink);
  color: #fff;
  transform: rotate(90deg);
}

.close :deep(.icon) {
  width: 16px;
  height: 16px;
}

.section {
  display: grid;
  gap: 14px;
}

.section__label {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.types {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.type {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  padding: 16px 18px;
  border: 1px solid transparent;
  border-radius: var(--r-lg);
  background: var(--paper-sunk);
  text-align: left;
  transition:
    border-color 0.24s var(--ease),
    background-color 0.24s var(--ease),
    box-shadow 0.28s var(--ease),
    transform 0.24s var(--ease);
}

.type:hover {
  transform: translateY(-2px);
  border-color: var(--line);
  background: var(--paper);
  box-shadow: var(--shadow-sm);
}

.type--on {
  border-color: var(--brand);
  background: var(--paper-raised);
  box-shadow:
    0 0 0 3px var(--brand-glow),
    var(--shadow-md);
}

.type__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 14px;
  background: var(--paper-raised);
  color: var(--ink-muted);
  box-shadow: var(--shadow-sm);
  transition:
    background-color 0.24s var(--ease),
    color 0.24s var(--ease);
}

.type--on .type__icon {
  background: var(--brand);
  color: #08210a;
}

.type__icon :deep(.icon) {
  width: 19px;
  height: 19px;
}

.type__body {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.type__name {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.type__hint {
  font-size: 12px;
  color: var(--ink-muted);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.dot {
  display: grid;
  place-items: center;
  flex: none;
  width: 22px;
  height: 22px;
  border: 1.5px solid var(--line-strong);
  border-radius: 50%;
  color: transparent;
  transition:
    border-color 0.22s var(--ease),
    background-color 0.22s var(--ease),
    color 0.22s var(--ease);
}

.type--on .dot {
  border-color: var(--brand);
  background: var(--brand);
  color: #08210a;
}

.dot :deep(.icon) {
  width: 12px;
  height: 12px;
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 18px;
}

.grid__wide {
  grid-column: 1 / -1;
}

.error {
  padding: 12px 14px;
  border: 1px solid rgb(200 52 31 / 30%);
  border-radius: var(--r-md);
  background: var(--danger-tint);
  color: var(--danger);
  font-size: 13px;
}

.foot {
  display: grid;
  gap: 12px;
  padding-top: 24px;
  border-top: 1px solid var(--line);
}

.foot__actions {
  display: flex;
  gap: 10px;
}

.foot__submit {
  flex: 1;
}

.foot__note {
  font-size: 12px;
  color: var(--ink-faint);
}

@media (width <= 620px) {
  .dialog {
    gap: 22px;
    padding: 28px 24px 24px;
  }

  .types,
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
