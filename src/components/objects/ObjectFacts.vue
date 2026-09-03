<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { parseAmount } from '@/lib/amount'
import { DISCOUNT_KIND_LABELS, DISCOUNT_PERCENT_MAX, type DiscountKind } from '@/lib/finance'
import {
  daysBetween,
  DESCRIPTION_MAX,
  formatDay,
  formatDays,
  formatDiscount,
  OBJECT_DATE_LABELS,
  todayIso,
  type ConstructionObject,
  type ObjectDateField,
} from '@/lib/objects'

/**
 * Основне про обʼєкт — читабельний блок, а не форма: поля стоять як текст,
 * а редактор відкривається по кліку рівно там, куди натиснули.
 *
 * Дати зведені в матрицю «план проти факту»: саме так на них і дивляться —
 * не чотирма окремими полями, а двома парами, між якими видно зсув.
 *
 * Статус, етап і замовник сюди не потрапляють навмисно — вони вже в шапці
 * картки, і другий їхній примірник лише розтягував би екран.
 */

type FieldKey = ObjectDateField | 'description' | 'discount'

interface DateRow {
  label: string
  plan: ObjectDateField
  fact: ObjectDateField
}

const props = defineProps<{ object: ConstructionObject }>()

const emit = defineEmits<{
  description: [value: string]
  date: [field: ObjectDateField, value: string]
  discount: [percent: number | null, amount: number | null]
}>()

/** Дати йдуть парами «план — факт»: саме так їх і звіряють. */
const DATE_ROWS: readonly DateRow[] = [
  { label: 'Початок', plan: 'started_at', fact: 'actual_started_at' },
  { label: 'Завершення', plan: 'finished_at', fact: 'actual_finished_at' },
]

/** День фіксуємо на час життя блоку — кнопка «сьогодні» не має мінятись у руках. */
const today = todayIso()

const editor = useTemplateRef<HTMLElement>('editor')

const editing = ref<FieldKey | null>(null)
const draft = ref('')
const draftKind = ref<DiscountKind>('percent')
const problem = ref('')

const discount = computed(() =>
  formatDiscount(props.object.discount_percent, props.object.discount_amount),
)

const created = computed(() =>
  props.object.created_at === null ? '' : formatDay(props.object.created_at.slice(0, 10)),
)

/** Плановий строк обʼєкта — підпис під матрицею дат. */
const planSpan = computed(() => {
  const { started_at: start, finished_at: end } = props.object

  return start === null || end === null ? null : daysBetween(start, end)
})

/**
 * Фактичний строк: поки обʼєкт не закритий, рахуємо від фактичного початку
 * до сьогодні — це і є «скільки вже триває».
 */
const factSpan = computed(() => {
  const start = props.object.actual_started_at

  if (start === null) {
    return null
  }

  const end = props.object.actual_finished_at
  const days = daysBetween(start, end ?? today)

  return days === null ? null : { done: end !== null, days }
})

function dateValue(field: ObjectDateField): string {
  return props.object[field] ?? ''
}

/* ── Шкала строків ─────────────────────────────────────────────── */

/**
 * Вісь смуг: від найранішої з відомих дат до найпізнішої, включно з
 * сьогоднішнім днем. Без планової пари шкали немає — нема від чого міряти.
 */
const axis = computed(() => {
  const object = props.object

  if (object.started_at === null || object.finished_at === null) {
    return null
  }

  const points = [
    object.started_at,
    object.finished_at,
    object.actual_started_at,
    object.actual_finished_at,
    today,
  ].filter((day): day is string => day !== null)

  const from = points.reduce((min, day) => (day < min ? day : min))
  const to = points.reduce((max, day) => (day > max ? day : max))
  const total = daysBetween(from, to)

  return total === null || total <= 0 ? null : { from, to, total }
})

/** Місце дати на шкалі, у відсотках її довжини. */
function at(day: string): number {
  const scale = axis.value

  if (scale === null) {
    return 0
  }

  const passed = daysBetween(scale.from, day) ?? 0

  return Math.min(100, Math.max(0, (passed / scale.total) * 100))
}

function bar(from: string, to: string): { left: string; width: string } {
  const left = at(from)

  return { left: `${left}%`, width: `${Math.max(at(to) - left, 0)}%` }
}

const planBar = computed(() => {
  const { started_at: start, finished_at: end } = props.object

  return axis.value === null || start === null || end === null ? null : bar(start, end)
})

const factBar = computed(() => {
  const start = props.object.actual_started_at

  return axis.value === null || start === null
    ? null
    : bar(start, props.object.actual_finished_at ?? today)
})

/** Робота ще йде — у смуги немає правого краю, тож вона в штрихуванні. */
const factOpen = computed(() => props.object.actual_finished_at === null)

/** Факт переліз плановий фініш — уся смуга червоніє, а не лише хвіст. */
const factLate = computed(() => {
  const { finished_at: plan, actual_started_at: start, actual_finished_at: fact } = props.object

  return plan !== null && start !== null && (fact ?? today) > plan
})

const nowAt = computed(() => {
  const scale = axis.value

  return scale === null || today < scale.from || today > scale.to ? null : at(today)
})

/**
 * Підпис «сьогодні» стоїть під самою рискою, а коли та підходить до краю —
 * притискається до краю й ховає крайню дату осі: два підписи на одному місці
 * гірше, ніж один.
 */
const nowTag = computed(() => {
  const pos = nowAt.value

  if (pos === null) {
    return null
  }

  if (pos >= 84) {
    return { style: { right: '0' }, hideFrom: false, hideTo: true }
  }

  if (pos <= 16) {
    return { style: { left: '0' }, hideFrom: true, hideTo: false }
  }

  return {
    style: { left: `${pos}%`, transform: 'translateX(-50%)' },
    hideFrom: false,
    hideTo: false,
  }
})

/** Зсув факту від плану: додатне — пізніше, ніж домовлялись. */
function shift(row: DateRow): number | null {
  const plan = props.object[row.plan]
  const fact = props.object[row.fact]

  return plan === null || fact === null ? null : daysBetween(plan, fact)
}

async function open(field: FieldKey): Promise<void> {
  problem.value = ''
  editing.value = field

  if (field === 'description') {
    draft.value = props.object.description ?? ''
  } else if (field === 'discount') {
    draftKind.value = props.object.discount_amount === null ? 'percent' : 'amount'
    draft.value = String(props.object.discount_amount ?? props.object.discount_percent ?? '')
  } else {
    draft.value = dateValue(field)
  }

  await nextTick()
  editor.value?.querySelector<HTMLElement>('input, textarea')?.focus()
}

function close(): void {
  editing.value = null
  problem.value = ''
}

/** Пара дат не має суперечити сама собі — це найчастіша описка в картці. */
function dateProblem(field: ObjectDateField, value: string): string {
  if (value === '') {
    return ''
  }

  const object = props.object
  const plan = field === 'started_at' || field === 'finished_at'
  const start = plan ? object.started_at : object.actual_started_at
  const end = plan ? object.finished_at : object.actual_finished_at

  const span =
    field === 'started_at' || field === 'actual_started_at'
      ? daysBetween(value, end ?? '')
      : daysBetween(start ?? '', value)

  return span !== null && span < 0 ? 'Завершення раніше за початок' : ''
}

/** Факт відмічають у той самий день, коли він стався, — тож в один дотик. */
function setToday(field: ObjectDateField): void {
  emit('date', field, today)
}

function clearDate(field: ObjectDateField): void {
  emit('date', field, '')
  close()
}

function saveDiscount(): void {
  const raw = draft.value.trim()

  if (raw === '') {
    emit('discount', null, null)
    close()

    return
  }

  const value = parseAmount(raw)

  if (value === null) {
    problem.value = 'Тільки число'

    return
  }

  if (value < 0) {
    problem.value = 'Не менше нуля'

    return
  }

  if (draftKind.value === 'percent' && value > DISCOUNT_PERCENT_MAX) {
    problem.value = `Максимум ${DISCOUNT_PERCENT_MAX}%`

    return
  }

  if (value === 0) {
    emit('discount', null, null)
  } else if (draftKind.value === 'percent') {
    emit('discount', value, null)
  } else {
    emit('discount', null, value)
  }

  close()
}

function save(): void {
  const field = editing.value

  if (field === null) {
    return
  }

  if (field === 'description') {
    if (draft.value.trim().length > DESCRIPTION_MAX) {
      problem.value = `Максимум ${DESCRIPTION_MAX} символів`

      return
    }

    emit('description', draft.value)
    close()

    return
  }

  if (field === 'discount') {
    saveDiscount()

    return
  }

  const bad = dateProblem(field, draft.value)

  if (bad !== '') {
    problem.value = bad

    return
  }

  emit('date', field, draft.value)
  close()
}
</script>

<template>
  <section ref="editor" class="facts">
    <header class="facts__head">
      <h2 class="facts__title">Основне</h2>
      <p class="facts__hint">Натисніть на значення, щоб виправити</p>
    </header>

    <!-- Опис — єдине довге поле блоку, тож стоїть окремо й на всю ширину. -->
    <div class="block">
      <p class="block__label">Опис</p>

      <div v-if="editing === 'description'" class="edit">
        <textarea
          v-model="draft"
          class="ctl ctl--area"
          rows="3"
          aria-label="Опис обʼєкта"
          placeholder="Що саме робимо на обʼєкті"
          @keydown.esc="close"
          @keydown.enter.ctrl="save"
        />

        <div class="edit__foot">
          <button type="button" class="mini mini--go" @click="save">Зберегти</button>
          <button type="button" class="mini" @click="close">Скасувати</button>

          <span
            class="edit__count"
            :class="{ 'edit__count--over': draft.length > DESCRIPTION_MAX }"
          >
            {{ draft.length }} / {{ DESCRIPTION_MAX }}
          </span>
        </div>

        <p v-if="problem" class="edit__bad">{{ problem }}</p>
      </div>

      <button v-else type="button" class="pick pick--text" @click="open('description')">
        <span v-if="object.description" class="pick__text">{{ object.description }}</span>
        <span v-else class="pick__none">Опис не заповнено</span>
        <span class="pick__pen" aria-hidden="true"><AppIcon name="document" /></span>
      </button>
    </div>

    <!-- Строки: план і факт стоять у двох колонках, щоб зсув було видно
         одразу, без арифметики в голові. -->
    <div class="block">
      <header class="dates__head">
        <p class="block__label">Строки</p>

        <p class="dates__span">
          <template v-if="planSpan !== null">
            За планом — <span class="dates__strong">{{ formatDays(planSpan) }}</span>
          </template>
          <template v-if="planSpan !== null && factSpan"> · </template>
          <template v-if="factSpan">
            {{ factSpan.done ? 'фактично' : 'триває вже' }}
            <span class="dates__strong">{{ formatDays(factSpan.days) }}</span>
          </template>
          <template v-if="planSpan === null && factSpan === null">
            Строки ще не заповнені
          </template>
        </p>
      </header>

      <!-- Дві смуги на спільній осі: план як опора, факт поверх нього. Зсув,
           який у таблиці читається числом, тут видно як довжину. -->
      <div v-if="axis && planBar" class="tl">
        <div class="tl__names">
          <span>План</span>
          <span>Факт</span>
        </div>

        <div class="tl__area">
          <span class="tl__track">
            <span class="tl__bar tl__bar--plan" :style="planBar" />
          </span>

          <span class="tl__track">
            <span
              v-if="factBar"
              class="tl__bar"
              :class="[factLate ? 'tl__bar--late' : 'tl__bar--fact', { 'tl__bar--open': factOpen }]"
              :style="factBar"
            />
            <span v-else class="tl__none">факт не відмічено</span>
          </span>

          <!-- Сьогодні — єдина точка на осі, якої немає в жодному полі. -->
          <span
            v-if="nowAt !== null"
            class="tl__now"
            :style="{ left: `${nowAt}%` }"
            title="Сьогодні"
            aria-hidden="true"
          />
        </div>

        <div class="tl__axis">
          <span :class="{ 'is-away': nowTag?.hideFrom }">{{ formatDay(axis.from) }}</span>

          <span v-if="nowTag" class="tl__nowtag" :style="nowTag.style">сьогодні</span>

          <span :class="{ 'is-away': nowTag?.hideTo }">{{ formatDay(axis.to) }}</span>
        </div>
      </div>

      <div class="dates">
        <span class="dates__gap" />
        <p class="dates__col">План</p>
        <p class="dates__col">Факт</p>

        <template v-for="row in DATE_ROWS" :key="row.label">
          <p class="dates__row">{{ row.label }}</p>

          <div class="dates__cell" :class="{ 'dates__cell--edit': editing === row.plan }">
            <div v-if="editing === row.plan" class="edit">
              <input
                v-model="draft"
                class="ctl"
                type="date"
                :aria-label="OBJECT_DATE_LABELS[row.plan]"
                @keydown.esc="close"
                @keydown.enter="save"
              />

              <div class="edit__foot">
                <button type="button" class="mini mini--go" @click="save">Зберегти</button>
                <button type="button" class="mini" @click="close">Скасувати</button>
                <button
                  v-if="dateValue(row.plan)"
                  type="button"
                  class="mini mini--drop"
                  @click="clearDate(row.plan)"
                >
                  Очистити
                </button>
              </div>

              <p v-if="problem" class="edit__bad">{{ problem }}</p>
            </div>

            <button
              v-else
              type="button"
              class="pick"
              :aria-label="OBJECT_DATE_LABELS[row.plan]"
              @click="open(row.plan)"
            >
              <span v-if="dateValue(row.plan)" class="pick__strong">
                {{ formatDay(dateValue(row.plan)) }}
              </span>
              <span v-else class="pick__none">не вказано</span>
              <span class="pick__pen" aria-hidden="true"><AppIcon name="document" /></span>
            </button>
          </div>

          <div class="dates__cell" :class="{ 'dates__cell--edit': editing === row.fact }">
            <div v-if="editing === row.fact" class="edit">
              <input
                v-model="draft"
                class="ctl"
                type="date"
                :aria-label="OBJECT_DATE_LABELS[row.fact]"
                @keydown.esc="close"
                @keydown.enter="save"
              />

              <div class="edit__foot">
                <button type="button" class="mini mini--go" @click="save">Зберегти</button>
                <button type="button" class="mini" @click="close">Скасувати</button>
                <button
                  v-if="dateValue(row.fact)"
                  type="button"
                  class="mini mini--drop"
                  @click="clearDate(row.fact)"
                >
                  Очистити
                </button>
              </div>

              <p v-if="problem" class="edit__bad">{{ problem }}</p>
            </div>

            <template v-else>
              <button
                type="button"
                class="pick"
                :aria-label="OBJECT_DATE_LABELS[row.fact]"
                @click="open(row.fact)"
              >
                <span v-if="dateValue(row.fact)" class="pick__strong">
                  {{ formatDay(dateValue(row.fact)) }}
                </span>
                <span v-else class="pick__none">не вказано</span>
                <span class="pick__pen" aria-hidden="true"><AppIcon name="document" /></span>
              </button>

              <!-- Зсув від плану — головне, заради чого факт узагалі ведуть. -->
              <span
                v-if="shift(row) !== null"
                class="chip"
                :class="{
                  'chip--late': (shift(row) ?? 0) > 0,
                  'chip--early': (shift(row) ?? 0) < 0,
                }"
              >
                <template v-if="shift(row) === 0">вчасно</template>
                <template v-else>
                  {{ (shift(row) ?? 0) > 0 ? '+' : '−' }}{{ formatDays(shift(row) ?? 0) }}
                </template>
              </span>

              <!-- Факт відмічають у день, коли він стався: один дотик замість
                   календаря. -->
              <button
                v-else-if="!dateValue(row.fact)"
                type="button"
                class="quick"
                @click="setToday(row.fact)"
              >
                сьогодні
              </button>
            </template>
          </div>
        </template>
      </div>
    </div>

    <div class="block block--meta">
      <div class="meta">
        <p class="block__label">Знижка</p>

        <div v-if="editing === 'discount'" class="edit">
          <div class="disc">
            <select v-model="draftKind" class="ctl ctl--select disc__kind" aria-label="Тип знижки">
              <option v-for="(label, value) in DISCOUNT_KIND_LABELS" :key="value" :value="value">
                {{ label }}
              </option>
            </select>

            <input
              v-model="draft"
              class="ctl ctl--num"
              type="text"
              inputmode="decimal"
              placeholder="0"
              aria-label="Розмір знижки"
              @keydown.esc="close"
              @keydown.enter="save"
            />
          </div>

          <div class="edit__foot">
            <button type="button" class="mini mini--go" @click="save">Зберегти</button>
            <button type="button" class="mini" @click="close">Скасувати</button>
          </div>

          <p v-if="problem" class="edit__bad">{{ problem }}</p>
        </div>

        <button v-else type="button" class="pick" @click="open('discount')">
          <span v-if="discount" class="chip chip--brand">−{{ discount }}</span>
          <span v-else class="pick__none">без знижки</span>
          <span class="pick__pen" aria-hidden="true"><AppIcon name="document" /></span>
        </button>
      </div>

      <!-- Дата заведення картки: єдине поле блоку, яке ніхто не редагує. -->
      <div class="meta">
        <p class="block__label">Створено</p>
        <p class="meta__flat">{{ created || '—' }}</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.facts {
  /* Блок живе в картці «Огляду», ширина якої залежить від бічної панелі —
     тож розкладку міряємо по блоку, а не по вікну. */
  container-type: inline-size;

  display: grid;
  gap: 14px;
}

.facts__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.facts__title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

/* Підказка про редагування тиха: вона потрібна один раз, першого дня. */
.facts__hint {
  font-size: 11.5px;
  color: var(--ink-faint);
}

/* Три смислові блоки — опис, строки, дрібниці — розділені лінією, а не
   порожнечею: інакше поля зливаються в один довгий список. */
.block {
  display: grid;
  gap: 8px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.block--meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 8px 24px;
  align-items: start;
}

.block__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

/* ── Строки ────────────────────────────────────────────────────── */

.dates__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 16px;
}

.dates__span {
  font-size: 12px;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.dates__strong {
  font-weight: 600;
  color: var(--ink-muted);
}

/* ── Шкала ─────────────────────────────────────────────────────── */

.tl {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 6px 12px;
  padding: 4px 0 2px;
}

.tl__names,
.tl__area {
  display: grid;
  grid-template-rows: 20px 20px;
  gap: 4px;
  align-items: center;
}

.tl__names {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--ink-faint);
}

/* Смуги живуть на спільній осі — «сьогодні» тому й можна провести наскрізь. */
.tl__area {
  position: relative;
  min-width: 0;
}

.tl__track {
  position: relative;
  height: 9px;
  border-radius: 999px;
  background: var(--paper-sunk);
}

.tl__bar {
  position: absolute;
  top: 0;
  bottom: 0;
  min-width: 7px;
  border-radius: 999px;
  transition:
    left 0.35s var(--ease),
    width 0.35s var(--ease);
}

/* План — опора, а не подія: він тримає фон, по якому міряють факт. */
.tl__bar--plan {
  background: var(--line-strong);
}

.tl__bar--fact {
  background: var(--brand);
}

.tl__bar--late {
  background: var(--danger);
}

/* Робота ще йде: у смуги немає правого краю, тож вона в штрихуванні. */
.tl__bar--open {
  background-image: repeating-linear-gradient(
    115deg,
    rgb(255 255 255 / 42%) 0 3px,
    transparent 3px 7px
  );
  border-top-right-radius: 2px;
  border-bottom-right-radius: 2px;
}

.tl__none {
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  font-size: 11px;
  color: var(--ink-faint);
}

/* Пунктир, а не суцільна лінія: суцільну читають як межу смуги. */
.tl__now {
  position: absolute;
  top: -4px;
  bottom: -4px;
  width: 1px;
  background: repeating-linear-gradient(180deg, var(--ink-muted) 0 3px, transparent 3px 6px);
}

.tl__now::before {
  content: '';
  position: absolute;
  top: -3px;
  left: -2px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--ink);
}

.tl__axis {
  position: relative;
  grid-column: 2;
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 10.5px;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

/* Підпис риски — без нього вертикальна лінія просто незрозуміла. */
.tl__nowtag {
  position: absolute;
  top: 0;
  font-weight: 600;
  white-space: nowrap;
  color: var(--ink-muted);
}

/* Крайню дату не прибираємо, а ховаємо: інакше вісь стрибає. */
.is-away {
  visibility: hidden;
}

.dates {
  display: grid;
  grid-template-columns: minmax(88px, auto) minmax(120px, 1fr) minmax(120px, 1fr);
  align-items: center;
  gap: 6px 16px;
}

.dates__col {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.dates__row {
  font-size: 13px;
  color: var(--ink-muted);
}

.dates__cell {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

/* Відкритий редактор забирає всю ширину клітинки — кнопкам поруч тісно. */
.dates__cell--edit {
  display: block;
}

/* ── Значення ──────────────────────────────────────────────────── */

/* Значення — кнопка, але виглядає як текст: рамка зʼявляється при наведенні. */
.pick {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 4px 8px;
  margin-left: -8px;
  border: 1px solid transparent;
  border-radius: var(--r-xs);
  background: transparent;
  text-align: left;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease);
}

.pick--text {
  width: 100%;
}

.pick:hover {
  border-color: var(--line);
  background: var(--paper-sunk);
}

.pick__strong {
  font-size: 13.5px;
  font-weight: 600;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.pick__text {
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--ink-soft);
}

.pick__none {
  font-size: 13px;
  white-space: nowrap;
  color: var(--ink-faint);
}

/* Олівець тримається невидимим, поки на значення не навели: підказка потрібна
   в момент наміру, а не постійно. */
.pick__pen {
  display: grid;
  flex: none;
  margin-left: auto;
  color: var(--ink-faint);
  opacity: 0;
  transition: opacity 0.16s var(--ease);
}

.pick__pen :deep(.icon) {
  width: 14px;
  height: 14px;
}

.pick:hover .pick__pen,
.pick:focus-visible .pick__pen {
  opacity: 1;
}

/* Швидка дія коло порожнього факту. */
.quick {
  flex: none;
  padding: 3px 9px;
  border: 1px dashed var(--line-strong);
  border-radius: 999px;
  background: transparent;
  font-size: 11px;
  font-weight: 600;
  color: var(--ink-faint);
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.quick:hover {
  border-style: solid;
  border-color: var(--brand);
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.chip {
  flex: none;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--paper-sunk);
  color: var(--ink-muted);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.chip--brand {
  background: var(--brand-tint);
  color: var(--brand-strong);
  font-size: 12px;
}

.chip--early {
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.chip--late {
  background: var(--danger-tint);
  color: var(--danger);
}

/* ── Редактор ──────────────────────────────────────────────────── */

.edit {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.edit__foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.edit__count {
  margin-left: auto;
  font-size: 11px;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.edit__count--over {
  color: var(--danger);
}

.edit__bad {
  font-size: 12px;
  color: var(--danger);
}

.ctl--area {
  height: auto;
  padding: 8px 10px;
  line-height: 1.5;
  resize: vertical;
}

.disc {
  display: flex;
  gap: 6px;
}

.disc__kind {
  width: 64px;
  flex: none;
}

.mini {
  padding: 4px 11px;
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

.mini:hover {
  border-color: var(--ink);
}

.mini--go {
  border-color: transparent;
  background: var(--ink);
  color: #fff;
}

.mini--go:hover {
  background: var(--ink-soft);
}

.mini--drop {
  border-color: transparent;
  color: var(--ink-faint);
}

.mini--drop:hover {
  border-color: transparent;
  background: var(--danger-tint);
  color: var(--danger);
}

/* ── Дрібниці ──────────────────────────────────────────────────── */

.meta {
  display: grid;
  gap: 6px;
  align-content: start;
  min-width: 0;
}

.meta__flat {
  padding: 4px 0;
  font-size: 13.5px;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

@container (width < 520px) {
  .dates {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  }

  /* Колонки лишились дві — порожня клітинка під підпис рядка зайва. */
  .dates__gap {
    display: none;
  }

  .dates__row {
    grid-column: 1 / -1;
    font-weight: 600;
    color: var(--ink);
  }
}
</style>
