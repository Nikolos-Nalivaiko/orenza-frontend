<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useDismissable } from '@/composables/useDismissable'
import type { Client } from '@/lib/objects'
import { monogram } from '@/lib/workspaces'

const props = defineProps<{
  clients: Client[]
  loading: boolean
  error?: string
}>()

const emit = defineEmits<{ create: [name: string] }>()

const model = defineModel<number | null>({ required: true })

const id = useId()
const listId = `${id}-list`

const root = useTemplateRef<HTMLElement>('root')
const search = useTemplateRef<HTMLInputElement>('search')

const open = ref(false)
const query = ref('')
const active = ref(0)

useDismissable(root, open)

const selected = computed(() => props.clients.find((client) => client.id === model.value) ?? null)

const matches = computed(() => {
  const needle = query.value.trim().toLowerCase()

  if (needle === '') {
    return props.clients
  }

  return props.clients.filter(
    (client) =>
      client.name.toLowerCase().includes(needle) || client.contact.toLowerCase().includes(needle),
  )
})

/** Нового замовника пропонуємо лише коли такого імені ще немає. */
const newName = computed(() => query.value.trim())
const canCreate = computed(
  () =>
    newName.value.length >= 2 &&
    !props.clients.some((client) => client.name.toLowerCase() === newName.value.toLowerCase()),
)

const total = computed(() => matches.value.length + (canCreate.value ? 1 : 0))
const creatingActive = computed(() => canCreate.value && active.value === matches.value.length)

watch(query, () => (active.value = 0))

function optionId(index: number): string {
  return `${id}-option-${index}`
}

async function start(): Promise<void> {
  open.value = true
  query.value = ''
  active.value = 0

  await nextTick()
  search.value?.focus()
}

function choose(client: Client): void {
  model.value = client.id
  open.value = false
  query.value = ''
}

function createFromQuery(): void {
  emit('create', newName.value)
  open.value = false
  query.value = ''
}

function clear(): void {
  model.value = null
}

function move(step: number): void {
  if (total.value === 0) {
    return
  }

  open.value = true
  active.value = (active.value + step + total.value) % total.value
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    move(event.key === 'ArrowDown' ? 1 : -1)

    return
  }

  if (event.key !== 'Enter') {
    return
  }

  // Форма не має відправлятись, поки людина обирає у списку.
  event.preventDefault()

  if (creatingActive.value) {
    createFromQuery()

    return
  }

  const client = matches.value[active.value]

  if (client !== undefined) {
    choose(client)
  }
}
</script>

<template>
  <div ref="root" class="client" :class="{ 'client--invalid': error }">
    <!-- Обраний замовник — картка, а не рядок: видно, з ким саме договір. -->
    <div v-if="selected && !open" class="picked">
      <span class="picked__mono" aria-hidden="true">{{ monogram(selected.name) }}</span>

      <span class="picked__body">
        <span class="picked__name">{{ selected.name }}</span>
        <span class="picked__meta">
          {{ selected.contact }}
          <template v-if="selected.phone"> · {{ selected.phone }}</template>
        </span>
      </span>

      <span class="picked__actions">
        <button type="button" class="picked__btn" @click="start">Змінити</button>
        <button type="button" class="picked__btn picked__btn--drop" @click="clear">
          Відвʼязати
        </button>
      </span>
    </div>

    <div v-else class="client__field">
      <div class="client__shell">
        <span class="client__accent" aria-hidden="true" />
        <AppIcon name="search" class="client__icon" />

        <input
          :id="id"
          ref="search"
          v-model="query"
          class="client__input"
          type="text"
          role="combobox"
          autocomplete="off"
          aria-label="Замовник"
          placeholder="Почніть вводити назву замовника"
          :aria-expanded="open"
          :aria-controls="listId"
          :aria-activedescendant="open && total > 0 ? optionId(active) : undefined"
          @focus="open = true"
          @keydown="onKeydown"
        />

        <span v-if="loading" class="spinner client__spinner" aria-hidden="true" />
      </div>

      <Transition name="pop">
        <div v-if="open" class="menu">
          <p v-if="loading" class="menu__note">Завантажуємо замовників…</p>

          <ul v-else :id="listId" class="menu__list" role="listbox" aria-label="Замовники">
            <li
              v-for="(client, index) in matches"
              :id="optionId(index)"
              :key="client.id"
              class="opt"
              :class="{ 'opt--on': index === active, 'opt--picked': client.id === model }"
              role="option"
              :aria-selected="client.id === model"
              @mouseenter="active = index"
              @click="choose(client)"
            >
              <span class="opt__mono" aria-hidden="true">{{ monogram(client.name) }}</span>

              <span class="opt__body">
                <span class="opt__name">{{ client.name }}</span>
                <span class="opt__meta">{{ client.contact }}</span>
              </span>

              <AppIcon v-if="client.id === model" name="check" class="opt__tick" />
            </li>

            <li
              v-if="canCreate"
              :id="optionId(matches.length)"
              class="opt opt--new"
              :class="{ 'opt--on': creatingActive }"
              role="option"
              :aria-selected="false"
              @mouseenter="active = matches.length"
              @click="createFromQuery"
            >
              <span class="opt__mono opt__mono--new" aria-hidden="true">
                <AppIcon name="plus" />
              </span>

              <span class="opt__body">
                <span class="opt__name">Додати «{{ newName }}»</span>
                <span class="opt__meta">Новий замовник у просторі</span>
              </span>
            </li>

            <li v-if="total === 0" class="menu__note">
              Нікого не знайшли. Введіть назву — і заведемо нового замовника.
            </li>
          </ul>
        </div>
      </Transition>
    </div>

    <p v-if="error" class="client__error" role="alert">{{ error }}</p>
  </div>
</template>

<style scoped>
.client {
  display: grid;
  gap: 7px;
}

/* Список випадає з поля, а не з усього блоку — інакше він накриває підказку. */
.client__field {
  position: relative;
}

.client__shell {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  padding: 0 16px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-raised);
  transition:
    border-color 0.2s var(--ease),
    box-shadow 0.2s var(--ease);
}

.client__shell:hover {
  border-color: var(--line-strong);
}

.client__shell:focus-within {
  border-color: rgb(56 176 0 / 55%);
  box-shadow: 0 0 0 4px var(--brand-glow);
}

.client__accent {
  position: absolute;
  inset: auto auto auto 0;
  width: 3px;
  height: 0;
  background: var(--brand);
  transition: height 0.25s var(--ease);
}

.client__shell:focus-within .client__accent {
  height: 60%;
}

.client__icon {
  width: 17px;
  height: 17px;
  color: var(--ink-faint);
}

.client__input {
  width: 100%;
  min-width: 0;
  min-height: 52px;
  border: 0;
  background: transparent;
  font-size: 15px;
  letter-spacing: -0.01em;
  outline: none;
}

.client__input::placeholder {
  color: var(--ink-faint);
}

.client__spinner {
  flex: none;
  color: var(--ink-faint);
}

/* ── Обраний ───────────────────────────────────────────────────── */

.picked {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 12px;
  min-height: 54px;
  padding: 8px 12px 8px 10px;
  border: 1px solid var(--brand);
  border-radius: var(--r-md);
  background: var(--paper-raised);
  box-shadow: 0 0 0 3px var(--brand-glow);
  animation: pick 0.26s var(--ease);
}

@keyframes pick {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
}

.picked__mono {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--brand-tint);
  color: var(--brand-strong);
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
}

.picked__body {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.picked__name {
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.picked__meta {
  font-size: 12px;
  color: var(--ink-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.picked__actions {
  display: flex;
  gap: 6px;
}

.picked__btn {
  padding: 7px 12px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  white-space: nowrap;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.picked__btn:hover {
  border-color: var(--ink);
  background: rgb(12 17 14 / 4%);
}

.picked__btn--drop {
  border-color: transparent;
  color: var(--ink-faint);
}

.picked__btn--drop:hover {
  border-color: transparent;
  background: var(--danger-tint);
  color: var(--danger);
}

/* ── Список ────────────────────────────────────────────────────── */

.menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  z-index: 25;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-raised);
  box-shadow: var(--shadow-md);
}

.menu__list {
  display: grid;
  gap: 2px;
  max-height: 268px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
  scrollbar-width: thin;
}

.menu__note {
  padding: 10px 12px;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--ink-faint);
}

.opt {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
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
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: var(--paper-sunk);
  color: var(--ink-muted);
  font-family: var(--font-display);
  font-size: 11px;
  font-weight: 600;
}

.opt--on .opt__mono {
  background: var(--ink);
  color: #fff;
}

.opt__mono--new {
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.opt--on .opt__mono--new {
  background: var(--brand);
  color: #08210a;
}

.opt__mono--new :deep(.icon) {
  width: 15px;
  height: 15px;
}

.opt__body {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.opt__name {
  font-size: 13.5px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.opt__meta {
  font-size: 11.5px;
  color: var(--ink-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.opt__tick {
  width: 16px;
  height: 16px;
  color: var(--brand-strong);
}

.opt--picked .opt__name {
  color: var(--brand-strong);
}

.client__error,
.client__hint {
  font-size: 12.5px;
}

.client__error {
  color: var(--danger);
}

.client__hint {
  color: var(--ink-faint);
}

.client--invalid .client__shell {
  border-color: rgb(200 52 31 / 45%);
  background: var(--danger-tint);
}

.pop-enter-active,
.pop-leave-active {
  transition:
    opacity 0.16s var(--ease),
    transform 0.16s var(--ease);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
