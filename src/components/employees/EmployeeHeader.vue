<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import PhoneField from '@/components/ui/PhoneField.vue'
import TextField from '@/components/ui/TextField.vue'
import { formatAmount } from '@/lib/amount'
import {
  employeeForm,
  EMPLOYEE_STATUS_LABELS,
  hasEmployeeErrors,
  isActiveEmployee,
  validateEmployeeForm,
  type Employee,
  type EmployeeErrors,
  type EmployeeForm,
} from '@/lib/employees'
import { payrollMonthLabel, type PayrollTotals } from '@/lib/payroll'
import { monogram } from '@/lib/workspaces'
import { formatPhone } from '@/lib/phone'

/**
 * Шапка співробітника — хто це, як його набрати й на яких умовах він у нас
 * рахується. Статус живе тут же, поруч з іменем: людина не зникає зі
 * сховища, коли пішла, — вона просто перестає потрапляти в нові бригади.
 *
 * Під картою — три цифри, по які сюди й заходять: де людина зайнята зараз,
 * скільки їй нараховано за весь час і скільки з того — цього місяця.
 */

const props = defineProps<{ employee: Employee; totals: PayrollTotals; today: string }>()

const emit = defineEmits<{ save: [form: EmployeeForm]; status: [active: boolean] }>()

const editing = ref(false)
const form = reactive<EmployeeForm>(employeeForm(props.employee))
const errors = ref<EmployeeErrors>({})

const active = computed(() => isActiveEmployee(props.employee))

const month = computed(() => payrollMonthLabel(props.today))

/** Спеціальність і бригада — один підпис під іменем, а не два поля. */
const meta = computed(() =>
  [props.employee.role, props.employee.crew].filter((part) => part !== '').join(' · '),
)

function startEdit(): void {
  Object.assign(form, employeeForm(props.employee))
  errors.value = {}
  editing.value = true
}

function save(): void {
  errors.value = validateEmployeeForm(form)

  if (hasEmployeeErrors(errors.value)) {
    return
  }

  emit('save', { ...form })
  editing.value = false
}
</script>

<template>
  <header class="ehead">
    <p class="eyebrow ehead__crumbs">
      <RouterLink class="ehead__crumb" :to="{ name: 'team' }">Команда</RouterLink>
      <span aria-hidden="true">/</span>
      Картка
    </p>

    <section class="hero">
      <div class="hero__top">
        <span class="mono" :class="{ 'mono--off': !active }" aria-hidden="true">
          {{ monogram(employee.name) }}
        </span>

        <div class="hero__intro">
          <h1 class="display hero__title">
            {{ employee.name }}

            <!-- Неактивного видно одразу: його не ставлять на нові роботи. -->
            <span v-if="!active" class="off">{{ EMPLOYEE_STATUS_LABELS.inactive }}</span>
          </h1>

          <p class="hero__meta">
            <AppIcon name="team" />
            {{ meta === '' ? 'спеціальність не вказана' : meta }}
          </p>
        </div>

        <div class="hero__tools">
          <!-- Тумблер, а не видалення: історія робіт і ЗП лишається за людиною. -->
          <button
            type="button"
            class="state"
            :class="{ 'state--off': !active }"
            :aria-pressed="active"
            :title="
              active
                ? 'Працює: потрапляє в список виконавців'
                : 'Не працює: у нові бригади не пропонується'
            "
            @click="emit('status', !active)"
          >
            <span class="state__dot" aria-hidden="true" />
            {{ active ? EMPLOYEE_STATUS_LABELS.active : EMPLOYEE_STATUS_LABELS.inactive }}
          </button>

          <button v-if="!editing" type="button" class="tool" @click="startEdit">
            <AppIcon name="edit" />
            <span>Редагувати</span>
          </button>
        </div>
      </div>

      <!-- Контакти: у спокої це смуга звʼязку, у правці — форма на її місці. -->
      <div v-if="editing" class="edit">
        <div class="edit__grid">
          <TextField v-model="form.name" label="ПІБ" :error="errors.name" />
          <TextField
            v-model="form.role"
            label="Спеціальність"
            optional
            placeholder="Муляр, електрик, бригадир"
            :error="errors.role"
          />
          <TextField
            v-model="form.crew"
            label="Бригада"
            optional
            placeholder="Бригада №1 або підряд"
            :error="errors.crew"
          />
          <PhoneField v-model="form.phone" optional :error="errors.phone" />
          <TextField
            v-model="form.email"
            label="Пошта"
            optional
            type="email"
            inputmode="email"
            placeholder="name@orenza.ua"
            :error="errors.email"
          >
            <template #prefix><AppIcon name="mail" /></template>
          </TextField>
        </div>

        <div class="edit__actions">
          <button type="button" class="btn btn--primary btn--sm" @click="save">Зберегти</button>
          <button type="button" class="btn btn--ghost btn--sm" @click="editing = false">
            Скасувати
          </button>
        </div>
      </div>

      <ul v-else class="strip">
        <li class="col">
          <span class="col__icon" aria-hidden="true"><AppIcon name="phone" /></span>

          <div class="col__body">
            <p class="col__label">Телефон</p>

            <a
              v-if="employee.phone"
              class="col__value col__value--num"
              :href="`tel:${employee.phone}`"
            >
              {{ formatPhone(employee.phone) }}
            </a>
            <button v-else type="button" class="col__add" @click="startEdit">
              Номера ще немає
              <AppIcon name="plus" />
            </button>
          </div>
        </li>

        <li class="col">
          <span class="col__icon" aria-hidden="true"><AppIcon name="mail" /></span>

          <div class="col__body">
            <p class="col__label">Пошта</p>

            <a v-if="employee.email" class="col__value" :href="`mailto:${employee.email}`">
              {{ employee.email }}
            </a>
            <button v-else type="button" class="col__add" @click="startEdit">
              Пошти ще немає
              <AppIcon name="plus" />
            </button>
          </div>
        </li>
      </ul>
    </section>

    <div class="figs">
      <section class="fig">
        <h2 class="fig__label">Зайнятий зараз</h2>
        <p class="fig__value">{{ totals.busy }}</p>

        <p class="fig__foot">
          <template v-if="totals.busy > 0">обʼєктів у роботі просто зараз</template>
          <template v-else-if="totals.objects > 0">
            вільний · {{ totals.objects }} обʼєктів за весь час
          </template>
          <template v-else>на роботи ще не ставили</template>
        </p>
      </section>

      <section class="fig">
        <h2 class="fig__label">Нараховано всього</h2>
        <p class="fig__value">{{ formatAmount(totals.accrued) }} <span class="cur">₴</span></p>

        <p class="fig__foot">за весь час співпраці</p>
      </section>

      <section class="fig">
        <h2 class="fig__label">Нараховано за {{ month }}</h2>
        <p class="fig__value">{{ formatAmount(totals.month) }} <span class="cur">₴</span></p>

        <p class="fig__foot">
          <template v-if="totals.month > 0">поточний місяць</template>
          <template v-else-if="totals.accrued > 0">цього місяця нарахувань не було</template>
          <template v-else>нарахувань ще не було</template>
        </p>
      </section>
    </div>
  </header>
</template>

<style scoped>
.ehead {
  display: grid;
  gap: 12px;
}

.ehead__crumbs {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  margin-bottom: 2px;
}

.ehead__crumb {
  color: inherit;
  text-decoration: none;
  transition: color 0.16s var(--ease);
}

.ehead__crumb:hover {
  color: var(--ink);
}

/* ── Карта співробітника ───────────────────────────────────────── */

.hero {
  display: grid;
  gap: 16px;
  padding: 20px 20px 14px;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

.hero__top {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--line);
}

.mono {
  display: grid;
  place-items: center;
  flex: none;
  width: 56px;
  height: 56px;
  border-radius: var(--r-md);
  background: var(--ink);
  color: #fff;
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

/* Неактивний — тихіший і в монограмі: він уже не в роботі. */
.mono--off {
  background: var(--paper-sunk);
  color: var(--ink-faint);
}

.hero__intro {
  display: grid;
  gap: 7px;
  min-width: 0;
}

.hero__title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: clamp(22px, 2.6vw, 30px);
}

.off {
  padding: 4px 11px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  font-family: var(--font-body);
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.01em;
  white-space: nowrap;
  color: var(--ink-muted);
}

.hero__meta {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13.5px;
  color: var(--ink-muted);
}

.hero__meta :deep(.icon) {
  flex: none;
  width: 15px;
  height: 15px;
  color: var(--ink-faint);
}

.hero__tools {
  display: flex;
  align-items: center;
  flex: none;
  gap: 8px;
  margin-left: auto;
}

.tool {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 15px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: var(--paper-raised);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease);
}

.tool:hover {
  border-color: var(--ink);
  background: var(--paper-sunk);
}

.tool :deep(.icon) {
  width: 15px;
  height: 15px;
  color: var(--ink-faint);
}

/* ── Статус ────────────────────────────────────────────────────── */

.state {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 15px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  background: var(--paper-raised);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease);
}

.state:hover {
  border-color: var(--ink);
  background: var(--paper-sunk);
}

.state__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand);
}

.state--off {
  color: var(--ink-muted);
}

.state--off .state__dot {
  background: var(--ink-faint);
}

/* ── Звʼязок ───────────────────────────────────────────────────── */

.strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(228px, 1fr));
  gap: 4px 0;
  margin: 0 -14px;
  padding: 0;
  list-style: none;
}

.col {
  position: relative;
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;
  padding: 10px 14px;
  border-radius: var(--r-md);
  transition: background-color 0.18s var(--ease);
}

.col:hover {
  background: var(--paper);
}

.col + .col::before {
  content: '';
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 0;
  width: 1px;
  background: var(--line);
}

.col__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--paper-sunk);
  color: var(--ink-muted);
}

.col__icon :deep(.icon) {
  width: 16px;
  height: 16px;
}

.col__body {
  display: grid;
  gap: 1px;
  min-width: 0;
}

.col__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.col__value {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ink);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col__value:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.col__value--num {
  font-variant-numeric: tabular-nums;
}

/* Порожня колонка не мовчить, а пропонує заповнити себе. */
.col__add {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--ink-faint);
  text-align: left;
  transition: color 0.16s var(--ease);
}

.col__add:hover {
  color: var(--ink);
}

.col__add :deep(.icon) {
  width: 13px;
  height: 13px;
}

/* ── Правка ────────────────────────────────────────────────────── */

.edit {
  display: grid;
  gap: 16px;
  padding-bottom: 6px;
}

.edit__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px 20px;
}

.edit__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

/* ── Три цифри ─────────────────────────────────────────────────── */

.figs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--line);
}

.fig {
  display: grid;
  align-content: start;
  gap: 4px;
  min-width: 0;
  padding: 16px 20px 18px;
  background: var(--paper-raised);
}

.fig__label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ink-faint);
}

.fig__value {
  font-family: var(--font-display);
  font-size: clamp(21px, 2vw, 26px);
  font-weight: 600;
  letter-spacing: -0.04em;
  line-height: 1.15;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.cur {
  margin-left: 2px;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-faint);
}

.fig__foot {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

@media (width <= 620px) {
  .hero__top {
    flex-wrap: wrap;
  }

  .hero__tools {
    width: 100%;
    margin-left: 0;
  }

  .tool,
  .state {
    flex: 1;
    justify-content: center;
  }
}
</style>
