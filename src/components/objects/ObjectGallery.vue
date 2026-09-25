<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef, watch } from 'vue'
import PhotoViewer from '@/components/objects/PhotoViewer.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatMomentDay } from '@/lib/moment'
import { PHOTO_INPUT_TYPES, PHOTO_STRIP, photoMoment, toViewerPhoto } from '@/lib/photos'
import { usePhotosStore, type PhotoUpload } from '@/stores/photos'

const props = defineProps<{ objectId: number; today: string }>()

const store = usePhotosStore()

const picker = useTemplateRef<HTMLInputElement>('picker')

const expanded = ref(false)
const dragging = ref(false)
const viewing = ref<number | null>(null)
const confirmingDiscard = ref(false)
const ready = ref<Record<number, boolean>>({})

const photos = computed(() => store.photosOf(props.objectId))
const uploads = computed(() => store.uploadsOf(props.objectId))
const legacy = computed(() => store.legacyOf(props.objectId))
const loaded = computed(() => store.isLoaded(props.objectId))
const loading = computed(() => store.loading[props.objectId] === true)
const loadingMore = computed(() => store.loadingMore[props.objectId] === true)
const more = computed(() => store.hasMore(props.objectId))
const error = computed(() => store.errors[props.objectId] ?? null)

const viewerPhotos = computed(() => photos.value.map(toViewerPhoto))

const total = computed(() => store.totalOf(props.objectId))
const pending = computed(() => uploads.value.filter((item) => item.status !== 'failed').length)

const visible = computed(() =>
  expanded.value
    ? photos.value
    : photos.value.slice(0, Math.max(0, PHOTO_STRIP - uploads.value.length)),
)

const hidden = computed(() => Math.max(0, total.value - visible.value.length))

const empty = computed(
  () => loaded.value && photos.value.length === 0 && uploads.value.length === 0,
)

const viewerRemoving = computed(() => {
  const photo = viewing.value === null ? undefined : photos.value[viewing.value]

  return photo !== undefined && store.removing[photo.id] === true
})

function pick(files: Iterable<File> | ArrayLike<File> | null | undefined): void {
  const list = files === null || files === undefined ? [] : Array.from(files)

  if (list.length > 0) {
    store.add(props.objectId, list)
  }
}

function onChange(event: Event): void {
  const input = event.target as HTMLInputElement

  pick(input.files)
  input.value = ''
}

function onDrop(event: DragEvent): void {
  dragging.value = false
  pick(event.dataTransfer?.files)
}

function onDragLeave(event: DragEvent): void {
  const next = event.relatedTarget

  if (!(next instanceof Node) || !(event.currentTarget as HTMLElement).contains(next)) {
    dragging.value = false
  }
}

function onPaste(event: ClipboardEvent): void {
  const target = event.target

  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    (target instanceof HTMLElement && target.isContentEditable) ||
    document.querySelector('[aria-modal="true"]') !== null
  ) {
    return
  }

  const images = [...(event.clipboardData?.files ?? [])].filter((file) =>
    file.type.startsWith('image/'),
  )

  if (images.length > 0) {
    event.preventDefault()
    pick(images)
  }
}

async function removePhoto(id: number): Promise<void> {
  const index = photos.value.findIndex((photo) => photo.id === id)

  if (!(await store.remove(props.objectId, id))) {
    return
  }

  const count = photos.value.length

  if (count === 0) {
    viewing.value = null
  } else if (viewing.value !== null && index >= count) {
    viewing.value = count - 1
  }
}

function discardLegacy(): void {
  if (confirmingDiscard.value) {
    store.discardLegacy(props.objectId)
    confirmingDiscard.value = false
  } else {
    confirmingDiscard.value = true
  }
}

function uploadLabel(item: PhotoUpload): string {
  if (item.status === 'failed') {
    return 'Помилка'
  }

  if (item.status === 'uploading') {
    return item.progress >= 1 ? 'Обробка…' : `${Math.round(item.progress * 100)}%`
  }

  return item.status === 'preparing' ? 'Готуємо…' : 'У черзі'
}

function dayOf(at: string | null): string {
  return at === null ? '' : formatMomentDay(at, props.today)
}

watch(viewing, (index) => {
  if (index !== null && more.value && index >= photos.value.length - 3) {
    void store.loadMore(props.objectId)
  }
})

watch(
  () => props.objectId,
  (id) => {
    expanded.value = false
    viewing.value = null
    confirmingDiscard.value = false

    if (!store.isLoaded(id)) {
      void store.fetch(id)
    }
  },
  { immediate: true },
)

onMounted(() => window.addEventListener('paste', onPaste))
onBeforeUnmount(() => window.removeEventListener('paste', onPaste))
</script>

<template>
  <section
    class="gal"
    :class="{ 'gal--over': dragging }"
    @dragenter.prevent="dragging = true"
    @dragover.prevent="dragging = true"
    @dragleave="onDragLeave"
    @drop.prevent="onDrop"
  >
    <header class="gal__head">
      <h2 class="gal__title">
        Фото обʼєкта
        <span v-if="total > 0" class="gal__count">{{ total }}</span>
        <span v-if="pending > 0" class="gal__pending">
          <span class="gal__pulse" aria-hidden="true" />
          завантажується {{ pending }}
        </span>
      </h2>

      <div class="gal__tools">
        <button
          v-if="hidden > 0 || expanded"
          type="button"
          class="ghost"
          @click="expanded = !expanded"
        >
          {{ expanded ? 'Згорнути' : `Усі фото — ще ${hidden}` }}
        </button>

        <button type="button" class="ghost" @click="picker?.click()">
          <AppIcon name="upload" />
          Додати
        </button>
      </div>
    </header>

    <input
      ref="picker"
      class="gal__file"
      type="file"
      multiple
      tabindex="-1"
      aria-hidden="true"
      :accept="PHOTO_INPUT_TYPES.join(',')"
      @change="onChange"
    />

    <div v-if="legacy.length > 0" class="legacy" role="status">
      <ul class="legacy__shots" aria-hidden="true">
        <li v-for="item in legacy.slice(0, 4)" :key="item.id">
          <img :src="item.src" alt="" />
        </li>
      </ul>

      <p class="legacy__text">
        <strong>{{ legacy.length }} фото лежать лише в цьому браузері.</strong>
        Перенесіть їх на сервер — тоді вони будуть на всіх пристроях і на сторінці замовника.
      </p>

      <div class="legacy__actions">
        <button type="button" class="ghost ghost--brand" @click="store.importLegacy(objectId)">
          <AppIcon name="upload" />
          Перенести
        </button>
        <button
          type="button"
          class="ghost"
          :class="{ 'ghost--danger': confirmingDiscard }"
          @click="discardLegacy"
          @blur="confirmingDiscard = false"
        >
          {{ confirmingDiscard ? 'Точно видалити?' : 'Не переносити' }}
        </button>
      </div>
    </div>

    <ul v-if="!loaded && loading" class="strip" aria-busy="true" aria-label="Завантажуємо фото">
      <li v-for="n in 5" :key="n" class="shot shot--skeleton" />
    </ul>

    <button
      v-else-if="empty"
      type="button"
      class="drop"
      :class="{ 'drop--over': dragging }"
      @click="picker?.click()"
    >
      <span class="drop__icon" aria-hidden="true">
        <AppIcon :name="dragging ? 'upload' : 'image'" />
      </span>

      <span class="drop__text">
        <strong>{{ dragging ? 'Відпустіть файли' : 'Перетягніть фото з майданчика' }}</strong>
        <span
          >Кілька файлів одразу, з телефона чи вставкою з буфера. Дата зйомки підтягнеться з
          камери.</span
        >
      </span>
    </button>

    <ul v-else-if="loaded || uploads.length > 0" class="strip" :class="{ 'strip--all': expanded }">
      <li
        v-for="item in uploads"
        :key="item.uid"
        class="shot shot--upload"
        :class="`shot--${item.status}`"
      >
        <div class="shot__frame">
          <img v-if="item.preview" class="shot__img shot__img--ready" :src="item.preview" alt="" />

          <span class="shot__veil">
            <AppIcon v-if="item.status === 'failed'" name="alert" />
            <span class="shot__state">{{ uploadLabel(item) }}</span>
          </span>

          <span v-if="item.status === 'uploading'" class="shot__bar">
            <span class="shot__fill" :style="{ width: `${Math.round(item.progress * 100)}%` }" />
          </span>

          <span v-if="item.status === 'failed'" class="shot__fix">
            <button
              v-if="item.retryable"
              type="button"
              class="shot__act"
              :aria-label="`Спробувати ще раз: ${item.name}`"
              @click="store.retry(item.uid)"
            >
              <AppIcon name="swap" />
            </button>
            <button
              type="button"
              class="shot__act"
              :aria-label="`Прибрати: ${item.name}`"
              @click="store.dismiss(item.uid)"
            >
              <AppIcon name="close" />
            </button>
          </span>
        </div>

        <p v-if="item.error" class="shot__error" :title="item.error">{{ item.error }}</p>
      </li>

      <li v-for="(photo, index) in visible" :key="photo.id" class="shot">
        <button
          type="button"
          class="shot__frame shot__open"
          :style="{ background: photo.color }"
          :aria-label="`Відкрити фото ${dayOf(photoMoment(photo))}`"
          @click="viewing = index"
        >
          <img
            class="shot__img"
            :class="{ 'shot__img--ready': ready[photo.id] }"
            :src="photo.thumb"
            alt=""
            loading="lazy"
            decoding="async"
            @load="ready[photo.id] = true"
          />
          <span class="shot__day">{{ dayOf(photoMoment(photo)) }}</span>
        </button>
      </li>

      <li v-if="expanded && more" class="shot shot--more">
        <button
          type="button"
          class="shot__frame more"
          :disabled="loadingMore"
          :aria-busy="loadingMore"
          @click="store.loadMore(objectId)"
        >
          <AppIcon name="image" />
          <span>{{ loadingMore ? 'Завантажуємо…' : 'Показати ще' }}</span>
        </button>
      </li>

      <li v-if="!expanded" class="shot shot--add">
        <button type="button" class="shot__frame add" @click="picker?.click()">
          <AppIcon name="plus" />
          <span class="sr-only">Додати фото</span>
        </button>
      </li>
    </ul>

    <p v-if="error" class="gal__bad" role="alert">
      <span>{{ error }}</span>
      <button
        v-if="!loaded || more"
        type="button"
        class="gal__retry"
        @click="loaded ? store.loadMore(objectId) : store.fetch(objectId)"
      >
        Спробувати ще
      </button>
    </p>

    <PhotoViewer
      v-if="viewing !== null"
      :photos="viewerPhotos"
      :index="viewing"
      removable
      :removing="viewerRemoving"
      @move="viewing = $event"
      @remove="removePhoto"
      @close="viewing = null"
    />
  </section>
</template>

<style scoped>
.gal {
  position: relative;
  display: grid;
  gap: 12px;
  border-radius: var(--r-md);
  outline: 2px dashed transparent;
  outline-offset: 6px;
  transition: outline-color 0.18s var(--ease);
}

.gal--over {
  outline-color: var(--brand);
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

.gal__pending {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 500;
  color: var(--brand-strong);
}

.gal__pulse {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand);
  animation: pulse 1.2s ease-in-out infinite;
}

@keyframes pulse {
  50% {
    opacity: 0.3;
    transform: scale(0.7);
  }
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
  white-space: nowrap;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.ghost:hover:not(:disabled) {
  border-color: var(--ink);
}

.ghost :deep(.icon) {
  width: 14px;
  height: 14px;
}

.ghost--brand {
  border-color: transparent;
  background: var(--brand);
  color: var(--on-brand);
}

.ghost--brand:hover:not(:disabled) {
  border-color: transparent;
  background: var(--brand-soft);
}

.ghost--danger {
  border-color: var(--danger);
  background: var(--danger-tint);
  color: var(--danger);
}

.gal__file {
  display: none;
}

.legacy {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border: 1px solid var(--amber-tint);
  border-radius: var(--r-md);
  background: color-mix(in srgb, var(--amber-tint) 60%, var(--paper-raised));
}

.legacy__shots {
  display: flex;
  margin: 0;
  padding: 0 0 0 10px;
  list-style: none;
}

.legacy__shots li {
  width: 38px;
  height: 38px;
  margin-left: -10px;
  overflow: hidden;
  border: 2px solid var(--paper-raised);
  border-radius: 10px;
  background: var(--paper-sunk);
}

.legacy__shots img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.legacy__text {
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--ink-muted);
}

.legacy__text strong {
  display: block;
  color: var(--ink);
}

.legacy__actions {
  display: flex;
  gap: 6px;
}

.strip {
  display: flex;
  gap: 8px;
  margin: 0;
  padding: 2px;
  overflow-x: auto;
  list-style: none;
  scrollbar-width: thin;
}

.strip--all {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(118px, 1fr));
  overflow-x: visible;
}

.shot {
  flex: none;
  width: 118px;
}

.strip--all .shot {
  width: auto;
}

.shot__frame {
  position: relative;
  display: block;
  width: 100%;
  height: 88px;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--paper-sunk);
}

.shot__open {
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
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.3s var(--ease);
}

.shot__img--ready {
  opacity: 1;
}

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

.shot--skeleton {
  height: 88px;
  border-radius: var(--r-sm);
  background: linear-gradient(90deg, var(--paper-sunk), var(--paper), var(--paper-sunk));
  background-size: 200% 100%;
  animation: shimmer 1.2s linear infinite;
}

@keyframes shimmer {
  to {
    background-position: -200% 0;
  }
}

.shot__veil {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 4px;
  background: rgb(9 13 10 / 38%);
  color: #fff;
}

.shot--queued .shot__veil,
.shot--preparing .shot__veil {
  background: linear-gradient(90deg, rgb(9 13 10 / 30%), rgb(9 13 10 / 12%), rgb(9 13 10 / 30%));
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
}

.shot--failed .shot__frame {
  border-color: var(--danger);
}

.shot--failed .shot__veil {
  background: rgb(200 52 31 / 62%);
}

.shot__veil :deep(.icon) {
  width: 18px;
  height: 18px;
}

.shot__state {
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 1px 2px rgb(0 0 0 / 40%);
}

.shot__bar {
  position: absolute;
  inset: auto 6px 6px;
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: rgb(255 255 255 / 35%);
}

.shot__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--brand);
  transition: width 0.2s var(--ease);
}

.shot__fix {
  position: absolute;
  top: 5px;
  right: 5px;
  display: flex;
  gap: 4px;
}

.shot__act {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: 50%;
  background: rgb(255 255 255 / 92%);
  color: var(--ink);
}

.shot__act :deep(.icon) {
  width: 13px;
  height: 13px;
}

.shot__error {
  margin-top: 4px;
  font-size: 11px;
  line-height: 1.3;
  color: var(--danger);
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.add {
  display: grid;
  place-items: center;
  border: 1px dashed var(--line-strong);
  background: transparent;
  color: var(--ink-faint);
  transition:
    border-color 0.18s var(--ease),
    background-color 0.18s var(--ease),
    color 0.18s var(--ease);
}

.add:hover {
  border-color: var(--brand);
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.more {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 6px;
  border: 1px dashed var(--line-strong);
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-muted);
  transition:
    border-color 0.18s var(--ease),
    background-color 0.18s var(--ease),
    color 0.18s var(--ease);
}

.more :deep(.icon) {
  width: 18px;
  height: 18px;
}

.more:hover:not(:disabled) {
  border-color: var(--brand);
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.more:disabled {
  cursor: progress;
  opacity: 0.7;
}

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
  color: var(--on-brand);
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
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 12.5px;
  color: var(--danger);
}

.gal__retry {
  padding: 0;
  border: 0;
  background: none;
  color: var(--ink);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

@media (max-width: 640px) {
  .legacy {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .legacy__actions {
    grid-column: 1 / -1;
  }
}
</style>
