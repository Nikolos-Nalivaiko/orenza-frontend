<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import {
  ACTIVITY_ICONS,
  ACTIVITY_KIND_LABELS,
  ACTIVITY_PAGE,
  formatMomentDay,
  formatMomentTime,
  NOTE_MAX,
  type ActivityEntry,
} from '@/lib/activity'

/**
 * Стрічка подій обʼєкта. Автоподії й ручні нотатки лежать в одній хронології:
 * людина читає історію обʼєкта підряд, а не двома окремими списками.
 *
 * Одразу показуємо тільки останні записи — історія обʼєкта за рік не має
 * висіти на екрані щоразу, коли відкрили картку.
 */

const props = defineProps<{ entries: ActivityEntry[]; today: string }>()

const emit = defineEmits<{ note: [text: string]; remove: [recordId: number] }>()

const composer = useTemplateRef<HTMLTextAreaElement>('composer')

const expanded = ref(false)
const writing = ref(false)
const note = ref('')

const visible = computed(() =>
  expanded.value ? props.entries : props.entries.slice(0, ACTIVITY_PAGE),
)

const hidden = computed(() => Math.max(0, props.entries.length - ACTIVITY_PAGE))

const tooLong = computed(() => note.value.trim().length > NOTE_MAX)

async function startNote(): Promise<void> {
  writing.value = true

  await nextTick()
  composer.value?.focus()
}

function cancelNote(): void {
  writing.value = false
  note.value = ''
}

function saveNote(): void {
  if (note.value.trim() === '' || tooLong.value) {
    return
  }

  emit('note', note.value)
  cancelNote()
}
</script>

<template>
  <section class="act">
    <header class="act__head">
      <h2 class="act__title">
        Стрічка подій
        <span v-if="entries.length > 0" class="act__count">{{ entries.length }}</span>
      </h2>

      <button v-if="!writing" type="button" class="add" @click="startNote">
        <AppIcon name="plus" />
        Заметка
      </button>
    </header>

    <!-- Нотатка пишеться зверху стрічки — там, де вона за мить і зʼявиться. -->
    <div v-if="writing" class="note">
      <textarea
        ref="composer"
        v-model="note"
        class="ctl ctl--area"
        rows="3"
        placeholder="Що сталося на обʼєкті: домовленість, зауваження, обіцянка підрядника"
        aria-label="Текст нотатки"
        @keydown.esc="cancelNote"
        @keydown.enter.ctrl="saveNote"
      />

      <div class="note__foot">
        <button
          type="button"
          class="mini mini--go"
          :disabled="note.trim() === '' || tooLong"
          @click="saveNote"
        >
          Додати в стрічку
        </button>
        <button type="button" class="mini" @click="cancelNote">Скасувати</button>

        <span v-if="tooLong" class="note__bad">Максимум {{ NOTE_MAX }} символів</span>
        <span v-else class="note__hint">Ctrl + Enter</span>
      </div>
    </div>

    <p v-if="entries.length === 0" class="empty">
      Тут зʼявляться зміни статусу, нові матеріали й роботи, платежі та фото — усе, що відбувається
      з обʼєктом. Перший запис можна зробити й руками.
    </p>

    <ol v-else class="feed">
      <li v-for="item in visible" :key="item.id" class="row" :class="`row--${item.kind}`">
        <span class="row__mark" aria-hidden="true">
          <AppIcon :name="ACTIVITY_ICONS[item.kind]" />
        </span>

        <div class="row__body">
          <p class="row__text">
            {{ item.text }}
            <span v-if="item.detail" class="row__detail">{{ item.detail }}</span>
          </p>

          <p class="row__meta">
            <span>{{ ACTIVITY_KIND_LABELS[item.kind] }}</span>
            <template v-if="formatMomentTime(item.at)">
              <span aria-hidden="true">·</span>
              <span>{{ formatMomentTime(item.at) }}</span>
            </template>

            <!-- Прибрати можна тільки свою нотатку: автоподію видалити нема
                 сенсу. Кнопка стоїть при підписі нотатки, а не з краю рядка:
                 з краю вона зсувала дату й ламала колонку дат. -->
            <button
              v-if="item.recordId !== null"
              type="button"
              class="row__drop"
              aria-label="Прибрати нотатку"
              @click="emit('remove', item.recordId)"
            >
              <AppIcon name="trash" />
            </button>
          </p>
        </div>

        <time class="row__day">{{ formatMomentDay(item.at, today) }}</time>
      </li>
    </ol>

    <button v-if="hidden > 0" type="button" class="more" @click="expanded = !expanded">
      {{ expanded ? 'Згорнути' : `Показати все — ще ${hidden}` }}

      <span class="more__arrow" :class="{ 'more__arrow--up': expanded }" aria-hidden="true">
        <AppIcon name="chevron" />
      </span>
    </button>
  </section>
</template>

<style scoped>
.act {
  display: grid;
  gap: 12px;
}

.act__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.act__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.act__count {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 11px;
  text-align: center;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

.add {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 13px 6px 10px;
  border: 1px dashed var(--line-strong);
  border-radius: 999px;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  transition:
    border-color 0.18s var(--ease),
    background-color 0.18s var(--ease);
}

.add:hover {
  border-color: var(--brand);
  background: var(--brand-tint);
}

.add :deep(.icon) {
  width: 14px;
  height: 14px;
}

/* ── Нотатка ───────────────────────────────────────────────────── */

.note {
  display: grid;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-sunk);
}

.ctl--area {
  height: auto;
  padding: 8px 10px;
  line-height: 1.5;
  resize: vertical;
}

.note__foot {
  display: flex;
  align-items: center;
  gap: 8px;
}

.note__hint,
.note__bad {
  font-size: 11.5px;
  color: var(--ink-faint);
}

.note__bad {
  color: var(--danger);
}

.mini {
  padding: 5px 12px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.mini:hover:not(:disabled) {
  border-color: var(--ink);
}

.mini:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mini--go {
  border-color: transparent;
  background: var(--ink);
  color: #fff;
}

.mini--go:hover:not(:disabled) {
  background: var(--ink-soft);
}

/* ── Стрічка ───────────────────────────────────────────────────── */

.feed {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.row {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
  padding: 9px 0;
}

/* Вертикаль стрічки: тонка лінія між мітками подій. */
.row:not(:last-child)::before {
  content: '';
  position: absolute;
  top: 37px;
  bottom: -1px;
  left: 13px;
  width: 1px;
  background: var(--line);
}

.row__mark {
  display: grid;
  place-items: center;
  width: 27px;
  height: 27px;
  border-radius: 9px;
  background: var(--paper-sunk);
  color: var(--ink-muted);
}

.row__mark :deep(.icon) {
  width: 15px;
  height: 15px;
}

/* Кольором відділені лише ті події, за якими справді стежать. */
.row--payment .row__mark {
  background: var(--c-2-soft);
  color: var(--c-2);
}

.row--material .row__mark {
  background: var(--c-3-soft);
  color: var(--c-3);
}

.row--service .row__mark {
  background: var(--c-4-soft);
  color: var(--c-4);
}

.row--status .row__mark,
.row--stage .row__mark {
  background: var(--c-1-soft);
  color: var(--c-1);
}

/* Нотатка людини навмисно не системного кольору — її видно з першого погляду. */
.row--note .row__mark {
  background: var(--amber-tint);
  color: var(--amber);
}

.row__body {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.row__text {
  font-size: 13px;
  line-height: 1.45;
}

.row--note .row__text {
  white-space: pre-line;
}

.row__detail {
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

.row__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.row__day {
  padding-top: 1px;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-faint);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/*
 * Прибрати нотатку — дія рідкісна, але шукати її не мають: кнопка видима
 * завжди, просто тихою плашкою. Ховати її під наведення означало б, що з
 * телефона нотатку не прибрати взагалі.
 */
.row__drop {
  display: grid;
  place-items: center;
  width: 24px;
  height: 24px;

  /* Кнопка вища за рядок підпису — вертикаль зрізаємо, щоб нотатка не була
     вищою за сусідні події. */
  margin: -5px 0 -5px 4px;
  border: 0;
  border-radius: 7px;
  background: var(--paper-sunk);
  color: var(--ink-muted);
  transition:
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.row:hover .row__drop {
  color: var(--ink);
}

.row__drop:hover,
.row__drop:focus-visible {
  background: var(--danger-tint);
  color: var(--danger);
}

.row__drop :deep(.icon) {
  width: 15px;
  height: 15px;
}

.more {
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-muted);
  transition:
    border-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.more:hover {
  border-color: var(--ink);
  color: var(--ink);
}

.more__arrow {
  display: grid;
  transition: transform 0.2s var(--ease);
}

.more__arrow :deep(.icon) {
  width: 15px;
  height: 15px;
}

.more__arrow--up {
  transform: rotate(180deg);
}

.empty {
  max-width: 62ch;
  padding: 18px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-md);
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink-muted);
}
</style>
