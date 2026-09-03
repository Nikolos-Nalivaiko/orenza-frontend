<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import PhotoViewer from '@/components/objects/PhotoViewer.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatMomentDay } from '@/lib/activity'
import {
  PHOTO_MAX_BYTES,
  PHOTO_MAX_SIDE,
  PHOTO_STRIP,
  PHOTO_TYPES,
  type ObjectPhoto,
} from '@/lib/photos'
import { shrinkImage } from '@/lib/image'

/**
 * Фото з майданчика. Не стіна на весь екран, а горизонтальна стрічка останніх
 * знімків: у вкладці «Огляд» вони довідка, а не головний зміст. Решта — за
 * кнопкою «Усі фото», знімок на весь екран — по кліку.
 */

const props = defineProps<{ photos: ObjectPhoto[]; today: string; volatile: boolean }>()

const emit = defineEmits<{ add: [src: string, name: string]; remove: [id: number] }>()

const picker = useTemplateRef<HTMLInputElement>('picker')

const expanded = ref(false)
const dragging = ref(false)
const problem = ref('')
const busy = ref(false)
const viewing = ref<number | null>(null)

const visible = computed(() => (expanded.value ? props.photos : props.photos.slice(0, PHOTO_STRIP)))

const hidden = computed(() => Math.max(0, props.photos.length - PHOTO_STRIP))

async function accept(files: FileList | undefined | null): Promise<void> {
  problem.value = ''

  if (files === undefined || files === null || files.length === 0) {
    return
  }

  busy.value = true

  try {
    for (const file of Array.from(files)) {
      if (!PHOTO_TYPES.includes(file.type)) {
        problem.value = 'Потрібне зображення: JPG, PNG, WEBP або AVIF'

        continue
      }

      if (file.size > PHOTO_MAX_BYTES) {
        problem.value = `«${file.name}» важчий за ${Math.round(PHOTO_MAX_BYTES / 1024 / 1024)} МБ`

        continue
      }

      emit('add', await shrinkImage(file, PHOTO_MAX_SIDE), file.name)
    }
  } finally {
    busy.value = false
  }
}

function onPick(event: Event): void {
  const input = event.target as HTMLInputElement

  void accept(input.files)

  // Скидаємо значення — інакше повторний вибір того ж файлу не спрацює.
  input.value = ''
}

function onDrop(event: DragEvent): void {
  dragging.value = false
  void accept(event.dataTransfer?.files)
}

function remove(id: number): void {
  const count = props.photos.length

  emit('remove', id)

  // Прибрали останній у стрічці — дивитись далі нічого.
  if (count <= 1) {
    viewing.value = null
  } else if (viewing.value !== null && viewing.value >= count - 1) {
    viewing.value = count - 2
  }
}
</script>

<template>
  <section class="gal">
    <header class="gal__head">
      <h2 class="gal__title">
        Фото обʼєкта
        <span v-if="photos.length > 0" class="gal__count">{{ photos.length }}</span>
      </h2>

      <div class="gal__tools">
        <button v-if="hidden > 0" type="button" class="ghost" @click="expanded = !expanded">
          {{ expanded ? 'Згорнути' : `Усі фото — ще ${hidden}` }}
        </button>

        <button type="button" class="ghost" :disabled="busy" @click="picker?.click()">
          <AppIcon name="upload" />
          {{ busy ? 'Готуємо…' : 'Додати' }}
        </button>
      </div>
    </header>

    <input
      ref="picker"
      class="gal__file"
      type="file"
      multiple
      aria-label="Фото обʼєкта"
      :accept="PHOTO_TYPES.join(',')"
      @change="onPick"
    />

    <!-- Порожня галерея — теж місце для завантаження: окремої кнопки не треба. -->
    <button
      v-if="photos.length === 0"
      type="button"
      class="drop"
      :class="{ 'drop--over': dragging }"
      @click="picker?.click()"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
    >
      <span class="drop__icon" aria-hidden="true">
        <AppIcon :name="dragging ? 'upload' : 'image'" />
      </span>

      <span class="drop__text">
        <strong>{{ dragging ? 'Відпустіть файли' : 'Перетягніть фото з майданчика' }}</strong>
        <span>Знімок відкриється на весь екран і стане подією в стрічці</span>
      </span>
    </button>

    <ul
      v-else
      class="strip"
      :class="{ 'strip--all': expanded, 'strip--over': dragging }"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
    >
      <li v-for="(photo, index) in visible" :key="photo.id" class="shot">
        <button type="button" class="shot__open" @click="viewing = index">
          <img class="shot__img" :src="photo.src" :alt="photo.name" loading="lazy" />
          <span class="shot__day">{{ formatMomentDay(photo.at, today) }}</span>
        </button>
      </li>

      <li class="shot shot--add">
        <button type="button" class="add" :disabled="busy" @click="picker?.click()">
          <AppIcon name="plus" />
          <span class="sr-only">Додати фото</span>
        </button>
      </li>
    </ul>

    <p v-if="problem" class="gal__bad" role="alert">{{ problem }}</p>

    <!-- Чесно кажемо, що знімки не переживуть перезавантаження: сховище
         браузера скінчилось, а завантаження на бекенд ще немає. -->
    <p v-else-if="volatile" class="gal__warn">
      Сховище браузера переповнене — ці фото зникнуть після перезавантаження сторінки.
    </p>

    <PhotoViewer
      v-if="viewing !== null"
      :photos="photos"
      :index="viewing"
      @move="viewing = $event"
      @remove="remove"
      @close="viewing = null"
    />
  </section>
</template>

<style scoped>
.gal {
  display: grid;
  gap: 12px;
}

.gal__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.gal__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.gal__count {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 11px;
  text-align: center;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

.gal__tools {
  display: flex;
  gap: 6px;
}

.ghost {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 13px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease);
}

.ghost:hover:not(:disabled) {
  border-color: var(--ink);
}

.ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ghost :deep(.icon) {
  width: 14px;
  height: 14px;
}

.gal__file {
  display: none;
}

/* ── Стрічка мініатюр ──────────────────────────────────────────── */

.strip {
  display: flex;
  gap: 8px;
  margin: 0;
  padding: 2px;
  overflow-x: auto;
  list-style: none;
  scrollbar-width: thin;
  border-radius: var(--r-md);
  outline: 1px dashed transparent;
  transition: outline-color 0.18s var(--ease);
}

/* «Усі фото» перекладає ту саму стрічку в сітку — без окремого екрана. */
.strip--all {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
  overflow-x: visible;
}

.strip--over {
  outline-color: var(--brand);
}

.shot {
  flex: none;
  width: 118px;
}

.strip--all .shot {
  width: auto;
}

.shot__open {
  position: relative;
  display: block;
  width: 100%;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--paper-sunk);
  transition:
    border-color 0.16s var(--ease),
    transform 0.16s var(--ease);
}

.shot__open:hover {
  border-color: var(--ink);
  transform: translateY(-2px);
}

.shot__img {
  display: block;
  width: 100%;
  height: 88px;
  object-fit: cover;
}

/* Дата просто на знімку: у стрічці вона єдине, що їх розрізняє. */
.shot__day {
  position: absolute;
  inset: auto 0 0 0;
  padding: 10px 8px 5px;
  background: linear-gradient(transparent, rgb(9 13 10 / 72%));
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  text-align: left;
  font-variant-numeric: tabular-nums;
}

.shot--add .add {
  display: grid;
  place-items: center;
  width: 100%;
  height: 88px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-sm);
  background: transparent;
  color: var(--ink-faint);
  transition:
    border-color 0.18s var(--ease),
    background-color 0.18s var(--ease),
    color 0.18s var(--ease);
}

.shot--add .add:hover:not(:disabled) {
  border-color: var(--brand);
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.shot--add .add:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── Порожньо ──────────────────────────────────────────────────── */

.drop {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-md);
  background: transparent;
  text-align: left;
  transition:
    border-color 0.2s var(--ease),
    background-color 0.2s var(--ease);
}

.drop:hover,
.drop--over {
  border-color: var(--brand);
  background: var(--brand-tint);
}

.drop__icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 14px;
  background: var(--paper-sunk);
  color: var(--ink-muted);
  transition:
    background-color 0.2s var(--ease),
    color 0.2s var(--ease);
}

.drop:hover .drop__icon,
.drop--over .drop__icon {
  background: var(--brand);
  color: #08210a;
}

.drop__text {
  display: grid;
  gap: 3px;
}

.drop__text strong {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.drop__text span {
  font-size: 12px;
  line-height: 1.4;
  color: var(--ink-muted);
}

.gal__bad {
  font-size: 12.5px;
  color: var(--danger);
}

.gal__warn {
  font-size: 12px;
  line-height: 1.45;
  color: var(--amber);
}
</style>
