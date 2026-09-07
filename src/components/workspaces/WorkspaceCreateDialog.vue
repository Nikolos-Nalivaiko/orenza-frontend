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
  NAME_MAX,
  validateWorkspaceForm,
  type WorkspaceErrors,
  type WorkspaceForm,
  type WorkspaceType,
} from '@/lib/workspaces'

const props = defineProps<{
  personalTaken: boolean
  ownerName: string
  saving: boolean
  serverError: string | null
  nameError?: string
}>()

const emit = defineEmits<{ submit: [form: WorkspaceForm]; close: []; dirty: [] }>()

const titleId = useId()
const typesId = useId()
const dialog = useTemplateRef<HTMLElement>('dialog')

const form = reactive<WorkspaceForm>({
  type: props.personalTaken ? 'company' : 'personal',
  name: '',
})

const errors = ref<WorkspaceErrors>({})

watch(form, () => {
  errors.value = {}
  emit('dirty')
})

const isCompany = computed(() => form.type === 'company')

const alert = computed(() => (props.nameError === undefined ? props.serverError : null))

const nameLength = computed(() => form.name.trim().length)

/** Підказка про гарячі клавіші має називати ту, що є на цій клавіатурі. */
const metaLabel = /mac/i.test(navigator.platform) ? '⌘' : 'Ctrl'

const types: { value: WorkspaceType; name: string; hint: string; perks: string[] }[] = [
  {
    value: 'personal',
    name: 'Особистий',
    hint: 'Для власних обʼєктів і кошторисів',
    perks: ['Бачите тільки ви', 'Один на акаунт'],
  },
  {
    value: 'company',
    name: 'Компанія',
    hint: 'Для роботи разом із бригадою',
    perks: ['Учасники та ролі', 'Спільні кошториси'],
  },
]

function disabledFor(type: WorkspaceType): boolean {
  return type === 'personal' && props.personalTaken
}

function choose(type: WorkspaceType): void {
  if (disabledFor(type)) {
    return
  }

  form.type = type
}

function onTypeKeydown(event: KeyboardEvent): void {
  if (!['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)) {
    return
  }

  const next = types.find((type) => type.value !== form.type)

  if (next === undefined || disabledFor(next.value)) {
    return
  }

  event.preventDefault()
  form.type = next.value
  ;(event.currentTarget as HTMLElement)
    .querySelector<HTMLElement>(`[data-type="${next.value}"]`)
    ?.focus()
}

function submit(): void {
  errors.value = validateWorkspaceForm(form)

  if (Object.keys(errors.value).length > 0) {
    return
  }

  emit('submit', { ...form })
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close')

    return
  }

  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    submit()

    return
  }

  if (event.key !== 'Tab' || dialog.value === null) {
    return
  }

  const focusable = [
    ...dialog.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), [href], [tabindex]',
    ),
  ].filter((element) => element.tabIndex >= 0)

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
      <header class="head">
        <div class="head__text">
          <p class="eyebrow">Крок до роботи</p>
          <h2 :id="titleId" class="head__title">Новий робочий простір</h2>
          <p class="head__lead">Простір — рамка для обʼєктів, кошторисів і команди.</p>
        </div>

        <button type="button" class="close" aria-label="Закрити" @click="emit('close')">
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

      <section class="section">
        <p :id="typesId" class="section__label">Тип простору</p>

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
            :disabled="disabledFor(type.value)"
            @click="choose(type.value)"
          >
            <span class="type__sheen" aria-hidden="true" />

            <span class="type__row">
              <span class="type__icon" aria-hidden="true">
                <svg v-if="type.value === 'personal'" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="7" r="3.2" stroke="currentColor" stroke-width="1.6" />
                  <path
                    d="M4 17c0-3 2.7-4.6 6-4.6s6 1.6 6 4.6"
                    stroke="currentColor"
                    stroke-width="1.6"
                    stroke-linecap="round"
                  />
                </svg>

                <svg v-else viewBox="0 0 20 20" fill="none">
                  <path
                    d="M2.5 17.5V5.8L9 3l6.5 2.8v11.7"
                    stroke="currentColor"
                    stroke-width="1.6"
                  />
                  <path
                    d="M6.5 17.5v-5h5v5M17.5 17.5h-15"
                    stroke="currentColor"
                    stroke-width="1.6"
                  />
                </svg>
              </span>

              <span class="dot" aria-hidden="true">
                <svg viewBox="0 0 14 14">
                  <path
                    d="M3 7.3l2.6 2.6L11 4.4"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2.4"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </span>
            </span>

            <span class="type__name">{{ type.name }}</span>
            <span class="type__hint">
              {{ disabledFor(type.value) ? 'Уже створений' : type.hint }}
            </span>

            <span class="type__perks">
              <span v-for="perk in type.perks" :key="perk" class="type__perk">
                <svg viewBox="0 0 12 12" aria-hidden="true">
                  <path
                    d="M2.4 6.2l2.3 2.3L9.6 3.6"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                {{ perk }}
              </span>
            </span>
          </button>
        </div>
      </section>

      <section class="section">
        <div class="name">
          <TextField
            v-model="form.name"
            label="Назва"
            :optional="!isCompany"
            :placeholder="isCompany ? 'ТОВ «БудКомпанія»' : ownerName"
            :hint="
              isCompany
                ? 'Її бачитимуть усі учасники простору.'
                : 'Порожнє поле — візьмемо ваше імʼя.'
            "
            :error="errors.name ?? nameError"
            autofocus
          />

          <span
            v-if="nameLength > 0"
            class="name__count"
            :class="{ 'name__count--over': nameLength > NAME_MAX }"
          >
            {{ nameLength }}/{{ NAME_MAX }}
          </span>
        </div>
      </section>

      <p v-if="alert" class="error" role="alert">{{ alert }}</p>

      <footer class="foot">
        <div class="foot__actions">
          <button type="button" class="btn btn--ghost" @click="emit('close')">Скасувати</button>

          <button type="submit" class="btn btn--primary foot__submit" :disabled="saving">
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

        <p class="foot__kbd">
          <kbd>{{ metaLabel }}</kbd
          ><kbd>↵</kbd> створити · <kbd>Esc</kbd> закрити
        </p>
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
  gap: 30px;
  width: min(780px, 100%);
  padding: 46px 48px 38px;
  border-radius: var(--r-xl);
  background: var(--paper-raised);
  box-shadow: var(--shadow-lg);
}

/* ── Шапка ─────────────────────────────────────────────────────── */

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
  font-size: 28px;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.1;
}

.head__lead {
  max-width: 38ch;
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

.close svg {
  width: 15px;
  height: 15px;
}

/* ── Секції ────────────────────────────────────────────────────── */

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

/* ── Картки типу ───────────────────────────────────────────────── */

.types {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

/*
 * Невибрана картка — тиха плашка на «втопленому» папері без рамки.
 * Вибрана піднімається до білого, отримує зелене кільце і світло згори.
 */
.type {
  position: relative;
  display: grid;
  gap: 6px;
  overflow: hidden;
  padding: 20px 20px 18px;
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

.type:hover:not(:disabled) {
  transform: translateY(-2px);
  background: var(--paper);
  border-color: var(--line);
  box-shadow: var(--shadow-sm);
}

.type:active:not(:disabled) {
  transform: translateY(0) scale(0.995);
}

.type:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.type--on {
  background: var(--paper-raised);
  border-color: var(--brand);
  box-shadow:
    0 0 0 3px var(--brand-glow),
    var(--shadow-md);
}

.type--on:hover:not(:disabled) {
  border-color: var(--brand);
  box-shadow:
    0 0 0 3px var(--brand-glow),
    var(--shadow-md);
}

/* Зелене світло з верхнього кута — вмикається разом із вибором. */
.type__sheen {
  position: absolute;
  inset: -60% -30% auto -30%;
  height: 130%;
  background: radial-gradient(circle at 50% 0, var(--brand-tint), transparent 62%);
  opacity: 0;
  transition: opacity 0.3s var(--ease);
}

.type--on .type__sheen {
  opacity: 1;
}

.type__row {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.type__icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 15px;
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

.type__icon svg {
  width: 20px;
  height: 20px;
}

/* Кільце праворуч: порожнє — поки тип не обраний, з галочкою — коли обраний. */
.dot {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 1.5px solid var(--line-strong);
  border-radius: 50%;
  background: transparent;
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

.dot svg {
  width: 12px;
  height: 12px;
  transform: scale(0.5);
  transition: transform 0.22s var(--ease);
}

.type--on .dot svg {
  transform: scale(1);
}

.type__name {
  position: relative;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.type__hint {
  position: relative;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--ink-muted);
}

.type__perks {
  position: relative;
  display: grid;
  gap: 5px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.type__perk {
  display: grid;
  grid-template-columns: 12px 1fr;
  gap: 7px;
  align-items: center;
  font-size: 11.5px;
  line-height: 1.35;
  color: var(--ink-faint);
  transition: color 0.24s var(--ease);
}

.type--on .type__perk {
  color: var(--ink-muted);
}

.type__perk svg {
  width: 12px;
  height: 12px;
  color: var(--line-strong);
  transition: color 0.24s var(--ease);
}

.type--on .type__perk svg {
  color: var(--brand-strong);
}

/* ── Назва ─────────────────────────────────────────────────────── */

/* Лічильник ставимо в рядок підпису поля — праворуч від «Назва». */
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

.error {
  padding: 12px 14px;
  border: 1px solid rgb(200 52 31 / 30%);
  border-radius: var(--r-md);
  background: var(--danger-tint);
  color: var(--danger);
  font-size: 13px;
}

/* ── Низ ───────────────────────────────────────────────────────── */

.foot {
  display: grid;
  gap: 14px;
  padding-top: 26px;
  border-top: 1px solid var(--line);
}

.foot__actions {
  display: flex;
  gap: 10px;
}

.foot__submit {
  flex: 1;
}

.foot__kbd {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 11.5px;
  color: var(--ink-faint);
}

.foot__kbd kbd {
  display: inline-grid;
  place-items: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border: 1px solid var(--line);
  border-bottom-width: 2px;
  border-radius: 6px;
  background: var(--paper);
  font-family: inherit;
  font-size: 11px;
  color: var(--ink-muted);
}

@media (width <= 560px) {
  .dialog {
    gap: 24px;
    padding: 28px 24px 24px;
  }

  .head__title {
    font-size: 24px;
  }

  .types {
    grid-template-columns: 1fr;
  }

  /* У вузькій колонці картки стають рядками — перелік переваг зайвий. */
  .type__perks {
    display: none;
  }

  .foot__kbd {
    display: none;
  }
}
</style>
