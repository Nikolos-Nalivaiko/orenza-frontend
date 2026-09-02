<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { useProgressStore } from '@/stores/progress'

const progress = useProgressStore()

const visible = ref(false)
const value = ref(0)

let showTimer: ReturnType<typeof setTimeout> | undefined
let creepTimer: ReturnType<typeof setInterval> | undefined
let hideTimer: ReturnType<typeof setTimeout> | undefined

function clearTimers(): void {
  clearTimeout(showTimer)
  clearInterval(creepTimer)
  clearTimeout(hideTimer)
}

function start(): void {
  clearTimers()

  // Швидкі переходи не встигають показати смужку — і добре.
  showTimer = setTimeout(() => {
    visible.value = true
    value.value = 12

    creepTimer = setInterval(() => {
      // Що ближче до кінця, то повільніше повзе — класичний трюк.
      value.value += Math.max(0.6, (88 - value.value) / 12)

      if (value.value >= 88) {
        // Далі рухатись нікуди — тримати таймер живим немає сенсу.
        value.value = 88
        clearInterval(creepTimer)
      }
    }, 180)
  }, 140)
}

function finish(): void {
  clearTimers()

  if (!visible.value) {
    value.value = 0

    return
  }

  value.value = 100
  hideTimer = setTimeout(() => {
    visible.value = false
    value.value = 0
  }, 320)
}

watch(
  () => progress.isActive,
  (active) => (active ? start() : finish()),
)

onBeforeUnmount(clearTimers)
</script>

<template>
  <div class="progress" :class="{ 'progress--on': visible }" role="presentation">
    <span class="progress__bar" :style="{ width: `${value}%` }" />
  </div>
</template>

<style scoped>
.progress {
  position: fixed;
  inset: 0 0 auto;
  z-index: 60;
  height: 2px;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s var(--ease);
}

.progress--on {
  opacity: 1;
}

.progress__bar {
  display: block;
  height: 100%;
  border-radius: 0 999px 999px 0;
  background: linear-gradient(90deg, var(--brand-strong), var(--brand-soft));
  box-shadow: 0 0 12px var(--brand-glow);
  transition: width 0.28s var(--ease);
}
</style>
