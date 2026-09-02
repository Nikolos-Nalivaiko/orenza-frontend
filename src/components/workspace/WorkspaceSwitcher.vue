<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useDismissable } from '@/composables/useDismissable'
import { monogram, WORKSPACE_TYPE_LABELS } from '@/lib/workspaces'
import { useWorkspacesStore } from '@/stores/workspaces'

defineProps<{ collapsed: boolean }>()

const workspaces = useWorkspacesStore()
const router = useRouter()

const root = useTemplateRef<HTMLElement>('root')
const open = ref(false)

useDismissable(root, open)

const current = computed(() => workspaces.current)
const typeLabel = computed(() =>
  current.value === null ? '' : WORKSPACE_TYPE_LABELS[current.value.type.value],
)

function pick(id: number): void {
  open.value = false

  if (id !== workspaces.currentId) {
    workspaces.select(id)
  }
}

async function toAll(): Promise<void> {
  open.value = false
  await router.push({ name: 'workspaces' })
}
</script>

<template>
  <div ref="root" class="switch" :class="{ 'switch--collapsed': collapsed }">
    <button
      type="button"
      class="switch__btn"
      :aria-expanded="open"
      aria-haspopup="menu"
      :title="collapsed ? (current?.name ?? 'Простір') : undefined"
      @click="open = !open"
    >
      <span class="switch__mono" aria-hidden="true">{{ monogram(current?.name ?? 'Orenza') }}</span>

      <span v-if="!collapsed" class="switch__text">
        <span class="switch__name">{{ current?.name }}</span>
        <span class="switch__type">{{ typeLabel }}</span>
      </span>

      <AppIcon
        v-if="!collapsed"
        name="chevron"
        class="switch__caret"
        :class="{ 'switch__caret--up': open }"
      />
    </button>

    <Transition name="pop">
      <div v-if="open" class="menu" role="menu">
        <p class="menu__head">Робочі простори</p>

        <button
          v-for="item in workspaces.items"
          :key="item.id"
          type="button"
          class="menu__item"
          :class="{ 'menu__item--on': item.id === workspaces.currentId }"
          role="menuitem"
          @click="pick(item.id)"
        >
          <span class="menu__mono" aria-hidden="true">{{ monogram(item.name) }}</span>
          <span class="menu__body">
            <span class="menu__name">{{ item.name }}</span>
            <span class="menu__type">{{ WORKSPACE_TYPE_LABELS[item.type.value] }}</span>
          </span>
          <AppIcon v-if="item.id === workspaces.currentId" name="check" class="menu__check" />
        </button>

        <hr class="hairline" />

        <button type="button" class="menu__all" role="menuitem" @click="toAll">
          <AppIcon name="swap" />
          Усі простори
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.switch {
  position: relative;
}

.switch__btn {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 11px;
  width: 100%;
  padding: 9px 10px;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  background: transparent;
  text-align: left;
  transition:
    background-color 0.18s var(--ease),
    border-color 0.18s var(--ease);
}

.switch__btn:hover,
.switch__btn[aria-expanded='true'] {
  border-color: var(--line);
  background: var(--paper-raised);
}

.switch--collapsed .switch__btn {
  grid-template-columns: 1fr;
  justify-items: center;
  padding: 9px 0;
}

.switch__mono {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--ink);
  color: #fff;
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.switch__text {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.switch__name {
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.switch__type {
  font-size: 11px;
  color: var(--ink-faint);
}

.switch__caret {
  width: 16px;
  height: 16px;
  color: var(--ink-faint);
  transition: transform 0.22s var(--ease);
}

.switch__caret--up {
  transform: rotate(180deg);
}

.menu {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 30;
  display: grid;
  gap: 2px;
  width: max(100%, 240px);
  padding: 8px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-raised);
  box-shadow: var(--shadow-md);
}

.menu__head {
  padding: 4px 8px 6px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.menu__item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  padding: 7px 8px;
  border: 0;
  border-radius: var(--r-xs);
  background: transparent;
  text-align: left;
  transition: background-color 0.16s var(--ease);
}

.menu__item:hover {
  background: var(--paper-sunk);
}

.menu__mono {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 9px;
  background: var(--paper-sunk);
  color: var(--ink-muted);
  font-size: 11px;
  font-weight: 700;
}

.menu__item--on .menu__mono {
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.menu__body {
  display: grid;
  min-width: 0;
}

.menu__name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu__type {
  font-size: 11px;
  color: var(--ink-faint);
}

.menu__check {
  width: 15px;
  height: 15px;
  color: var(--brand-strong);
}

.menu .hairline {
  margin: 6px 0;
}

.menu__all {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px;
  border: 0;
  border-radius: var(--r-xs);
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  transition: background-color 0.16s var(--ease);
}

.menu__all:hover {
  background: var(--paper-sunk);
}

.menu__all :deep(.icon) {
  width: 17px;
  height: 17px;
  color: var(--ink-faint);
}

.pop-enter-active,
.pop-leave-active {
  transition:
    opacity 0.18s var(--ease),
    transform 0.18s var(--ease);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>
