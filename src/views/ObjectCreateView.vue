<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, useTemplateRef, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import ClientPicker from '@/components/objects/ClientPicker.vue'
import CoverPicker from '@/components/objects/CoverPicker.vue'
import MaterialsPanel from '@/components/objects/MaterialsPanel.vue'
import ServicesPanel from '@/components/objects/ServicesPanel.vue'
import StatusPicker from '@/components/objects/StatusPicker.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import DateField from '@/components/ui/DateField.vue'
import TextArea from '@/components/ui/TextArea.vue'
import TextField from '@/components/ui/TextField.vue'
import {
  DESCRIPTION_MAX,
  emptyObjectForm,
  formatDrift,
  formatSpan,
  hasObjectErrors,
  validateObjectForm,
  type ConstructionObject,
  type ObjectErrors,
  type ObjectForm,
} from '@/lib/objects'
import { formatAmount } from '@/lib/amount'
import { validateMaterials, type MaterialErrors } from '@/lib/materials'
import { servicesTotals, validateServices, type ServiceErrors } from '@/lib/services'
import { useObjectsStore } from '@/stores/objects'
import { useWorkspacesStore } from '@/stores/workspaces'

type TabKey = 'general' | 'materials' | 'services'

/**
 * Кнопки форми живуть у шапці екрана, поза самим <form>, тож звʼязок між ними
 * тримає атрибут form — «Створити» лишається звичайним submit.
 */
const FORM_ID = 'object-form'

/** Блоки картки. Кожен наступний додається сюди — і зʼявляється вкладкою. */
const TABS: readonly { key: TabKey; label: string }[] = [
  { key: 'general', label: 'Загальна інформація' },
  { key: 'materials', label: 'Матеріали' },
  { key: 'services', label: 'Послуги' },
]

const router = useRouter()
const objects = useObjectsStore()
const workspaces = useWorkspacesStore()

const formEl = useTemplateRef<HTMLFormElement>('formEl')

const form = reactive<ObjectForm>(emptyObjectForm())
const errors = ref<ObjectErrors>({})
const materialErrors = ref<Record<string, MaterialErrors>>({})
const serviceErrors = ref<Record<string, ServiceErrors>>({})

const tab = ref<TabKey>('general')

/** До першої спроби зберегти форма мовчить — інакше вона свариться наперед. */
const submitted = ref(false)
const draftRestored = ref(false)
const created = ref<ConstructionObject | null>(null)

/** Помилки живуть у вкладках, тож вкладка має вміти про них сказати. */
function tabHasErrors(key: TabKey): boolean {
  if (key === 'general') {
    return hasObjectErrors(errors.value)
  }

  const map = key === 'materials' ? materialErrors.value : serviceErrors.value

  return Object.keys(map).length > 0
}

/** У приватному просторі виконавців немає — послуга йде як чистий дохід. */
const solo = computed(() => workspaces.current?.type.value === 'personal')

const servicesSummary = computed(() => servicesTotals(form.services))

function tabCount(key: TabKey): number {
  if (key === 'materials') {
    return form.materials.length
  }

  return key === 'services' ? form.services.length : 0
}

const createdProfit = computed(() =>
  (created.value?.materials ?? []).reduce(
    (sum, item) => sum + ((item.client_price ?? 0) - (item.cost_price ?? 0)) * item.quantity,
    0,
  ),
)

const planSpan = computed(() => formatSpan(form.startDate, form.endDate))
const factSpan = computed(() => formatSpan(form.factStartDate, form.factEndDate))
const drift = computed(() => formatDrift(form))

onMounted(() => {
  objects.reset()

  if (objects.clients.length === 0) {
    void objects.fetchClients()
  }

  const draft = objects.readDraft()

  if (draft !== null) {
    Object.assign(form, draft)
    draftRestored.value = true
  }
})

// Чернетка пише себе сама: форма довга, і втратити її через випадковий
// перехід у меню було б найприкрішим сценарієм екрана.
watch(form, () => {
  objects.saveDraft(form)

  if (submitted.value) {
    errors.value = validateObjectForm(form)
    materialErrors.value = validateMaterials(form.materials)
    serviceErrors.value = validateServices(form.services)
  }
})

function resetForm(): void {
  Object.assign(form, emptyObjectForm())
  errors.value = {}
  materialErrors.value = {}
  serviceErrors.value = {}
  tab.value = 'general'
  submitted.value = false
  draftRestored.value = false
  objects.clearDraft()
}

function addClient(name: string): void {
  form.clientId = objects.addClient(name).id
}

async function submit(): Promise<void> {
  submitted.value = true
  errors.value = validateObjectForm(form)
  materialErrors.value = validateMaterials(form.materials)
  serviceErrors.value = validateServices(form.services)

  const broken = TABS.find((item) => tabHasErrors(item.key))

  if (broken !== undefined) {
    // Помилка може бути в іншій вкладці — самі туди й переходимо, інакше
    // натискання «Створити» виглядало б як тиша у відповідь.
    tab.value = broken.key

    await nextTick()
    formEl.value?.querySelector<HTMLElement>('[aria-invalid="true"], .ctl--bad')?.focus()

    return
  }

  const object = await objects.create(form)

  if (object === null) {
    return
  }

  created.value = object
  draftRestored.value = false
}

function again(): void {
  created.value = null
  resetForm()
}

async function toObjects(): Promise<void> {
  await router.push({ name: 'objects' })
}
</script>

<template>
  <div class="new">
    <header class="new__head">
      <div class="new__intro">
        <p class="eyebrow">
          <RouterLink class="new__crumb" :to="{ name: 'objects' }">Обʼєкти</RouterLink>
          <span aria-hidden="true">/</span>
          Новий
        </p>
        <h1 class="display new__title">Створення обʼєкта</h1>
      </div>

      <!-- Дії стоять біля заголовка: одне місце на екрані, без панелі, що
           їде за скролом і накриває нижні поля. -->
      <div v-if="!created" class="new__actions">
        <RouterLink class="btn btn--ghost" :to="{ name: 'objects' }">Скасувати</RouterLink>

        <button type="submit" class="btn btn--primary" :form="FORM_ID" :disabled="objects.isSaving">
          <span v-if="objects.isSaving" class="spinner" aria-hidden="true" />
          <span>{{ objects.isSaving ? 'Створюємо…' : 'Створити обʼєкт' }}</span>
          <svg v-if="!objects.isSaving" class="btn__arrow" viewBox="0 0 18 18" aria-hidden="true">
            <path
              d="M3.5 9h11M10 4.5 14.5 9 10 13.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </div>
    </header>

    <Transition name="swap" mode="out-in">
      <!-- ── Успіх ──────────────────────────────────────────────── -->
      <section v-if="created" key="done" class="done">
        <span class="done__icon" aria-hidden="true"><AppIcon name="check" /></span>

        <h2 class="display done__title">Обʼєкт «{{ created.name }}» створено</h2>
        <p class="done__text">
          Картка живе в просторі «{{ workspaces.current?.name }}». Далі до неї приєднаються етапи
          робіт, кошторис і фото з майданчика.
        </p>

        <dl class="done__facts">
          <div>
            <dt>Адреса</dt>
            <dd>{{ created.address }}</dd>
          </div>
          <div>
            <dt>Статус</dt>
            <dd>{{ created.status.label }}</dd>
          </div>
          <div>
            <dt>Замовник</dt>
            <dd>{{ created.client?.name ?? 'не привʼязано' }}</dd>
          </div>
          <div v-if="created.materials.length > 0">
            <dt>Матеріали</dt>
            <dd>
              {{ created.materials.length }} поз. · профіт {{ formatAmount(createdProfit) }} ₴
            </dd>
          </div>
          <div v-if="created.services.length > 0">
            <dt>Послуги</dt>
            <dd>
              {{ created.services.length }} поз. ·
              <template v-if="solo">дохід {{ formatAmount(servicesSummary.revenue) }} ₴</template>
              <template v-else>профіт {{ formatAmount(servicesSummary.profit) }} ₴</template>
            </dd>
          </div>
        </dl>

        <div class="done__actions">
          <button type="button" class="btn btn--primary" @click="again">
            <span>Створити ще один</span>
            <svg class="btn__arrow" viewBox="0 0 18 18" aria-hidden="true">
              <path
                d="M3.5 9h11M10 4.5 14.5 9 10 13.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>

          <button type="button" class="btn btn--ghost" @click="toObjects">
            До списку обʼєктів
          </button>
        </div>
      </section>

      <!-- ── Форма ──────────────────────────────────────────────── -->
      <form
        v-else
        :id="FORM_ID"
        key="form"
        ref="formEl"
        class="form"
        novalidate
        @submit.prevent="submit"
      >
        <Transition name="note">
          <p v-if="draftRestored" class="draft">
            <AppIcon name="clock" />
            Відновили незбережену чернетку.
            <button type="button" class="draft__clear" @click="resetForm">Почати з чистого</button>
          </p>
        </Transition>

        <!-- Помилка збереження — поруч із кнопкою, тобто вгорі. -->
        <Transition name="note">
          <p v-if="objects.error" class="form__error" role="alert">{{ objects.error }}</p>
        </Transition>

        <nav class="tabs" aria-label="Блоки картки обʼєкта">
          <button
            v-for="item in TABS"
            :key="item.key"
            type="button"
            class="tab"
            :class="{ 'tab--on': tab === item.key }"
            :aria-current="tab === item.key ? 'true' : undefined"
            @click="tab = item.key"
          >
            {{ item.label }}
            <span v-if="tabCount(item.key) > 0" class="tab__count">{{ tabCount(item.key) }}</span>
            <span v-if="tabHasErrors(item.key)" class="tab__dot" title="Є незаповнені поля" />
          </button>
        </nav>

        <section v-show="tab === 'general'" class="block">
          <!-- Секції з короткими заголовками: форма читається згори вниз. -->
          <div class="part">
            <h3 class="part__title">Обʼєкт</h3>

            <div class="part__fields">
              <div class="pair">
                <TextField
                  v-model="form.name"
                  label="Назва"
                  placeholder="ЖК «Пасаж», 3 черга"
                  :error="errors.name"
                  autofocus
                />

                <TextField
                  v-model="form.address"
                  label="Адреса"
                  placeholder="вул. Стеценка, 12 · Київ"
                  :error="errors.address"
                >
                  <template #prefix><AppIcon name="pin" /></template>
                </TextField>
              </div>

              <TextArea
                v-model="form.description"
                label="Опис"
                optional
                :rows="3"
                :max="DESCRIPTION_MAX"
                placeholder="Що саме робимо: обсяг, поверховість, особливості майданчика"
                :error="errors.description"
              />
            </div>
          </div>

          <div class="part">
            <h3 class="part__title">Замовник</h3>

            <div class="part__fields part__fields--narrow">
              <ClientPicker
                v-model="form.clientId"
                :clients="objects.clients"
                :loading="objects.isLoadingClients"
                @create="addClient"
              />
            </div>
          </div>

          <div class="part">
            <h3 class="part__title">Строки</h3>

            <div class="part__fields">
              <div class="pair pair--dates">
                <div class="dates">
                  <div class="dates__head">
                    <p class="dates__title">План</p>
                    <p v-if="planSpan" class="dates__span">{{ planSpan }}</p>
                  </div>

                  <div class="dates__pair">
                    <DateField
                      v-model="form.startDate"
                      label="Початок"
                      :max="form.endDate || undefined"
                      :error="errors.startDate"
                    />
                    <DateField
                      v-model="form.endDate"
                      label="Завершення"
                      :min="form.startDate || undefined"
                      :error="errors.endDate"
                    />
                  </div>
                </div>

                <div class="dates">
                  <div class="dates__head">
                    <p class="dates__title">Факт</p>
                    <p v-if="factSpan || drift" class="dates__span">
                      {{ [factSpan, drift].filter(Boolean).join(' · ') }}
                    </p>
                  </div>

                  <div class="dates__pair">
                    <DateField
                      v-model="form.factStartDate"
                      label="Початок"
                      :max="form.factEndDate || undefined"
                      :error="errors.factStartDate"
                    />
                    <DateField
                      v-model="form.factEndDate"
                      label="Завершення"
                      :min="form.factStartDate || undefined"
                      :error="errors.factEndDate"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="part">
            <h3 class="part__title">Статус</h3>

            <div class="part__fields">
              <StatusPicker v-model="form.status" />
            </div>
          </div>

          <div class="part">
            <h3 class="part__title">Обкладинка</h3>

            <div class="part__fields part__fields--narrow">
              <CoverPicker v-model="form.cover" />
            </div>
          </div>
        </section>

        <section v-show="tab === 'materials'" class="block block--plain">
          <MaterialsPanel v-model="form.materials" :errors="materialErrors" />
        </section>

        <section v-show="tab === 'services'" class="block block--plain">
          <ServicesPanel v-model="form.services" :errors="serviceErrors" :solo="solo" />
        </section>

        <p class="form__note">Далі: етапи робіт і кошторис — вони зʼявляться всередині картки.</p>
      </form>
    </Transition>
  </div>
</template>

<style scoped>
/* Форма займає всю ширину простору — поля розкладаються в рядки, а не
   тягнуться одне під одним на пів екрана. */
.new {
  display: grid;
  gap: 24px;
  width: 100%;
}

/* Заголовок і дії — один рядок: кнопки не залежать від позиції скролу. */
.new__head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px 20px;
}

.new__intro {
  display: grid;
  gap: 8px;
  min-width: 0;
}

.new__actions {
  display: flex;
  gap: 10px;
  margin-left: auto;
}

.new__actions .btn {
  text-decoration: none;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.new__crumb {
  color: inherit;
  text-decoration: none;
  transition: color 0.16s var(--ease);
}

.new__crumb:hover {
  color: var(--ink);
}

.new__title {
  font-size: clamp(24px, 2.8vw, 34px);
}

.form {
  display: grid;
  gap: 16px;
  min-width: 0;
}

.draft {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-raised);
  font-size: 13px;
  color: var(--ink-muted);
}

.draft :deep(.icon) {
  width: 16px;
  height: 16px;
  color: var(--ink-faint);
}

.draft__clear {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ink);
  font-size: 13px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* ── Вкладки блоків ────────────────────────────────────────────── */

.tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--paper-sunk);
  justify-self: start;
}

.tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 18px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--ink-muted);
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  transition:
    background-color 0.2s var(--ease),
    color 0.2s var(--ease),
    box-shadow 0.2s var(--ease);
}

.tab:hover {
  color: var(--ink);
}

.tab--on {
  background: var(--paper-raised);
  color: var(--ink);
  box-shadow: var(--shadow-sm);
}

.tab__count {
  padding: 1px 7px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
}

.tab--on .tab__count {
  background: var(--brand-tint);
  color: var(--brand-strong);
}

/* Крапка каже, що незаповнене поле — саме в цій вкладці. */
.tab__dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--danger);
}

.block {
  display: grid;
  padding: 6px 30px 14px;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

/* Блок без внутрішніх секцій — відступи задає сама картка. */
.block--plain {
  padding: 24px 26px;
}

/* Секція форми: заголовок зверху, поля під ним, тонка лінія між секціями. */
.part {
  display: grid;
  gap: 14px;
  padding: 22px 0;
  border-top: 1px solid var(--line);
}

.part:first-child {
  border-top: 0;
}

.part__title {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--ink-muted);
}

.part__fields {
  display: grid;
  align-content: start;
  gap: 20px;
  min-width: 0;
}

/* Одиночний контрол не має розтягуватись на всю ширину простору. */
.part__fields--narrow {
  max-width: 540px;
}

.pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  align-items: start;
  gap: 20px 24px;
}

/* Дві групи дат тримають однакову висоту — інакше картки «сходинкою». */
.pair--dates {
  align-items: stretch;
  gap: 16px;
}

/* План і факт — дві окремі групи: інакше чотири дати читаються як одна каша. */
.dates {
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper);
}

.dates__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 6px 12px;
  min-height: 22px;
}

.dates__title {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.dates__pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

/* Тривалість зʼявляється сама, щойно обидві дати на місці. */
.dates__span {
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--paper-sunk);
  color: var(--ink-muted);
  font-size: 12px;
  font-weight: 600;
  animation: rise 0.28s var(--ease);
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(4px);
  }
}

.form__error {
  padding: 12px 14px;
  border: 1px solid rgb(200 52 31 / 30%);
  border-radius: var(--r-md);
  background: var(--danger-tint);
  color: var(--danger);
  font-size: 13px;
}

.form__note {
  padding-inline: 2px;
  font-size: 12.5px;
  color: var(--ink-faint);
}

/* ── Успіх ─────────────────────────────────────────────────────── */

.done {
  display: grid;
  justify-items: start;
  gap: 12px;
  width: 100%;
  max-width: 620px;
  padding: 32px;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
  box-shadow: var(--shadow-md);
}

.done__icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 15px;
  background: var(--brand);
  color: #08210a;
}

.done__icon :deep(.icon) {
  width: 24px;
  height: 24px;
}

.done__title {
  font-size: clamp(21px, 2.4vw, 27px);
}

.done__text {
  max-width: 52ch;
  font-size: 14px;
  line-height: 1.55;
  color: var(--ink-muted);
}

.done__facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  width: 100%;
  margin: 6px 0;
  padding: 14px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
}

.done__facts dt {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.done__facts dd {
  margin: 3px 0 0;
  font-size: 13.5px;
  font-weight: 600;
}

.done__actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

/* ── Переходи ──────────────────────────────────────────────────── */

.swap-enter-active,
.swap-leave-active {
  transition:
    opacity 0.24s var(--ease),
    transform 0.24s var(--ease);
}

.swap-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.swap-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.note-enter-active,
.note-leave-active {
  transition:
    opacity 0.2s var(--ease),
    transform 0.2s var(--ease);
}

.note-enter-from,
.note-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* Чотири поля дат в один ряд тримаються, поки кожне лишається клікабельним. */
@media (width <= 1240px) {
  .pair--dates {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (width <= 700px) {
  .pair {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (width <= 560px) {
  .block {
    padding: 6px 18px 10px;
  }

  .block--plain {
    padding: 18px;
  }

  .dates__pair {
    grid-template-columns: 1fr;
  }

  .new__actions {
    width: 100%;
  }

  .new__actions .btn {
    flex: 1;
  }
}
</style>
