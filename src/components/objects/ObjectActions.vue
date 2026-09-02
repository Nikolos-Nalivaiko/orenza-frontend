<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useDismissable } from '@/composables/useDismissable'

defineProps<{
  archived: boolean
  /** Порожній обʼєкт можна видалити; з історією — лише в архів. */
  removable: boolean
}>()

const emit = defineEmits<{ archive: []; remove: [] }>()

const root = useTemplateRef<HTMLElement>('root')
const open = ref(false)

useDismissable(root, open)

function close(): void {
  open.value = false
}
</script>

<template>
  <div ref="root" class="actions">
    <button
      type="button"
      class="actions__trigger"
      :aria-expanded="open"
      aria-label="Дії з обʼєктом"
      title="Дії з обʼєктом"
      @click="open = !open"
    >
      <AppIcon name="settings" />
    </button>

    <Transition name="pop">
      <ul v-if="open" class="menu">
        <li>
          <!-- Форма редагування — наступний крок; кнопка стоїть на своєму місці,
               але поки чесно вимкнена. -->
          <button type="button" class="item" disabled>
            <AppIcon name="document" />
            <span>Редагувати</span>
            <span class="item__soon">скоро</span>
          </button>
        </li>

        <li><hr class="hairline" /></li>

        <li>
          <button type="button" class="item" @click="(close(), emit('archive'))">
            <AppIcon name="box" />
            <span>{{ archived ? 'Повернути з архіву' : 'Архівувати' }}</span>
          </button>
        </li>

        <li>
          <button
            type="button"
            class="item item--danger"
            :title="
              removable
                ? undefined
                : 'В обʼєкті вже є матеріали, роботи чи платежі — його можна лише архівувати'
            "
            @click="(close(), emit('remove'))"
          >
            <AppIcon name="trash" />
            <span>Видалити</span>
          </button>
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.actions {
  position: relative;
}

.actions__trigger {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-raised);
  color: var(--ink-muted);
  transition:
    border-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.actions__trigger:hover {
  border-color: var(--line-strong);
  color: var(--ink);
}

.actions__trigger :deep(.icon) {
  width: 18px;
  height: 18px;
}

.menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  z-index: 25;
  display: grid;
  gap: 2px;
  width: 232px;
  margin: 0;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-raised);
  box-shadow: var(--shadow-md);
  list-style: none;
}

.menu .hairline {
  margin: 4px 0;
}

.item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border: 0;
  border-radius: var(--r-xs);
  background: transparent;
  font-size: 13.5px;
  text-align: left;
  transition: background-color 0.14s var(--ease);
}

.item:hover:not(:disabled) {
  background: var(--paper-sunk);
}

.item:disabled {
  color: var(--ink-faint);
  cursor: not-allowed;
}

.item :deep(.icon) {
  width: 16px;
  height: 16px;
  color: var(--ink-faint);
}

.item__soon {
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.item--danger {
  color: var(--danger);
}

.item--danger :deep(.icon) {
  color: var(--danger);
}

.item--danger:hover:not(:disabled) {
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
