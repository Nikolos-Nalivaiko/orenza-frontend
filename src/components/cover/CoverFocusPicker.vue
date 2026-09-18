<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import { clampFocus, coverPosition, type CoverFocus } from '@/lib/cover'

const props = defineProps<{ src: string; width: number; height: number }>()

const focus = defineModel<CoverFocus>({ required: true })

const FRAMES = [
  { key: 'header', label: 'Шапка картки', ratio: '4 / 1' },
  { key: 'track', label: 'Сторінка замовника', ratio: '21 / 9' },
  { key: 'card', label: 'Список обʼєктів', ratio: '12 / 5' },
  { key: 'thumb', label: 'Мініатюра', ratio: '1 / 1' },
] as const

const stage = useTemplateRef<HTMLElement>('stage')
const dragging = ref(false)

const ratio = computed(() =>
  props.width > 0 && props.height > 0 ? props.width / props.height : 16 / 9,
)

const position = computed(() => coverPosition(focus.value))

function setFromPointer(event: PointerEvent): void {
  const rect = stage.value?.getBoundingClientRect()

  if (rect === undefined || rect.width === 0 || rect.height === 0) {
    return
  }

  focus.value = clampFocus({
    x: (event.clientX - rect.left) / rect.width,
    y: (event.clientY - rect.top) / rect.height,
  })
}

function onPointerDown(event: PointerEvent): void {
  if (event.button !== 0) {
    return
  }

  dragging.value = true
  stage.value?.setPointerCapture(event.pointerId)
  setFromPointer(event)
}

function onPointerMove(event: PointerEvent): void {
  if (dragging.value) {
    setFromPointer(event)
  }
}

function onPointerUp(event: PointerEvent): void {
  dragging.value = false

  if (stage.value?.hasPointerCapture(event.pointerId)) {
    stage.value.releasePointerCapture(event.pointerId)
  }
}

const STEPS: Record<string, [number, number]> = {
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
}

function onKeydown(event: KeyboardEvent): void {
  const step = STEPS[event.key]

  if (step === undefined) {
    return
  }

  event.preventDefault()

  const size = event.shiftKey ? 0.1 : 0.02

  focus.value = clampFocus({
    x: focus.value.x + step[0] * size,
    y: focus.value.y + step[1] * size,
  })
}
</script>

<template>
  <div class="fp">
    <div class="fp__main">
      <div
        ref="stage"
        class="fp__stage"
        :class="{ 'fp__stage--drag': dragging }"
        :style="{ aspectRatio: String(ratio), '--ratio': String(ratio) }"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
      >
        <img class="fp__img" :src="src" alt="" draggable="false" />

        <button
          type="button"
          class="fp__mark"
          :style="{ left: `${focus.x * 100}%`, top: `${focus.y * 100}%` }"
          :aria-label="`Точка фокуса: ${Math.round(focus.x * 100)}% по горизонталі, ${Math.round(focus.y * 100)}% по вертикалі. Рухайте стрілками.`"
          @keydown="onKeydown"
          @pointerdown.stop="onPointerDown"
        />
      </div>

      <p class="fp__hint">Клацніть або перетягніть точку туди, що має лишатися в кадрі.</p>
    </div>

    <ul class="fp__frames" aria-label="Як обкладинка виглядатиме">
      <li
        v-for="frame in FRAMES"
        :key="frame.key"
        class="fp__frame"
        :class="`fp__frame--${frame.key}`"
      >
        <span class="fp__shot" :style="{ aspectRatio: frame.ratio }">
          <img class="fp__shot-img" :src="src" alt="" :style="{ objectPosition: position }" />
        </span>
        <span class="fp__label">{{ frame.label }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.fp {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 220px);
  gap: 18px;
  align-items: start;
}

.fp__main {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.fp__stage {
  position: relative;
  width: 100%;
  max-width: min(100%, calc(340px * var(--ratio)));
  margin-inline: auto;
  overflow: hidden;
  border-radius: var(--r-md);
  background: var(--paper-sunk);
  cursor: crosshair;
  touch-action: none;
  user-select: none;
}

.fp__stage--drag {
  cursor: grabbing;
}

.fp__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.fp__mark {
  position: absolute;
  width: 34px;
  height: 34px;
  margin: -17px 0 0 -17px;
  padding: 0;
  border: 3px solid #fff;
  border-radius: 50%;
  background: rgb(2 116 0 / 35%);
  box-shadow:
    0 0 0 1px rgb(12 17 14 / 35%),
    0 8px 20px -6px rgb(12 17 14 / 60%);
  cursor: grab;
  transition: transform 0.16s var(--ease);
}

.fp__mark::after {
  content: '';
  position: absolute;
  inset: 50% auto auto 50%;
  width: 6px;
  height: 6px;
  margin: -3px 0 0 -3px;
  border-radius: 50%;
  background: #fff;
}

.fp__mark:hover,
.fp__mark:focus-visible,
.fp__stage--drag .fp__mark {
  transform: scale(1.12);
}

.fp__mark:focus-visible {
  outline: 3px solid var(--brand);
  outline-offset: 2px;
}

.fp__hint {
  font-size: 12px;
  color: var(--ink-muted);
  text-align: center;
}

.fp__frames {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.fp__frame {
  display: grid;
  gap: 5px;
  align-content: start;
}

.fp__frame--header,
.fp__frame--track {
  grid-column: 1 / -1;
}

.fp__frame--thumb .fp__shot {
  width: 64%;
}

.fp__shot {
  display: block;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--r-xs);
  background: var(--paper-sunk);
}

.fp__shot-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: object-position 0.2s var(--ease);
}

.fp__label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

@media (max-width: 640px) {
  .fp {
    grid-template-columns: 1fr;
  }

  .fp__frames {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    align-items: end;
  }

  .fp__frame--header,
  .fp__frame--track {
    grid-column: auto;
  }

  .fp__frame--thumb .fp__shot {
    width: 42%;
  }

  .fp__label {
    font-size: 9.5px;
    letter-spacing: 0.04em;
  }
}
</style>
