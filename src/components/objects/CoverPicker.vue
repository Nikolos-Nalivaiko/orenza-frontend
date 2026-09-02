<script setup lang="ts">
import { ref, useId, useTemplateRef } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { COVER_MAX_BYTES, COVER_TYPES } from '@/lib/objects'

defineProps<{ error?: string }>()

/** Обкладинка — data-URL: завантаження файлів на бекенді ще немає. */
const model = defineModel<string | null>({ required: true })

const id = useId()
const picker = useTemplateRef<HTMLInputElement>('picker')

const dragging = ref(false)
const problem = ref('')
const fileName = ref('')

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.addEventListener('load', () => resolve(String(reader.result)))
    reader.addEventListener('error', () => reject(new Error('read')))
    reader.readAsDataURL(file)
  })
}

async function accept(file: File | undefined): Promise<void> {
  problem.value = ''

  if (file === undefined) {
    return
  }

  if (!COVER_TYPES.includes(file.type)) {
    problem.value = 'Потрібне зображення: JPG, PNG, WEBP або AVIF'

    return
  }

  if (file.size > COVER_MAX_BYTES) {
    problem.value = `Файл важчий за ${Math.round(COVER_MAX_BYTES / 1024 / 1024)} МБ`

    return
  }

  try {
    model.value = await readFile(file)
    fileName.value = file.name
  } catch {
    problem.value = 'Не вдалося прочитати файл'
  }
}

function onPick(event: Event): void {
  const input = event.target as HTMLInputElement

  void accept(input.files?.[0])

  // Скидаємо значення — інакше повторний вибір того ж файлу не спрацює.
  input.value = ''
}

function onDrop(event: DragEvent): void {
  dragging.value = false
  void accept(event.dataTransfer?.files?.[0])
}

function remove(): void {
  model.value = null
  fileName.value = ''
  problem.value = ''
}
</script>

<template>
  <div class="cover">
    <input
      :id="id"
      ref="picker"
      class="cover__file"
      type="file"
      aria-label="Обкладинка обʼєкта"
      :accept="COVER_TYPES.join(',')"
      @change="onPick"
    />

    <div v-if="model" class="shot">
      <img class="shot__img" :src="model" alt="Обкладинка обʼєкта" />

      <div class="shot__bar">
        <span class="shot__name">{{ fileName || 'Зображення обрано' }}</span>

        <span class="shot__actions">
          <button type="button" class="shot__btn" @click="picker?.click()">Замінити</button>
          <button type="button" class="shot__btn shot__btn--drop" @click="remove">
            <AppIcon name="trash" />
            Прибрати
          </button>
        </span>
      </div>
    </div>

    <button
      v-else
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
        <strong>{{ dragging ? 'Відпустіть файл' : 'Перетягніть фото або оберіть файл' }}</strong>
        <span>JPG, PNG, WEBP або AVIF — до 5 МБ</span>
      </span>
    </button>

    <p v-if="problem || error" class="cover__error" role="alert">{{ problem || error }}</p>
  </div>
</template>

<style scoped>
.cover {
  display: grid;
  gap: 8px;
}

.cover__file {
  display: none;
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

.shot {
  position: relative;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-sunk);
  animation: appear 0.3s var(--ease);
}

@keyframes appear {
  from {
    opacity: 0;
    transform: scale(0.985);
  }
}

.shot__img {
  display: block;
  width: 100%;
  height: 190px;
  object-fit: cover;
}

.shot__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 12px;
  border-top: 1px solid var(--line);
  background: var(--paper-raised);
}

.shot__name {
  font-size: 12.5px;
  color: var(--ink-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.shot__actions {
  display: flex;
  flex: none;
  gap: 6px;
}

.shot__btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 11px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.shot__btn:hover {
  border-color: var(--ink);
  background: rgb(12 17 14 / 4%);
}

.shot__btn :deep(.icon) {
  width: 13px;
  height: 13px;
}

.shot__btn--drop {
  border-color: transparent;
  color: var(--ink-faint);
}

.shot__btn--drop:hover {
  border-color: transparent;
  background: var(--danger-tint);
  color: var(--danger);
}

.cover__error {
  font-size: 12.5px;
  color: var(--danger);
}
</style>
