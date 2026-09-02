<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import StepRail from '@/components/auth/StepRail.vue'
import CheckBox from '@/components/ui/CheckBox.vue'
import PasswordField from '@/components/ui/PasswordField.vue'
import PasswordMeter from '@/components/ui/PasswordMeter.vue'
import TextField from '@/components/ui/TextField.vue'
import { useAuthStore } from '@/stores/auth'
import { hasErrors, validateRegisterStep, type Errors, type RegisterForm } from '@/lib/validation'

const auth = useAuthStore()
const router = useRouter()

const STEPS = ['Профіль', 'Контакти', 'Безпека']

const step = ref(0)
const direction = ref<'fwd' | 'back'>('fwd')
const errors = ref<Errors<RegisterForm>>({})

const form = reactive<RegisterForm>({
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  passwordConfirmation: '',
  agreed: false,
})

watch(form, () => {
  errors.value = {}
  auth.reset()
})

const isLast = computed(() => step.value === STEPS.length - 1)

const headline = computed(() => {
  if (step.value === 0) {
    return 'Створимо ваш акаунт'
  }

  return step.value === 1 ? 'Як з вами звʼязатись' : 'Захистіть акаунт'
})

const subline = computed(() => {
  if (step.value === 0) {
    return 'Так вас бачитимуть колеги в задачах, актах і кошторисах.'
  }

  return step.value === 1
    ? 'Пошта стане логіном. Телефон — щоб бригада бачила, кому дзвонити.'
    : 'Пароль від 8 символів. Далі оберете робочий простір і запросите команду.'
})

function jump(index: number): void {
  if (index < step.value) {
    direction.value = 'back'
    step.value = index
  }
}

function back(): void {
  direction.value = 'back'
  step.value = Math.max(0, step.value - 1)
}

async function next(): Promise<void> {
  errors.value = validateRegisterStep(step.value, form)

  if (hasErrors(errors.value)) {
    return
  }

  if (!isLast.value) {
    direction.value = 'fwd'
    step.value += 1

    return
  }

  if (await auth.register(form)) {
    await router.push({ name: 'workspaces' })
  }
}
</script>

<template>
  <AuthLayout>
    <template #switch>
      Вже маєте акаунт?
      <RouterLink class="switch-link" :to="{ name: 'login' }">Увійти</RouterLink>
    </template>

    <section class="reg">
      <StepRail :steps="STEPS" :current="step" @jump="jump" />

      <header class="reg__head">
        <h1 class="display reg__title">{{ headline }}</h1>
        <p class="muted reg__sub">{{ subline }}</p>
      </header>

      <Transition name="alert">
        <p v-if="auth.error" class="alert" role="alert">{{ auth.error }}</p>
      </Transition>

      <form class="reg__form" novalidate @submit.prevent="next">
        <Transition :name="direction === 'fwd' ? 'slide-fwd' : 'slide-back'" mode="out-in">
          <div :key="step" class="reg__step">
            <template v-if="step === 0">
              <div class="reg__pair">
                <TextField
                  v-model="form.firstName"
                  label="Імʼя"
                  autocomplete="given-name"
                  placeholder="Іван"
                  :error="errors.firstName"
                  autofocus
                />
                <TextField
                  v-model="form.lastName"
                  label="Прізвище"
                  autocomplete="family-name"
                  placeholder="Ковальчук"
                  :error="errors.lastName"
                />
              </div>

              <ul class="reg__perks">
                <li
                  v-for="perk in [
                    'Обʼєкти й етапи робіт',
                    'Кошториси та акти',
                    'Заявки на матеріали',
                  ]"
                  :key="perk"
                >
                  <svg viewBox="0 0 14 14" aria-hidden="true">
                    <path
                      d="M3 7.3l2.6 2.6L11 4.4"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                  {{ perk }}
                </li>
              </ul>
            </template>

            <template v-else-if="step === 1">
              <TextField
                v-model="form.email"
                label="Робоча пошта"
                type="email"
                inputmode="email"
                autocomplete="email"
                placeholder="ivan@budcompany.ua"
                hint="На неї надішлемо підтвердження та доступи для команди."
                :error="errors.email"
              />

              <TextField
                v-model="form.phone"
                label="Телефон"
                type="tel"
                inputmode="tel"
                autocomplete="tel"
                placeholder="067 123 45 67"
                optional
                :error="errors.phone"
              >
                <template #prefix>+380</template>
              </TextField>
            </template>

            <template v-else>
              <PasswordField
                v-model="form.password"
                label="Пароль"
                autocomplete="new-password"
                :error="errors.password"
              />

              <PasswordMeter :password="form.password" />

              <PasswordField
                v-model="form.passwordConfirmation"
                label="Підтвердіть пароль"
                autocomplete="new-password"
                :error="errors.passwordConfirmation"
              />

              <CheckBox v-model="form.agreed" :error="errors.agreed">
                Погоджуюсь з
                <a href="#" @click.prevent.stop>умовами користування</a>
                та
                <a href="#" @click.prevent.stop>політикою конфіденційності</a>.
              </CheckBox>
            </template>
          </div>
        </Transition>

        <div class="reg__actions">
          <button v-if="step > 0" type="button" class="btn btn--ghost" @click="back">
            <svg class="btn__arrow btn__arrow--back" viewBox="0 0 18 18" aria-hidden="true">
              <path
                d="M14.5 9h-11M8 4.5 3.5 9 8 13.5"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            Назад
          </button>

          <button type="submit" class="btn btn--primary reg__submit" :disabled="auth.isPending">
            <span v-if="auth.isPending" class="spinner" aria-hidden="true" />
            <span>{{ isLast ? (auth.isPending ? 'Створюємо…' : 'Створити акаунт') : 'Далі' }}</span>
            <svg v-if="!auth.isPending" class="btn__arrow" viewBox="0 0 18 18" aria-hidden="true">
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
      </form>

      <p class="reg__foot">Крок {{ step + 1 }} з {{ STEPS.length }}</p>
    </section>
  </AuthLayout>
</template>

<style scoped>
.reg {
  display: grid;
  gap: 22px;
}

.reg__head {
  display: grid;
  gap: 8px;
}

.reg__title {
  font-size: clamp(28px, 3.6vw, 38px);
}

.reg__sub {
  max-width: 40ch;
  font-size: 14px;
}

.reg__form {
  display: grid;
  gap: 22px;
}

.reg__step {
  display: grid;
  gap: 18px;
}

.reg__pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.reg__perks {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin: 0;
  padding: 14px 0 0;
  border-top: 1px solid var(--line);
  list-style: none;
  font-size: 12.5px;
  color: var(--ink-muted);
}

.reg__perks li {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.reg__perks svg {
  width: 12px;
  height: 12px;
  color: var(--brand);
}

.reg__actions {
  display: flex;
  gap: 10px;
}

.reg__submit {
  flex: 1;
}

.btn__arrow--back {
  transition: transform 0.25s var(--ease);
}

.btn:hover:not(:disabled) .btn__arrow--back {
  transform: translateX(-4px);
}

.reg__foot {
  font-size: 12px;
  color: var(--ink-faint);
}

.reg :deep(.check__text a) {
  color: var(--ink);
  text-decoration: none;
  border-bottom: 1px solid var(--line-strong);
}

.reg :deep(.check__text a:hover) {
  color: var(--brand-strong);
  border-color: var(--brand);
}

.alert {
  padding: 13px 15px;
  border: 1px solid rgb(200 52 31 / 30%);
  border-radius: var(--r-md);
  background: var(--danger-tint);
  color: var(--danger);
  font-size: 13.5px;
}

.alert-enter-active,
.alert-leave-active {
  transition:
    opacity 0.25s var(--ease),
    transform 0.25s var(--ease);
}

.alert-enter-from,
.alert-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.slide-fwd-enter-active,
.slide-fwd-leave-active,
.slide-back-enter-active,
.slide-back-leave-active {
  transition:
    opacity 0.26s var(--ease),
    transform 0.26s var(--ease);
}

.slide-fwd-enter-from {
  opacity: 0;
  transform: translateX(26px);
}

.slide-fwd-leave-to {
  opacity: 0;
  transform: translateX(-22px);
}

.slide-back-enter-from {
  opacity: 0;
  transform: translateX(-26px);
}

.slide-back-leave-to {
  opacity: 0;
  transform: translateX(22px);
}

.switch-link {
  margin-left: 4px;
  font-weight: 600;
  color: var(--ink);
  text-decoration: none;
  border-bottom: 1.5px solid var(--brand);
  transition: color 0.2s var(--ease);
}

.switch-link:hover {
  color: var(--brand-strong);
}

@media (width <= 520px) {
  .reg__pair {
    grid-template-columns: 1fr;
  }
}
</style>
