<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatMomentTime } from '@/lib/activity'
import { formatDay } from '@/lib/objects'
import type { ObjectPhoto } from '@/lib/photos'

/** Знімок на весь екран: дата, лічильник і гортання решти стрічки. */
const props = defineProps<{ photos: ObjectPhoto[]; index: number }>()

const emit = defineEmits<{ close: []; move: [index: number]; remove: [id: number] }>()

const photo = computed<ObjectPhoto | null>(() => props.photos[props.index] ?? null)

const day = computed(() => (photo.value === null ? '' : formatDay(photo.value.at.slice(0, 10))))
const time = computed(() => (photo.value === null ? '' : formatMomentTime(photo.value.at)))

/** Гортаємо по колу: на останньому знімку стрілка вправо не має впиратись. */
function move(step: number): void {
  const count = props.photos.length

  if (count > 0) {
    emit('move', (props.index + step + count) % count)
  }
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close')
  }

  if (event.key === 'ArrowLeft') {
    move(-1)
  }

  if (event.key === 'ArrowRight') {
    move(1)
  }
}

const bodyOverflow = ref('')

onMounted(() => {
  bodyOverflow.value = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.body.style.overflow = bodyOverflow.value
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div v-if="photo" class="viewer" @click.self="emit('close')">
    <header class="viewer__bar">
      <p class="viewer__when">
        <strong>{{ day }}</strong>
        <span v-if="time">{{ time }}</span>
        <span class="viewer__count">{{ index + 1 }} / {{ photos.length }}</span>
      </p>

      <div class="viewer__tools">
        <button
          type="button"
          class="tool tool--drop"
          aria-label="Видалити фото"
          @click="emit('remove', photo.id)"
        >
          <AppIcon name="trash" />
        </button>

        <button type="button" class="tool" aria-label="Закрити" @click="emit('close')">
          <AppIcon name="close" />
        </button>
      </div>
    </header>

    <div class="viewer__stage" @click.self="emit('close')">
      <button
        v-if="photos.length > 1"
        type="button"
        class="nav nav--prev"
        aria-label="Попереднє фото"
        @click="move(-1)"
      >
        <AppIcon name="back" />
      </button>

      <img class="viewer__img" :src="photo.src" :alt="photo.name" />

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

    <p class="viewer__name">{{ photo.name }}</p>
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
  background: rgb(9 13 10 / 88%);
  backdrop-filter: blur(8px);
  color: #fff;
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
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 0;
  border-radius: 12px;
  background: rgb(255 255 255 / 10%);
  color: #fff;
  transition: background-color 0.16s var(--ease);
}

.tool:hover {
  background: rgb(255 255 255 / 20%);
}

.tool--drop:hover {
  background: var(--danger);
}

.viewer__stage {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 0;
}

.viewer__img {
  max-width: 100%;
  max-height: 100%;
  border-radius: var(--r-md);
  object-fit: contain;
}

.nav {
  position: absolute;
  top: 50%;
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
  font-size: 12.5px;
  text-align: center;
  color: rgb(255 255 255 / 55%);
}
</style>
