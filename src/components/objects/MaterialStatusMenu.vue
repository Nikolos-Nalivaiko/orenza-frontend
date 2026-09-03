<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useDismissable } from '@/composables/useDismissable'
import { MATERIAL_STATUS_ICONS, MATERIAL_STATUSES, type MaterialStatus } from '@/lib/materials'

/**
 * Стадія закупівлі міняється прямо в рядку таблиці, без заходу в редагування
 * позиції: людина з майданчика відмічає «доставлено» одним дотиком, і саме
 * від цього залежить, чи вестимуть цей список узагалі.
 */

const props = defineProps<{ status: MaterialStatus; label: string; name: string }>()

const emit = defineEmits<{ change: [status: MaterialStatus] }>()

const root = useTemplateRef<HTMLElement>('root')

const open = ref(false)

useDismissable(root, open)

function choose(status: MaterialStatus): void {
  open.value = false

  if (status !== props.status) {
    emit('change', status)
  }
}
</script>

<template>
  <div ref="root" class="pick">
    <button
      type="button"
      class="pick__btn"
      :class="`pick__btn--${status}`"
      :aria-expanded="open"
      :aria-label="`Стадія закупівлі: ${label}. Матеріал «${name}»`"
      @click="open = !open"
    >
      <AppIcon :name="MATERIAL_STATUS_ICONS[status]" class="pick__icon" />
      <span class="pick__label">{{ label }}</span>
      <AppIcon name="chevron" class="pick__caret" :class="{ 'is-open': open }" />
    </button>

    <Transition name="pop">
      <ul v-if="open" class="menu" role="listbox" aria-label="Стадія закупівлі">
        <li
          v-for="option in MATERIAL_STATUSES"
          :key="option.value"
          class="opt"
          :class="[`opt--${option.value}`, { 'opt--picked': option.value === status }]"
          role="option"
          :aria-selected="option.value === status"
          @click="choose(option.value)"
        >
          <AppIcon :name="MATERIAL_STATUS_ICONS[option.value]" class="opt__icon" />
          <span>{{ option.label }}</span>
          <AppIcon v-if="option.value === status" name="check" class="opt__tick" />
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.pick {
  position: relative;
  min-width: 0;
}

.pick__btn {
  --tone: var(--ink-muted);
  --tone-tint: var(--paper-sunk);

  display: inline-flex;
  align-items: center;
  gap: 7px;
  width: 100%;
  min-width: 0;
  padding: 7px 8px 7px 11px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--tone-tint);
  color: var(--tone);
  font-size: 12.5px;
  font-weight: 600;
  transition:
    border-color 0.16s var(--ease),
    box-shadow 0.2s var(--ease);
}

.pick__btn:hover {
  border-color: var(--tone);
}

/* Кольори стадій ті самі, що й у зведенні над таблицею. */
.pick__btn--needed {
  --tone: #8a5c00;
  --tone-tint: var(--amber-tint);
}

.pick__btn--ordered {
  --tone: var(--c-4);
  --tone-tint: var(--c-4-soft);
}

.pick__btn--delivered {
  --tone: var(--brand-strong);
  --tone-tint: var(--brand-tint);
}

.pick__btn--used {
  --tone: var(--ink-soft);
  --tone-tint: var(--paper-sunk);
}

.pick__icon {
  width: 14px;
  height: 14px;
}

.pick__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pick__caret {
  width: 13px;
  height: 13px;
  margin-left: auto;
  opacity: 0.65;
  transition: transform 0.2s var(--ease);
}

.pick__caret.is-open {
  transform: rotate(180deg);
}

/* ── Меню ──────────────────────────────────────────────────────── */

.menu {
  position: absolute;
  top: calc(100% + 5px);
  left: 0;
  z-index: 25;
  display: grid;
  gap: 2px;
  width: max-content;
  min-width: 100%;
  margin: 0;
  padding: 5px;
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
  gap: 10px;
  padding: 9px 12px;
  border-radius: var(--r-xs);
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.14s var(--ease);
}

.opt:hover {
  background: var(--paper-sunk);
}

.opt__icon,
.opt__tick {
  width: 14px;
  height: 14px;
  color: var(--ink-faint);
}

.opt--picked {
  font-weight: 600;
}

.opt--picked .opt__icon,
.opt--picked .opt__tick {
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
