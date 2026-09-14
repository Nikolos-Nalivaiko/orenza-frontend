<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { COVER_INPUT_TYPES } from '@/lib/cover'

const props = withDefaults(defineProps<{ busy?: boolean; paste?: boolean; tall?: boolean }>(), {
  busy: false,
  paste: true,
  tall: false,
})

const emit = defineEmits<{ pick: [file: File] }>()

const input = useTemplateRef<HTMLInputElement>('input')
const dragging = ref(false)

function open(): void {
  input.value?.click()
}

function pick(file: File | undefined | null): void {
  if (file && !props.busy) {
    emit('pick', file)
  }
}

function onChange(event: Event): void {
  const target = event.target as HTMLInputElement

  pick(target.files?.[0])
  target.value = ''
}

function onDrop(event: DragEvent): void {
  dragging.value = false
  pick(event.dataTransfer?.files?.[0])
}

function onPaste(event: ClipboardEvent): void {
  const target = event.target

  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    return
  }

  const file = [...(event.clipboardData?.files ?? [])].find((item) =>
    item.type.startsWith('image/'),
  )

  if (file !== undefined) {
    event.preventDefault()
    pick(file)
  }
}

onMounted(() => {
  if (props.paste) {
    window.addEventListener('paste', onPaste)
  }
})

onBeforeUnmount(() => window.removeEventListener('paste', onPaste))

defineExpose({ open })
</script>

<template>
  <div class="dz">
    <input
      ref="input"
      class="dz__file"
      type="file"
      tabindex="-1"
      aria-hidden="true"
      :accept="COVER_INPUT_TYPES.join(',')"
      @change="onChange"
    />

    <button
      type="button"
      class="dz__zone"
      :class="{ 'dz__zone--over': dragging, 'dz__zone--tall': tall, 'dz__zone--busy': busy }"
      :disabled="busy"
      @click="open"
      @dragenter.prevent="dragging = true"
      @dragover.prevent="dragging = true"
      @dragleave="dragging = false"
      @drop.prevent="onDrop"
    >
      <span class="dz__icon" aria-hidden="true">
        <AppIcon :name="dragging ? 'upload' : 'image'" />
      </span>

      <span class="dz__text">
        <strong>{{
          busy
            ? 'Готуємо зображення…'
            : dragging
              ? 'Відпустіть файл'
              : 'Перетягніть фото або оберіть файл'
        }}</strong>
        <span>
          JPG, PNG, WEBP, AVIF або HEIC<template v-if="paste"> · можна вставити з буфера</template>
        </span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.dz__file {
  display: none;
}

.dz__zone {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 14px;
  width: 100%;
  padding: 18px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-md);
  background: transparent;
  text-align: left;
  transition:
    border-color 0.2s var(--ease),
    background-color 0.2s var(--ease);
}

.dz__zone--tall {
  grid-template-columns: 1fr;
  justify-items: center;
  gap: 12px;
  padding: 44px 20px;
  text-align: center;
}

.dz__zone:hover:not(:disabled),
.dz__zone--over {
  border-color: var(--brand);
  background: var(--brand-tint);
}

.dz__zone--busy {
  cursor: progress;
}

.dz__icon {
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

.dz__zone:hover:not(:disabled) .dz__icon,
.dz__zone--over .dz__icon {
  background: var(--brand);
  color: #08210a;
}

.dz__text {
  display: grid;
  gap: 3px;
}

.dz__text strong {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.dz__text span {
  font-size: 12px;
  line-height: 1.4;
  color: var(--ink-muted);
}
</style>
