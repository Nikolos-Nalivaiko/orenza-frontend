<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { parseAmount } from '@/lib/amount'
import { DISCOUNT_KIND_LABELS, DISCOUNT_PERCENT_MAX, type DiscountKind } from '@/lib/finance'
import {
  daysBetween,
  DESCRIPTION_MAX,
  formatDay,
  formatDiscount,
  FUTURE_FACT,
  isFutureFact,
  OBJECT_DATE_LABELS,
  todayIso,
  type ConstructionObject,
  type ObjectDateField,
} from '@/lib/objects'
import { dateDeviation, objectTimeline } from '@/lib/timeline'

/**
 * Основне про обʼєкт — читабельний блок, а не форма: поля стоять як текст,
 * а редактор відкривається по кліку рівно там, куди натиснули.
 *
 * Статус, етап і замовник сюди не потрапляють навмисно — вони вже в шапці
 * картки, і другий їхній примірник лише розтягував би екран.
 */

type FieldKey = ObjectDateField | 'description' | 'discount'

interface Milestone {
  key: 'start' | 'finish'
  title: string
  plan: ObjectDateField
  fact: ObjectDateField
}

const props = defineProps<{ object: ConstructionObject }>()

const emit = defineEmits<{
  description: [value: string]
  date: [field: ObjectDateField, value: string]
  discount: [percent: number | null, amount: number | null]
}>()

const MILESTONES: readonly Milestone[] = [
  { key: 'start', title: 'Початок', plan: 'started_at', fact: 'actual_started_at' },
  { key: 'finish', title: 'Завершення', plan: 'finished_at', fact: 'actual_finished_at' },
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

const timeline = computed(() => objectTimeline(props.object, today))

function dateValue(field: ObjectDateField): string {
  return props.object[field] ?? ''
}

function canMarkToday(milestone: Milestone): boolean {
  if (dateValue(milestone.fact) !== '') {
    return false
  }

  return milestone.key === 'start' || props.object.actual_started_at !== null
}

function deviation(milestone: Milestone) {
  return dateDeviation(props.object[milestone.plan], props.object[milestone.fact], milestone.key)
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

  if (!plan && isFutureFact(value, today)) {
    return FUTURE_FACT
  }

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

    <div class="block">
      <p class="block__label">Строки</p>

      <dl v-if="timeline.figures.length > 0" class="figs">
        <div
          v-for="figure in timeline.figures"
          :key="figure.label"
          class="fig"
          :class="`fig--${figure.tone}`"
        >
          <dt class="fig__label">{{ figure.label }}</dt>
          <dd class="fig__value">
            <span class="display fig__num">{{ figure.value }}</span>
            <span v-if="figure.unit" class="fig__unit">{{ figure.unit }}</span>
          </dd>
          <dd v-if="figure.hint" class="fig__hint">{{ figure.hint }}</dd>
        </div>
      </dl>

      <p v-if="timeline.note" class="figs__note">{{ timeline.note }}</p>

      <div class="stages">
        <section v-for="milestone in MILESTONES" :key="milestone.key" class="stage">
          <h3 class="stage__title">{{ milestone.title }}</h3>

          <div
            v-for="line in [
              { kind: 'План', field: milestone.plan },
              { kind: 'Факт', field: milestone.fact },
            ]"
            :key="line.field"
            class="stage__row"
            :class="{ 'stage__row--edit': editing === line.field }"
          >
            <span class="stage__kind">{{ line.kind }}</span>

            <div v-if="editing === line.field" class="edit">
              <input
                v-model="draft"
                class="ctl"
                type="date"
                :aria-label="OBJECT_DATE_LABELS[line.field]"
                @keydown.esc="close"
                @keydown.enter="save"
              />

              <div class="edit__foot">
                <button type="button" class="mini mini--go" @click="save">Зберегти</button>
                <button type="button" class="mini" @click="close">Скасувати</button>
                <button
                  v-if="dateValue(line.field)"
                  type="button"
                  class="mini mini--drop"
                  @click="clearDate(line.field)"
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
                :aria-label="OBJECT_DATE_LABELS[line.field]"
                @click="open(line.field)"
              >
                <span v-if="dateValue(line.field)" class="pick__strong">
                  {{ formatDay(dateValue(line.field)) }}
                </span>
                <span v-else class="pick__none">не вказано</span>
                <span class="pick__pen" aria-hidden="true"><AppIcon name="document" /></span>
              </button>

              <template v-if="line.field === milestone.fact">
                <span
                  v-if="deviation(milestone)"
                  class="chip"
                  :class="`chip--${deviation(milestone)?.tone}`"
                  :title="
                    milestone.key === 'start' ? 'Зсув старту від плану' : 'Зсув здачі від плану'
                  "
                >
                  {{ deviation(milestone)?.label }}
                </span>

                <button
                  v-else-if="canMarkToday(milestone)"
                  type="button"
                  class="quick"
                  @click="setToday(line.field)"
                >
                  <AppIcon name="check" />
                  сьогодні
                </button>
              </template>
            </template>
          </div>
        </section>
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

.figs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px 0;
  margin: 4px 0 8px;
}

.fig {
  display: grid;
  grid-template-rows: auto auto auto;
  align-content: start;
  gap: 3px;
  min-width: 0;
  margin: 0;
  padding: 0 18px;
  border-left: 1px solid var(--line);
}

.fig:first-child {
  padding-left: 0;
  border-left: 0;
}

.fig__label {
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink-muted);
}

.fig__value {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0 5px;
  margin: 0;
  color: var(--ink);
}

.fig__num {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.15;
  font-variant-numeric: tabular-nums;
}

.fig__unit {
  font-size: 13px;
  font-weight: 500;
  color: var(--ink-muted);
}

.fig__hint {
  margin: 0;
  font-size: 11.5px;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.fig--muted .fig__num {
  color: var(--ink-soft);
}

.fig--good .fig__num,
.fig--good .fig__unit {
  color: var(--brand-strong);
}

.fig--warn .fig__num,
.fig--warn .fig__unit {
  color: var(--amber);
}

.fig--late .fig__num,
.fig--late .fig__unit {
  color: var(--danger);
}

.figs__note {
  margin-bottom: 4px;
  font-size: 13px;
  color: var(--ink-muted);
}

.stages {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.stage {
  display: grid;
  align-content: start;
  gap: 2px;
  padding: 10px 12px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
}

.stage__title {
  margin-bottom: 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.stage__row {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 34px;
}

.stage__row--edit {
  grid-template-columns: 38px minmax(0, 1fr);
  align-items: start;
  padding: 4px 0;
}

.stage__row--edit .stage__kind {
  padding-top: 9px;
}

.stage__kind {
  font-size: 12px;
  color: var(--ink-faint);
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
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 4px;
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

.quick :deep(.icon) {
  width: 12px;
  height: 12px;
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

.chip--good {
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.chip--neutral {
  background: var(--paper-sunk);
  color: var(--ink-muted);
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
  .stages {
    grid-template-columns: minmax(0, 1fr);
  }

  .figs {
    grid-template-columns: minmax(0, 1fr);
    gap: 0;
  }

  .fig {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-rows: auto auto;
    align-items: center;
    column-gap: 12px;
    padding: 9px 0;
    border-top: 1px solid var(--line);
    border-left: 0;
  }

  .fig:first-child {
    padding-top: 0;
    border-top: 0;
  }

  .fig__label {
    grid-column: 1;
    grid-row: 1;
    font-size: 13px;
    color: var(--ink);
  }

  .fig__hint {
    grid-column: 1;
    grid-row: 2;
  }

  .fig__value {
    grid-column: 2;
    grid-row: 1 / span 2;
    justify-content: flex-end;
  }

  .fig__num {
    font-size: 22px;
  }
}
</style>
