<script setup lang="ts">
import { computed, nextTick, ref, useId, useTemplateRef, watch } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useDismissable } from '@/composables/useDismissable'
import type { ClientOption } from '@/lib/objectList'

const props = defineProps<{
  clients: ClientOption[]
  /** Скільки обʼєктів усього — підпис для «усіх замовників». */
  total: number
}>()

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

  return props.clients.filter((client) => client.name.toLowerCase().includes(needle))
})

/** «Усі замовники» — такий самий рядок списку, тож і в навігації він перший. */
const optionCount = computed(() => matches.value.length + 1)

watch(query, () => (active.value = 0))

function optionId(index: number): string {
  return `${id}-option-${index}`
}

async function toggle(): Promise<void> {
  open.value = !open.value

  if (!open.value) {
    return
  }

  query.value = ''
  active.value = selected.value === null ? 0 : matches.value.indexOf(selected.value) + 1

  await nextTick()
  search.value?.focus()
}

function choose(value: number | null): void {
  model.value = value
  open.value = false
  query.value = ''
}

function move(step: number): void {
  active.value = (active.value + step + optionCount.value) % optionCount.value
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

  event.preventDefault()

  if (active.value === 0) {
    choose(null)

    return
  }

  const client = matches.value[active.value - 1]

  if (client !== undefined) {
    choose(client.id)
  }
}
</script>

<template>
  <div ref="root" class="cfilter">
    <button
      :id="id"
      type="button"
      class="trigger"
      :class="{ 'trigger--on': selected !== null }"
      :aria-expanded="open"
      :aria-controls="listId"
      @click="toggle"
      @keydown="onKeydown"
    >
      <AppIcon name="user" class="trigger__icon" />
      <span class="trigger__text">{{ selected?.name ?? 'Усі замовники' }}</span>
      <AppIcon name="chevron" class="trigger__caret" :class="{ 'is-open': open }" />
    </button>

    <Transition name="pop">
      <div v-if="open" class="menu">
        <!-- Пошук стоїть завжди: у замовників схожі назви, і одне поле швидше
             за очі навіть на короткому списку. -->
        <div class="menu__search">
          <AppIcon name="search" />
          <input
            ref="search"
            v-model="query"
            type="text"
            autocomplete="off"
            aria-label="Пошук замовника"
            placeholder="Пошук замовника"
            @keydown="onKeydown"
          />
        </div>

        <ul :id="listId" class="menu__list" role="listbox" aria-label="Замовники">
          <li
            :id="optionId(0)"
            class="opt"
            :class="{ 'opt--on': active === 0, 'opt--picked': model === null }"
            role="option"
            :aria-selected="model === null"
            @mouseenter="active = 0"
            @click="choose(null)"
          >
            <span class="opt__name">Усі замовники</span>
            <span class="opt__count">{{ total }}</span>
            <AppIcon v-if="model === null" name="check" class="opt__tick" />
          </li>

          <li
            v-for="(client, index) in matches"
            :id="optionId(index + 1)"
            :key="client.id"
            class="opt"
            :class="{ 'opt--on': active === index + 1, 'opt--picked': client.id === model }"
            role="option"
            :aria-selected="client.id === model"
            @mouseenter="active = index + 1"
            @click="choose(client.id)"
          >
            <span class="opt__name">{{ client.name }}</span>
            <span class="opt__count">{{ client.count }}</span>
            <AppIcon v-if="client.id === model" name="check" class="opt__tick" />
          </li>

          <li v-if="matches.length === 0" class="menu__note">Такого замовника немає в списку</li>
        </ul>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.cfilter {
  position: relative;
  flex: none;
}

.trigger {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 240px;
  height: 40px;
  padding: 0 12px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-raised);
  font-size: 13.5px;
  font-weight: 500;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.trigger:hover {
  border-color: var(--line-strong);
}

/* Обраний замовник — це увімкнений фільтр, і він має бути видним здалеку. */
.trigger--on {
  border-color: var(--brand);
  background: var(--brand-tint);
  color: var(--brand-strong);
  font-weight: 600;
}

.trigger__icon {
  flex: none;
  width: 16px;
  height: 16px;
  color: var(--ink-faint);
}

.trigger--on .trigger__icon {
  color: var(--brand-strong);
}

.trigger__text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.trigger__caret {
  flex: none;
  width: 15px;
  height: 15px;
  color: var(--ink-faint);
  transition: transform 0.2s var(--ease);
}

.trigger__caret.is-open {
  transform: rotate(180deg);
}

/* ── Список ────────────────────────────────────────────────────── */

.menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 25;
  width: max(240px, 100%);
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-raised);
  box-shadow: var(--shadow-md);
}

.menu__search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: var(--r-xs);
  background: var(--paper);
}

.menu__search :deep(.icon) {
  flex: none;
  width: 15px;
  height: 15px;
  color: var(--ink-faint);
}

.menu__search input {
  width: 100%;
  min-width: 0;
  height: 34px;
  border: 0;
  background: transparent;
  font-size: 13px;
  outline: none;
}

.menu__list {
  display: grid;
  gap: 2px;
  /* Довгий список гортається всередині меню, а не тягне сторінку. */
  max-height: 264px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
  scrollbar-width: thin;
}

.menu__note {
  padding: 10px;
  font-size: 12.5px;
  color: var(--ink-faint);
}

.opt {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--r-xs);
  cursor: pointer;
  transition: background-color 0.14s var(--ease);
}

.opt--on {
  background: var(--paper-sunk);
}

.opt__name {
  font-size: 13.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.opt--picked .opt__name {
  font-weight: 600;
  color: var(--brand-strong);
}

.opt__count {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 11px;
  text-align: center;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.opt--on .opt__count {
  background: var(--paper-raised);
}

.opt__tick {
  width: 15px;
  height: 15px;
  color: var(--brand-strong);
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
