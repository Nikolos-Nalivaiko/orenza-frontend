<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatMomentTime } from '@/lib/moment'
import { formatDay } from '@/lib/objects'
import type { ViewerPhoto } from '@/lib/photos'

const props = defineProps<{
  photos: ViewerPhoto[]
  index: number
  removable?: boolean
  removing?: boolean
}>()

const emit = defineEmits<{ close: []; move: [index: number]; remove: [id: number] }>()

const photo = computed<ViewerPhoto | null>(() => props.photos[props.index] ?? null)

const day = computed(() => (photo.value?.at ? formatDay(photo.value.at.slice(0, 10)) : ''))
const time = computed(() => (photo.value?.at ? formatMomentTime(photo.value.at) : ''))

const loaded = ref(false)
const confirming = ref(false)

watch(
  () => photo.value?.id,
  () => {
    loaded.value = false
    confirming.value = false
    preloadNeighbours()
  },
)

function preloadNeighbours(): void {
  const count = props.photos.length

  if (count < 2) {
    return
  }

  for (const step of [1, -1]) {
    const neighbour = props.photos[(props.index + step + count) % count]

    if (neighbour !== undefined) {
      new Image().src = neighbour.full
    }
  }
}

function move(step: number): void {
  const count = props.photos.length

  if (count > 0) {
    emit('move', (props.index + step + count) % count)
  }
}

function askRemove(): void {
  if (photo.value === null || props.removing) {
    return
  }

  if (confirming.value) {
    emit('remove', photo.value.id)
    confirming.value = false
  } else {
    confirming.value = true
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    if (confirming.value) {
      confirming.value = false
    } else {
      emit('close')
    }
  }

  if (event.key === 'ArrowLeft') {
    move(-1)
  }

  if (event.key === 'ArrowRight') {
    move(1)
  }
}

let swipeStart: { x: number; y: number } | null = null

function onPointerDown(event: PointerEvent): void {
  if (event.pointerType !== 'mouse') {
    swipeStart = { x: event.clientX, y: event.clientY }
  }
}

function onPointerUp(event: PointerEvent): void {
  if (swipeStart === null) {
    return
  }

  const dx = event.clientX - swipeStart.x
  const dy = event.clientY - swipeStart.y

  swipeStart = null

  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    move(dx < 0 ? 1 : -1)
  }
}

let bodyOverflow = ''

onMounted(() => {
  bodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKeydown)
  preloadNeighbours()
})

onBeforeUnmount(() => {
  document.body.style.overflow = bodyOverflow
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div
    v-if="photo"
    class="viewer"
    role="dialog"
    aria-modal="true"
    aria-label="Перегляд фото"
    @click.self="emit('close')"
  >
    <header class="viewer__bar">
      <p class="viewer__when">
        <strong v-if="day">{{ day }}</strong>
        <span v-if="time">{{ time }}</span>
        <span class="viewer__count">{{ index + 1 }} / {{ photos.length }}</span>
      </p>

      <div class="viewer__tools">
        <a
          class="tool"
          :href="photo.full"
          target="_blank"
          rel="noopener"
          aria-label="Відкрити оригінал у новій вкладці"
        >
          <AppIcon name="link" />
        </a>

        <button
          v-if="removable"
          type="button"
          class="tool tool--drop"
          :class="{ 'tool--confirm': confirming }"
          :disabled="removing"
          :aria-label="confirming ? 'Підтвердити видалення фото' : 'Видалити фото'"
          @click="askRemove"
        >
          <AppIcon name="trash" />
          <span v-if="confirming" class="tool__text">{{
            removing ? 'Видаляємо…' : 'Видалити назавжди?'
          }}</span>
        </button>

        <button type="button" class="tool" aria-label="Закрити" @click="emit('close')">
          <AppIcon name="close" />
        </button>
      </div>
    </header>

    <div
      class="viewer__stage"
      @click.self="emit('close')"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="swipeStart = null"
    >
      <img
        :key="`thumb-${photo.id}`"
        class="viewer__img viewer__img--thumb"
        :class="{ 'viewer__img--hidden': loaded }"
        :src="photo.thumb"
        alt=""
        aria-hidden="true"
      />

      <img
        :key="`full-${photo.id}`"
        class="viewer__img viewer__img--full"
        :class="{ 'viewer__img--ready': loaded }"
        :src="photo.full"
        :alt="photo.name ?? 'Фото обʼєкта'"
        decoding="async"
        @load="loaded = true"
      />

      <button
        v-if="photos.length > 1"
        type="button"
        class="nav nav--prev"
        aria-label="Попереднє фото"
        @click="move(-1)"
      >
        <AppIcon name="back" />
      </button>

      <button
        v-if="photos.length > 1"
        type="button"
        class="nav nav--next"
        aria-label="Наступне фото"
        @click="move(1)"
      >
        <AppIcon name="forward" />
      </button>
    </div>

    <p class="viewer__name">{{ photo.name ?? '' }}</p>
  </div>
</template>

<style scoped>
.viewer {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: 12px;
  padding: 16px;
  background: rgb(9 13 10 / 90%);
  backdrop-filter: blur(8px);
  color: #fff;
  animation: fade 0.2s var(--ease);
}

@keyframes fade {
  from {
    opacity: 0;
  }
}

.viewer__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.viewer__when {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  color: rgb(255 255 255 / 65%);
}

.viewer__when strong {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
}

.viewer__count {
  padding: 2px 9px;
  border-radius: 999px;
  background: rgb(255 255 255 / 12%);
  font-size: 11.5px;
  font-weight: 600;
}

.viewer__tools {
  display: flex;
  gap: 6px;
}

.tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 38px;
  height: 38px;
  padding: 0 10px;
  border: 0;
  border-radius: 12px;
  background: rgb(255 255 255 / 10%);
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
  text-decoration: none;
  transition: background-color 0.16s var(--ease);
}

.tool:hover:not(:disabled) {
  background: rgb(255 255 255 / 20%);
}

.tool :deep(.icon) {
  width: 18px;
  height: 18px;
}

.tool--drop:hover:not(:disabled),
.tool--confirm {
  background: var(--danger);
}

.tool:disabled {
  opacity: 0.7;
  cursor: progress;
}

.viewer__stage {
  position: relative;
  min-height: 0;
  touch-action: pan-y;
}

.viewer__img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
}

.viewer__img--thumb {
  filter: blur(14px);
  transform: scale(0.98);
  opacity: 0.85;
}

.viewer__img--hidden {
  opacity: 0;
  transition: opacity 0.2s 0.3s var(--ease);
}

.viewer__img--full {
  opacity: 0;
  transition: opacity 0.35s var(--ease);
}

.viewer__img--ready {
  opacity: 1;
}

.nav {
  position: absolute;
  top: 50%;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: 50%;
  background: rgb(255 255 255 / 12%);
  color: #fff;
  transform: translateY(-50%);
  transition: background-color 0.16s var(--ease);
}

.nav:hover {
  background: rgb(255 255 255 / 26%);
}

.nav--prev {
  left: 0;
}

.nav--next {
  right: 0;
}

.viewer__name {
  min-height: 1em;
  font-size: 12.5px;
  text-align: center;
  color: rgb(255 255 255 / 55%);
}

@media (max-width: 640px) {
  .viewer {
    padding: 12px 8px;
  }

  .nav {
    display: none;
  }
}
</style>
