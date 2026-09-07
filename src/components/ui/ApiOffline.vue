<script setup lang="ts">
import { ref } from 'vue'
import { useApiStore } from '@/stores/api'

const api = useApiStore()

const hidden = ref(false)
</script>

<template>
  <Transition name="drop">
    <aside v-if="api.isOffline && !hidden" class="off" role="status">
      <span class="off__dot" aria-hidden="true" />

      <span class="off__text">
        <strong class="off__title">Немає звʼязку з API</strong>
        <span class="off__url">{{ api.url }}</span>
      </span>

      <button type="button" class="off__retry" :disabled="api.isChecking" @click="api.check()">
        {{ api.isChecking ? 'Перевіряємо…' : 'Ще раз' }}
      </button>

      <button type="button" class="off__close" aria-label="Сховати" @click="hidden = true">
        <svg viewBox="0 0 14 14" aria-hidden="true">
          <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" stroke="currentColor" stroke-width="1.6" />
        </svg>
      </button>
    </aside>
  </Transition>
</template>

<style scoped>
.off {
  position: fixed;
  bottom: 16px;
  left: 16px;
  z-index: 50;
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: calc(100vw - 32px);
  padding: 12px 14px;
  border: 1px solid rgb(200 52 31 / 30%);
  border-radius: var(--r-md);
  background: var(--paper-raised);
  box-shadow: var(--shadow-md);
}

.off__dot {
  flex: none;
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--danger);
  box-shadow: 0 0 0 4px rgb(200 52 31 / 14%);
  animation: pulse 1.8s var(--ease) infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.35;
  }
}

.off__text {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.off__title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.off__url {
  font-size: 11.5px;
  color: var(--ink-faint);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.off__retry {
  flex: none;
  padding: 6px 12px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease);
}

.off__retry:hover:not(:disabled) {
  border-color: var(--ink);
  background: var(--paper-sunk);
}

.off__retry:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.off__close {
  display: grid;
  place-items: center;
  flex: none;
  width: 26px;
  height: 26px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ink-faint);
  transition:
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.off__close:hover {
  background: var(--paper-sunk);
  color: var(--ink);
}

.off__close svg {
  width: 13px;
  height: 13px;
}

.drop-enter-active,
.drop-leave-active {
  transition:
    opacity 0.24s var(--ease),
    transform 0.24s var(--ease);
}

.drop-enter-from,
.drop-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
