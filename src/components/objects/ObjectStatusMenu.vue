<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import StatusBadge from '@/components/objects/StatusBadge.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useDismissable } from '@/composables/useDismissable'
import { OBJECT_STATUSES, type ObjectStatus } from '@/lib/objects'

const props = defineProps<{ status: ObjectStatus; label: string }>()

const emit = defineEmits<{ change: [status: ObjectStatus] }>()

const root = useTemplateRef<HTMLElement>('root')

const open = ref(false)
const justChanged = ref(false)

useDismissable(root, open)

function choose(status: ObjectStatus): void {
  open.value = false

  if (status === props.status) {
    return
  }

  emit('change', status)

  // Коротка підсвітка замість тосту: зміна помітна там, де її зробили.
  justChanged.value = true
  setTimeout(() => (justChanged.value = false), 900)
}
</script>

<template>
  <div ref="root" class="smenu">
    <button
      type="button"
      class="smenu__trigger"
      :class="{ 'smenu__trigger--flash': justChanged }"
      :aria-expanded="open"
      title="Змінити статус"
      @click="open = !open"
    >
      <StatusBadge :status="status" :label="label" />
      <AppIcon name="chevron" class="smenu__caret" :class="{ 'is-open': open }" />
    </button>

    <Transition name="pop">
      <ul v-if="open" class="menu" role="listbox" aria-label="Статус обʼєкта">
        <li
          v-for="option in OBJECT_STATUSES"
          :key="option.value"
          class="opt"
          :class="{ 'opt--picked': option.value === status }"
          role="option"
          :aria-selected="option.value === status"
          @click="choose(option.value)"
        >
          <AppIcon :name="option.icon" class="opt__icon" />
          <span>{{ option.label }}</span>
          <AppIcon v-if="option.value === status" name="check" class="opt__tick" />
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.smenu {
  position: relative;
}

.smenu__trigger {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 6px 2px 2px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: transparent;
  transition:
    border-color 0.16s var(--ease),
    box-shadow 0.3s var(--ease);
}

.smenu__trigger:hover {
  border-color: var(--line-strong);
}

.smenu__trigger--flash {
  box-shadow: 0 0 0 3px var(--brand-glow);
}

.smenu__caret {
  width: 14px;
  height: 14px;
  color: var(--ink-faint);
  transition: transform 0.2s var(--ease);
}

.smenu__caret.is-open {
  transform: rotate(180deg);
}

.menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 25;
  display: grid;
  gap: 2px;
  width: max-content;
  min-width: 180px;
  margin: 0;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-raised);
  box-shadow: var(--shadow-md);
  list-style: none;
}

.opt {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 9px;
  padding: 8px 10px;
  border-radius: var(--r-xs);
  font-size: 13.5px;
  cursor: pointer;
  transition: background-color 0.14s var(--ease);
}

.opt:hover {
  background: var(--paper-sunk);
}

.opt__icon {
  width: 15px;
  height: 15px;
  color: var(--ink-faint);
}

.opt--picked {
  font-weight: 600;
  color: var(--brand-strong);
}

.opt--picked .opt__icon,
.opt__tick {
  color: var(--brand-strong);
}

.opt__tick {
  width: 15px;
  height: 15px;
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
