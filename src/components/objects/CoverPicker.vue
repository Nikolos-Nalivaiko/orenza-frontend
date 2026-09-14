<script setup lang="ts">
import { useTemplateRef } from 'vue'
import CoverDropzone from '@/components/cover/CoverDropzone.vue'
import CoverFocusPicker from '@/components/cover/CoverFocusPicker.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useCoverFile } from '@/composables/useCoverFile'
import type { CoverDraft, CoverFocus } from '@/lib/cover'

defineProps<{ error?: string }>()

const model = defineModel<CoverDraft | null>({ required: true })

const dropzone = useTemplateRef<InstanceType<typeof CoverDropzone>>('dropzone')

const { preparing, problem, prepare, release, clearProblem } = useCoverFile()

async function onPick(file: File): Promise<void> {
  const next = await prepare(file)

  if (next !== null) {
    release(model.value)
    model.value = next
  }
}

function setFocus(focus: CoverFocus): void {
  if (model.value !== null) {
    model.value = { ...model.value, focus }
  }
}

function remove(): void {
  release(model.value)
  model.value = null
  clearProblem()
}
</script>

<template>
  <div class="cover">
    <CoverDropzone
      ref="dropzone"
      :class="{ cover__hidden: model !== null }"
      :busy="preparing"
      :paste="false"
      @pick="onPick"
    />

    <div v-if="model" class="shot">
      <CoverFocusPicker
        :model-value="model.focus"
        :src="model.preview"
        :width="model.width"
        :height="model.height"
        @update:model-value="setFocus"
      />

      <div class="shot__bar">
        <span class="shot__name">{{ model.file.name }} · {{ model.width }}×{{ model.height }}</span>

        <span class="shot__actions">
          <button type="button" class="shot__btn" :disabled="preparing" @click="dropzone?.open()">
            <AppIcon name="upload" />
            Замінити
          </button>
          <button type="button" class="shot__btn shot__btn--drop" @click="remove">
            <AppIcon name="trash" />
            Прибрати
          </button>
        </span>
      </div>
    </div>

    <p v-if="problem || error" class="cover__error" role="alert">{{ problem || error }}</p>
  </div>
</template>

<style scoped>
.cover {
  display: grid;
  gap: 8px;
}

.cover__hidden {
  display: none;
}

.shot {
  display: grid;
  gap: 14px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-raised);
  animation: appear 0.3s var(--ease);
}

@keyframes appear {
  from {
    opacity: 0;
    transform: scale(0.985);
  }
}

.shot__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
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

.shot__btn:hover:not(:disabled) {
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
