<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useTemplateRef } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useDismissable } from '@/composables/useDismissable'
import { trackPath } from '@/lib/objects'

/**
 * Посилання на публічну сторінку обʼєкта. Ховати його в меню дій не варто:
 * замовнику його кидають чи не щотижня, тож кнопка стоїть у шапці картки.
 *
 * Саму адресу показуємо цілком — людина має бачити, що саме зараз полетить
 * у месенджер, а не копіювати наосліп.
 */

const props = defineProps<{ token: string; name: string }>()

const root = useTemplateRef<HTMLElement>('root')
const input = useTemplateRef<HTMLInputElement>('input')

const open = ref(false)
const copied = ref(false)

let copiedTimer: number | undefined

useDismissable(root, open)

/** Домен бере браузер: у листі має бути повна адреса, а не шлях. */
const link = computed(() => `${window.location.origin}${trackPath(props.token)}`)

async function copy(): Promise<void> {
  input.value?.select()

  try {
    await navigator.clipboard.writeText(link.value)
  } catch {
    // Буфер недоступний (немає дозволу чи http) — текст лишається виділеним,
    // і його можна скопіювати вручну.
    return
  }

  copied.value = true
  window.clearTimeout(copiedTimer)
  copiedTimer = window.setTimeout(() => (copied.value = false), 1600)
}

onBeforeUnmount(() => window.clearTimeout(copiedTimer))
</script>

<template>
  <div ref="root" class="share">
    <button
      type="button"
      class="share__btn"
      :class="{ 'share__btn--on': open }"
      :aria-expanded="open"
      :title="`Публічна сторінка обʼєкта «${name}»`"
      @click="open = !open"
    >
      <AppIcon name="link" />
      <span class="share__text">Для замовника</span>
    </button>

    <Transition name="pop">
      <div v-if="open" class="pane">
        <h3 class="pane__title">Сторінка для замовника</h3>

        <p class="pane__text">
          Хід робіт, обсяги й платежі — без входу та без наших цін закупівлі.
        </p>

        <div class="copy">
          <input
            ref="input"
            class="copy__field"
            type="text"
            :value="link"
            readonly
            aria-label="Посилання на публічну сторінку"
            @focus="input?.select()"
          />

          <button
            type="button"
            class="copy__btn"
            :class="{ 'copy__btn--done': copied }"
            :aria-label="copied ? 'Скопійовано' : 'Скопіювати посилання'"
            @click="copy"
          >
            <AppIcon :name="copied ? 'check' : 'copy'" />
            {{ copied ? 'Готово' : 'Копіювати' }}
          </button>
        </div>

        <a class="pane__go" :href="link" target="_blank" rel="noopener">
          Відкрити сторінку
          <AppIcon name="forward" />
        </a>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.share {
  position: relative;
}

.share__btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 16px 0 13px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-raised);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-muted);
  white-space: nowrap;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.share__btn:hover,
.share__btn--on {
  border-color: var(--brand);
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.share__btn :deep(.icon) {
  width: 16px;
  height: 16px;
}

/* ── Панель ────────────────────────────────────────────────────── */

.pane {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 25;
  display: grid;
  gap: 12px;
  width: min(340px, calc(100vw - 40px));
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-raised);
  box-shadow: var(--shadow-md);
}

.pane__title {
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.pane__text {
  font-size: 12px;
  line-height: 1.5;
  color: var(--ink-faint);
}

.copy {
  display: grid;
  gap: 8px;
}

/* Адресу показуємо цілком: видно, що саме полетить замовнику. */
.copy__field {
  width: 100%;
  height: 38px;
  padding: 0 11px;
  border: 1px solid var(--line);
  border-radius: var(--r-xs);
  background: var(--paper-sunk);
  font-size: 12px;
  color: var(--ink-muted);
  text-overflow: ellipsis;
  outline: none;
  transition:
    border-color 0.16s var(--ease),
    box-shadow 0.16s var(--ease);
}

.copy__field:focus {
  border-color: rgb(56 176 0 / 55%);
  box-shadow: 0 0 0 3px var(--brand-glow);
}

.copy__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 38px;
  border: 1px solid transparent;
  border-radius: var(--r-xs);
  background: var(--ink);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  transition: background-color 0.18s var(--ease);
}

.copy__btn:hover {
  background: var(--ink-soft);
}

/* Підтвердження живе півтори секунди — рівно щоб його встигли побачити. */
.copy__btn--done,
.copy__btn--done:hover {
  background: var(--brand);
  color: #08210a;
}

.copy__btn :deep(.icon) {
  width: 15px;
  height: 15px;
}

.pane__go {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  justify-self: start;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-muted);
  text-decoration: none;
  transition: color 0.16s var(--ease);
}

.pane__go:hover {
  color: var(--brand-strong);
}

.pane__go :deep(.icon) {
  width: 14px;
  height: 14px;
  transition: transform 0.2s var(--ease);
}

.pane__go:hover :deep(.icon) {
  transform: translateX(3px);
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

@media (width <= 560px) {
  .share__text {
    display: none;
  }

  .share__btn {
    width: 40px;
    padding: 0;
    justify-content: center;
  }
}
</style>
