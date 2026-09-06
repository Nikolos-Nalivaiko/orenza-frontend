<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { EMPLOYEE_NOTES_MAX } from '@/lib/employees'

/**
 * Опис співробітника: що людина вміє краще за інших і чого від неї не
 * чекати. Це не хроніка робіт, а памʼятка, яку перечитують перед тим, як
 * ставити людину на обʼєкт, — тож вона живе одним текстом, який правлять, а
 * не списком записів, який росте.
 */

const props = defineProps<{ notes: string }>()

const emit = defineEmits<{ save: [notes: string] }>()

const area = useTemplateRef<HTMLTextAreaElement>('area')

const editing = ref(false)
const draft = ref('')

const tooLong = computed(() => draft.value.trim().length > EMPLOYEE_NOTES_MAX)

async function start(): Promise<void> {
  draft.value = props.notes
  editing.value = true

  await nextTick()
  area.value?.focus()
}

function save(): void {
  if (tooLong.value) {
    return
  }

  emit('save', draft.value)
  editing.value = false
}
</script>

<template>
  <section class="notes">
    <header class="notes__head">
      <h2 class="notes__title">Що варто знати про людину</h2>

      <button v-if="!editing" type="button" class="mini" @click="start">
        <AppIcon :name="notes === '' ? 'plus' : 'edit'" />
        {{ notes === '' ? 'Додати' : 'Редагувати' }}
      </button>
    </header>

    <template v-if="editing">
      <textarea
        ref="area"
        v-model="draft"
        class="ctl ctl--area"
        rows="6"
        aria-label="Опис співробітника"
        placeholder="Що робить краще за інших, куди не поїде, як із ним домовлятись про обсяги"
        @keydown.esc="editing = false"
        @keydown.enter.ctrl="save"
      />

      <div class="notes__foot">
        <button type="button" class="mini mini--go" :disabled="tooLong" @click="save">
          Зберегти
        </button>
        <button type="button" class="mini" @click="editing = false">Скасувати</button>

        <span v-if="tooLong" class="notes__bad">Максимум {{ EMPLOYEE_NOTES_MAX }} символів</span>
        <span v-else class="notes__hint">Ctrl + Enter</span>
      </div>
    </template>

    <p v-else-if="notes === ''" class="empty">
      Тут тримають те, чого немає в жодній роботі: на чому людина сильна, чого не береться робити,
      про які умови вже домовились. Саме це й доводиться згадувати, коли треба швидко зібрати
      бригаду.
    </p>

    <p v-else class="text">{{ notes }}</p>
  </section>
</template>

<style scoped>
.notes {
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 20px 22px 22px;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

.notes__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--line);
}

.notes__title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.text {
  font-size: 14.5px;
  line-height: 1.65;
  white-space: pre-line;
  color: var(--ink-soft);
}

.empty {
  padding: 18px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-md);
  font-size: 13px;
  line-height: 1.55;
  color: var(--ink-muted);
}

.ctl--area {
  height: auto;
  min-height: 132px;
  padding: 10px 12px;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
}

.notes__foot {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notes__hint,
.notes__bad {
  font-size: 11.5px;
  color: var(--ink-faint);
}

.notes__bad {
  color: var(--danger);
}

.mini {
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

.mini:hover:not(:disabled) {
  border-color: var(--ink);
}

.mini:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mini :deep(.icon) {
  width: 14px;
  height: 14px;
}

.mini--go {
  border-color: transparent;
  background: var(--ink);
  color: #fff;
}

.mini--go:hover:not(:disabled) {
  background: var(--ink-soft);
}
</style>
