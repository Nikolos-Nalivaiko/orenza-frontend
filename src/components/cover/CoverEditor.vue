<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, useTemplateRef } from 'vue'
import CoverDropzone from '@/components/cover/CoverDropzone.vue'
import CoverFocusPicker from '@/components/cover/CoverFocusPicker.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useCoverFile } from '@/composables/useCoverFile'
import { CENTER_FOCUS, type CoverDraft, type CoverFocus } from '@/lib/cover'
import type { ConstructionObject } from '@/lib/objects'
import { useObjectsStore } from '@/stores/objects'

const props = defineProps<{ object: ConstructionObject }>()

const emit = defineEmits<{ close: [] }>()

const objects = useObjectsStore()
const titleId = useId()
const dropzone = useTemplateRef<InstanceType<typeof CoverDropzone>>('dropzone')

const { preparing, problem, prepare, release, clearProblem } = useCoverFile()

const draft = ref<CoverDraft | null>(null)
const focus = ref<CoverFocus>({ ...(props.object.cover?.focus ?? CENTER_FOCUS) })

const busy = computed(() => objects.isSavingCover || preparing.value)

const stage = computed(() => {
  if (draft.value !== null) {
    return { src: draft.value.preview, width: draft.value.width, height: draft.value.height }
  }

  const cover = props.object.cover

  return cover === null ? null : { src: cover.hero, width: cover.width, height: cover.height }
})

const focusChanged = computed(() => {
  const saved = props.object.cover?.focus

  return saved === undefined || saved.x !== focus.value.x || saved.y !== focus.value.y
})

const canSave = computed(
  () =>
    !busy.value && (draft.value !== null || (props.object.cover !== null && focusChanged.value)),
)

const percent = computed(() =>
  objects.coverProgress === null ? null : Math.round(objects.coverProgress * 100),
)

const errorText = computed(() => problem.value ?? objects.coverError)

async function onPick(file: File): Promise<void> {
  objects.resetCoverError()

  const next = await prepare(file)

  if (next === null) {
    return
  }

  release(draft.value)
  draft.value = next
  focus.value = { ...CENTER_FOCUS }
}

function discardDraft(): void {
  release(draft.value)
  draft.value = null
  focus.value = { ...(props.object.cover?.focus ?? CENTER_FOCUS) }
  clearProblem()
  objects.resetCoverError()
}

async function save(): Promise<void> {
  if (!canSave.value) {
    return
  }

  const done =
    draft.value !== null
      ? await objects.uploadCover(props.object.id, draft.value.file, focus.value)
      : await objects.setCoverFocus(props.object.id, focus.value)

  if (done) {
    close(true)
  }
}

async function removeCover(): Promise<void> {
  if (await objects.removeCover(props.object.id)) {
    close(true)
  }
}

function close(force = false): void {
  if (objects.isSavingCover && !force) {
    return
  }

  release(draft.value)
  objects.resetCoverError()
  emit('close')
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    close()
  }
}

let bodyOverflow = ''

onMounted(() => {
  bodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKeydown)
  objects.resetCoverError()
})

onBeforeUnmount(() => {
  document.body.style.overflow = bodyOverflow
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="overlay" @click.self="close()">
    <div class="dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <header class="dialog__head">
        <div>
          <h2 :id="titleId" class="display dialog__title">Обкладинка обʼєкта</h2>
          <p class="dialog__sub">
            Її бачать у списку обʼєктів, у шапці картки та на сторінці замовника.
          </p>
        </div>

        <button
          type="button"
          class="dialog__close"
          aria-label="Закрити"
          :disabled="objects.isSavingCover"
          @click="close()"
        >
          <AppIcon name="close" />
        </button>
      </header>

      <CoverDropzone v-if="stage === null" ref="dropzone" tall :busy="busy" @pick="onPick" />

      <template v-else>
        <CoverFocusPicker
          v-model="focus"
          :src="stage.src"
          :width="stage.width"
          :height="stage.height"
        />

        <CoverDropzone ref="dropzone" class="dialog__hidden" :busy="busy" @pick="onPick" />
      </template>

      <div v-if="percent !== null" class="upload" role="status" aria-live="polite">
        <span class="upload__bar">
          <span class="upload__fill" :style="{ width: `${percent}%` }" />
        </span>
        <span class="upload__text">
          {{ percent < 100 ? `Завантажуємо… ${percent}%` : 'Обробляємо на сервері…' }}
        </span>
      </div>

      <p v-if="errorText" class="dialog__error" role="alert">
        <AppIcon name="alert" />
        <span>{{ errorText }}</span>
      </p>

      <footer class="dialog__actions">
        <div class="dialog__side">
          <button
            v-if="stage !== null"
            type="button"
            class="btn btn--ghost btn--sm"
            :disabled="busy"
            @click="dropzone?.open()"
          >
            <AppIcon name="upload" />
            {{ draft === null ? 'Замінити фото' : 'Інше фото' }}
          </button>

          <button
            v-if="draft !== null && object.cover !== null"
            type="button"
            class="btn btn--ghost btn--sm"
            :disabled="busy"
            @click="discardDraft"
          >
            Повернути поточну
          </button>

          <button
            v-if="draft === null && object.cover !== null"
            type="button"
            class="btn btn--ghost btn--sm btn--quiet-danger"
            :disabled="busy"
            @click="removeCover"
          >
            <AppIcon name="trash" />
            Прибрати
          </button>
        </div>

        <div class="dialog__main">
          <button
            type="button"
            class="btn btn--ghost btn--sm"
            :disabled="objects.isSavingCover"
            @click="close()"
          >
            Скасувати
          </button>

          <button
            v-if="stage !== null"
            type="button"
            class="btn btn--primary btn--sm"
            :disabled="!canSave"
            @click="save"
          >
            {{ draft === null ? 'Зберегти кадр' : 'Зберегти обкладинку' }}
          </button>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 20px;
  overflow-y: auto;
  background: rgb(9 13 10 / 46%);
  backdrop-filter: blur(6px);
}

.dialog {
  display: grid;
  gap: 16px;
  width: min(760px, 100%);
  padding: 26px;
  border-radius: var(--r-xl);
  background: var(--paper-raised);
  box-shadow: var(--shadow-lg);
  animation: rise 0.28s var(--ease);
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(8px) scale(0.99);
  }
}

.dialog__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
}

.dialog__title {
  font-size: 20px;
}

.dialog__sub {
  margin-top: 4px;
  font-size: 13px;
  color: var(--ink-muted);
}

.dialog__close {
  display: grid;
  flex: none;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 50%;
  background: var(--paper-sunk);
  color: var(--ink-muted);
  transition: background-color 0.16s var(--ease);
}

.dialog__close:hover:not(:disabled) {
  background: var(--line);
  color: var(--ink);
}

.dialog__close :deep(.icon) {
  width: 18px;
  height: 18px;
}

.dialog__hidden {
  display: none;
}

.upload {
  display: grid;
  gap: 6px;
}

.upload__bar {
  overflow: hidden;
  height: 6px;
  border-radius: 999px;
  background: var(--paper-sunk);
}

.upload__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--brand);
  transition: width 0.2s var(--ease);
}

.upload__text {
  font-size: 12px;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

.dialog__error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-radius: var(--r-sm);
  background: var(--danger-tint);
  color: var(--danger);
  font-size: 13px;
}

.dialog__error :deep(.icon) {
  flex: none;
  width: 16px;
  height: 16px;
}

.dialog__actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-top: 4px;
}

.dialog__side,
.dialog__main {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.dialog__actions :deep(.icon) {
  width: 16px;
  height: 16px;
}

.btn--quiet-danger {
  --btn-fg: var(--danger);
}

.btn--quiet-danger:hover:not(:disabled) {
  --btn-border: var(--danger);

  background: var(--danger-tint);
}

@media (max-width: 560px) {
  .overlay {
    align-items: end;
    padding: 12px 0 0;
  }

  .dialog {
    gap: 14px;
    padding: 20px 16px 0;
    border-radius: var(--r-xl) var(--r-xl) 0 0;
  }

  .dialog__actions {
    position: sticky;
    bottom: 0;
    width: auto;
    margin-inline: -16px;
    padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
    border-top: 1px solid var(--line);
    background: var(--paper-raised);
  }

  .dialog__side,
  .dialog__main {
    flex-wrap: nowrap;
    width: 100%;
  }

  .dialog__side > .btn,
  .dialog__main > .btn {
    flex: 1;
    min-width: 0;
    padding: 0 12px;
  }
}
</style>
