<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useDismissable } from '@/composables/useDismissable'
import { employeeMeta, type Employee } from '@/lib/employees'
import { monogram } from '@/lib/workspaces'

const props = defineProps<{
  employees: Employee[]
  loading: boolean
  /** Кого вже призначено на цю роботу — двічі ту саму людину не беремо. */
  taken?: number[]
  invalid?: boolean
}>()

const model = defineModel<number | null>({ required: true })

const id = useId()
const listId = `${id}-list`

const root = useTemplateRef<HTMLElement>('root')
const trigger = useTemplateRef<HTMLButtonElement>('trigger')
const search = useTemplateRef<HTMLInputElement>('search')

const open = ref(false)
const query = ref('')
const active = ref(0)

useDismissable(root, open)

const selected = computed(
  () => props.employees.find((employee) => employee.id === model.value) ?? null,
)

/** Уже зайняті ховаємо, але свій вибір лишаємо — інакше він зникне зі списку. */
const free = computed(() =>
  props.employees.filter(
    (employee) => employee.id === model.value || !(props.taken ?? []).includes(employee.id),
  ),
)

const matches = computed(() => {
  const needle = query.value.trim().toLowerCase()

  if (needle === '') {
    return free.value
  }

  return free.value.filter((employee) =>
    `${employee.name} ${employee.role} ${employee.crew}`.toLowerCase().includes(needle),
  )
})

watch(query, () => (active.value = 0))

function optionId(index: number): string {
  return `${id}-option-${index}`
}

async function show(): Promise<void> {
  open.value = true
  query.value = ''
  active.value = Math.max(
    0,
    free.value.findIndex((employee) => employee.id === model.value),
  )

  await nextTick()
  search.value?.focus()
}

function hide(): void {
  open.value = false
  query.value = ''
}

function toggle(): void {
  if (open.value) {
    hide()

    return
  }

  void show()
}

function choose(employee: Employee): void {
  model.value = employee.id
  hide()
  trigger.value?.focus()
}

function move(step: number): void {
  const total = matches.value.length

  if (total === 0) {
    return
  }

  active.value = (active.value + step + total) % total
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    move(event.key === 'ArrowDown' ? 1 : -1)

    return
  }

  if (event.key === 'Tab') {
    hide()

    return
  }

  if (event.key !== 'Enter') {
    return
  }

  // Форма не має відправлятись, поки людина обирає у списку.
  event.preventDefault()

  const employee = matches.value[active.value]

  if (employee !== undefined) {
    choose(employee)
  }
}
</script>

<template>
  <div ref="root" class="wpick">
    <button
      :id="id"
      ref="trigger"
      type="button"
      class="wpick__btn"
      :class="{ 'wpick__btn--bad': invalid, 'wpick__btn--empty': !selected }"
      role="combobox"
      aria-haspopup="listbox"
      :aria-invalid="invalid ? 'true' : undefined"
      :aria-expanded="open"
      :aria-controls="listId"
      :aria-label="selected ? `Виконавець: ${selected.name}` : 'Оберіть виконавця'"
      @click="toggle"
      @keydown.down.prevent="show"
    >
      <span class="wpick__mono" :class="{ 'wpick__mono--empty': !selected }" aria-hidden="true">
        <template v-if="selected">{{ monogram(selected.name) }}</template>
        <AppIcon v-else name="user" />
      </span>

      <span class="wpick__name">{{ selected ? selected.name : 'Оберіть виконавця' }}</span>

      <AppIcon name="chevron" class="wpick__chevron" />
    </button>

    <Transition name="pop">
      <div v-if="open" class="menu">
        <div class="menu__search">
          <AppIcon name="search" class="menu__icon" />
          <input
            ref="search"
            v-model="query"
            class="menu__input"
            type="text"
            autocomplete="off"
            aria-label="Пошук співробітника"
            placeholder="Ім’я, спеціальність або бригада"
            :aria-controls="listId"
            :aria-activedescendant="matches.length > 0 ? optionId(active) : undefined"
            @keydown="onKeydown"
          />
        </div>

        <p v-if="loading" class="menu__note">Завантажуємо співробітників…</p>

        <ul v-else :id="listId" class="menu__list" role="listbox" aria-label="Співробітники">
          <li
            v-for="(employee, index) in matches"
            :id="optionId(index)"
            :key="employee.id"
            class="opt"
            :class="{ 'opt--on': index === active }"
            role="option"
            :aria-selected="employee.id === model"
            @mouseenter="active = index"
            @click="choose(employee)"
          >
            <span class="opt__mono" aria-hidden="true">{{ monogram(employee.name) }}</span>

            <span class="opt__body">
              <span class="opt__name">{{ employee.name }}</span>
              <span class="opt__meta">{{ employeeMeta(employee) }}</span>
            </span>

            <AppIcon v-if="employee.id === model" name="check" class="opt__tick" />
          </li>

          <li v-if="matches.length === 0" class="menu__note">
            Нікого не знайшли. Довідник співробітників зʼявиться в наступному блоці.
          </li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.wpick {
  position: relative;
  min-width: 0;
}

.wpick__btn {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 36px;
  padding: 0 8px 0 5px;
  border: 1px solid var(--line);
  border-radius: var(--r-xs);
  background: var(--paper-raised);
  text-align: left;
  transition:
    border-color 0.16s var(--ease),
    box-shadow 0.16s var(--ease);
}

.wpick__btn:hover {
  border-color: var(--line-strong);
}

.wpick__btn--bad,
.wpick__btn--bad:hover {
  border-color: rgb(200 52 31 / 45%);
  background: var(--danger-tint);
}

.wpick__btn:focus-visible,
.wpick__btn[aria-expanded='true'] {
  border-color: rgb(56 176 0 / 55%);
  box-shadow: 0 0 0 3px var(--brand-glow);
  outline: none;
}

.wpick__mono {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  border-radius: 9px;
  background: var(--brand-tint);
  color: var(--brand-strong);
  font-family: var(--font-display);
  font-size: 10.5px;
  font-weight: 600;
}

.wpick__mono--empty {
  background: var(--paper-sunk);
  color: var(--ink-faint);
}

.wpick__mono :deep(.icon) {
  width: 15px;
  height: 15px;
}

.wpick__name {
  font-size: 13.5px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.wpick__btn--empty .wpick__name {
  font-weight: 400;
  color: var(--ink-faint);
}

.wpick__chevron {
  width: 15px;
  height: 15px;
  color: var(--ink-faint);
  transition: transform 0.18s var(--ease);
}

.wpick__btn[aria-expanded='true'] .wpick__chevron {
  transform: rotate(180deg);
}

/* ── Список ────────────────────────────────────────────────────── */

.menu {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  z-index: 30;
  min-width: 100%;
  width: max-content;
  max-width: 320px;
  padding: 5px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--paper-raised);
  box-shadow: var(--shadow-md);
}

.menu__search {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 8px;
  border: 1px solid var(--line);
  border-radius: var(--r-xs);
  background: var(--paper);
}

.menu__search:focus-within {
  border-color: rgb(56 176 0 / 45%);
}

.menu__icon {
  flex: none;
  width: 15px;
  height: 15px;
  color: var(--ink-faint);
}

.menu__input {
  width: 100%;
  min-width: 0;
  height: 32px;
  border: 0;
  background: transparent;
  font-size: 13px;
  outline: none;
}

.menu__input::placeholder {
  color: var(--ink-faint);
}

.menu__list {
  display: grid;
  gap: 1px;
  max-height: 236px;
  margin: 4px 0 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
  scrollbar-width: thin;
}

.menu__note {
  padding: 10px;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--ink-faint);
}

.opt {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding: 6px 8px;
  border-radius: var(--r-xs);
  cursor: pointer;
  transition: background-color 0.14s var(--ease);
}

.opt--on {
  background: var(--paper-sunk);
}

.opt__mono {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  background: var(--paper-sunk);
  color: var(--ink-muted);
  font-family: var(--font-display);
  font-size: 10.5px;
  font-weight: 600;
}

.opt--on .opt__mono {
  background: var(--ink);
  color: #fff;
}

.opt__body {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.opt__name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.opt__meta {
  font-size: 11px;
  color: var(--ink-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.opt__tick {
  width: 15px;
  height: 15px;
  color: var(--brand-strong);
}

.pop-enter-active,
.pop-leave-active {
  transition:
    opacity 0.14s var(--ease),
    transform 0.14s var(--ease);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(-5px);
}
</style>
