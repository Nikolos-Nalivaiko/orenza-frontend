<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import AuthLayout from '@/layouts/AuthLayout.vue'
import CheckBox from '@/components/ui/CheckBox.vue'
import PasswordField from '@/components/ui/PasswordField.vue'
import TextField from '@/components/ui/TextField.vue'
import { useAuthStore } from '@/stores/auth'
import { hasErrors, validateLogin, type Errors, type LoginForm } from '@/lib/validation'

const auth = useAuthStore()
const router = useRouter()

const form = reactive<LoginForm>({ email: '', password: '' })
const remember = ref(true)
const errors = ref<Errors<LoginForm>>({})

watch(form, () => {
  errors.value = {}
  auth.reset()
})

async function submit(): Promise<void> {
  errors.value = validateLogin(form)

  if (hasErrors(errors.value)) {
    return
  }

  if (await auth.login(form)) {
    await router.push({ name: 'workspaces' })
  }
}
</script>

<template>
  <AuthLayout>
    <template #switch>
      Ще не з нами?
      <RouterLink class="switch-link" :to="{ name: 'register' }">Створити акаунт</RouterLink>
    </template>

    <section class="login">
      <header class="login__head">
        <p class="eyebrow">Вхід до системи</p>
        <h1 class="display login__title">З поверненням<span class="dot">.</span></h1>
        <p class="muted login__sub">Обʼєкти, кошториси та бригади там, де ви їх залишили.</p>
      </header>

      <Transition name="alert">
        <p v-if="auth.error" class="alert" role="alert">
          <svg viewBox="0 0 16 16" aria-hidden="true">
            <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.6" />
            <path
              d="M8 4.6v4.2M8 11.2h.01"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
            />
          </svg>
          {{ auth.error }}
        </p>
      </Transition>

      <form class="login__form" novalidate @submit.prevent="submit">
        <TextField
          v-model="form.email"
          label="Робоча пошта"
          type="email"
          inputmode="email"
          autocomplete="email"
          placeholder="ivan@budcompany.ua"
          :error="errors.email"
          autofocus
        />

        <div class="login__password">
          <PasswordField
            v-model="form.password"
            label="Пароль"
            autocomplete="current-password"
            :error="errors.password"
          />
          <a class="login__forgot" href="#" @click.prevent>Забули пароль?</a>
        </div>

        <div class="login__row">
          <CheckBox v-model="remember">Не виходити на цьому пристрої</CheckBox>
        </div>

        <button type="submit" class="btn btn--primary btn--block" :disabled="auth.isPending">
          <span v-if="auth.isPending" class="spinner" aria-hidden="true" />
          <span>{{ auth.isPending ? 'Перевіряємо…' : 'Увійти' }}</span>
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
      </form>

      <p class="login__help">
        Не маєте доступу? Попросіть адміністратора компанії надіслати запрошення.
      </p>
    </section>
  </AuthLayout>
</template>

<style scoped>
.login {
  display: grid;
  gap: 26px;
}

.login__head {
  display: grid;
  gap: 10px;
}

.login__title {
  font-size: clamp(34px, 4.4vw, 46px);
}

.dot {
  color: var(--brand);
}

.login__sub {
  max-width: 34ch;
  font-size: 14.5px;
}

.login__form {
  display: grid;
  gap: 18px;
}

.login__password {
  display: grid;
  gap: 8px;
  justify-items: end;
}

.login__password > :first-child {
  width: 100%;
}

.login__forgot {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-muted);
  text-decoration: none;
  border-bottom: 1px solid var(--line-strong);
  transition:
    color 0.2s var(--ease),
    border-color 0.2s var(--ease);
}

.login__forgot:hover {
  color: var(--brand-strong);
  border-color: var(--brand);
}

.login__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 4px 0;
  border-top: 1px solid var(--line);
  border-bottom: 1px solid var(--line);
  padding-block: 14px;
}

.login__help {
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--ink-faint);
}

.alert {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 13px 15px;
  border: 1px solid rgb(200 52 31 / 30%);
  border-radius: var(--r-md);
  background: var(--danger-tint);
  color: var(--danger);
  font-size: 13.5px;
}

.alert svg {
  flex: none;
  width: 16px;
  height: 16px;
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
</style>
