<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, useId } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import PhoneField from '@/components/ui/PhoneField.vue'
import TextField from '@/components/ui/TextField.vue'
import {
  hasEmployeeErrors,
  validateEmployeeForm,
  type EmployeeErrors,
  type EmployeeForm,
} from '@/lib/employees'

/**
 * Нова людина в довіднику. Обовʼязкове тут одне — імʼя: найчастіше людину
 * заводять зі слів бригадира, коли з контактів відомий хіба номер.
 *
 * Статусу у вікні немає навмисно: щойно заведену людину ставлять на роботи,
 * тож вона активна за визначенням. Опис і решта — уже в картці.
 */

const emit = defineEmits<{ create: [form: EmployeeForm]; close: [] }>()

const titleId = useId()

const form = reactive<EmployeeForm>({ name: '', role: '', crew: '', phone: '', email: '' })
const errors = ref<EmployeeErrors>({})

function submit(): void {
  errors.value = validateEmployeeForm(form)

  if (hasEmployeeErrors(errors.value)) {
    return
  }

  emit('create', { ...form })
  emit('close')
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    emit('close')
  }
}

const bodyOverflow = ref('')

onMounted(() => {
  bodyOverflow.value = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  document.body.style.overflow = bodyOverflow.value
  window.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <form
      class="dialog"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      @submit.prevent="submit"
    >
      <header class="head">
        <div class="head__intro">
          <h2 :id="titleId" class="display head__title">Новий співробітник</h2>
          <p class="head__sub">
            Обовʼязкове лише імʼя — решту дозаповните, коли буде що записувати.
          </p>
        </div>

        <button type="button" class="head__close" aria-label="Закрити" @click="emit('close')">
          <AppIcon name="close" />
        </button>
      </header>

      <div class="grid">
        <TextField
          v-model="form.name"
          class="grid__wide"
          label="ПІБ"
          autofocus
          placeholder="Тарас Мельник"
          :error="errors.name"
        />

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

      <footer class="foot">
        <button type="submit" class="btn btn--primary btn--sm">Завести людину</button>
        <button type="button" class="btn btn--ghost btn--sm" @click="emit('close')">
          Скасувати
        </button>
      </footer>
    </form>
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
  gap: 20px;
  width: min(560px, 100%);
  padding: 26px 28px 24px;
  border-radius: var(--r-xl);
  background: var(--paper-raised);
  box-shadow: var(--shadow-lg);
}

.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.head__intro {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.head__title {
  font-size: 20px;
}

.head__sub {
  max-width: 46ch;
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink-muted);
}

.head__close {
  display: grid;
  place-items: center;
  flex: none;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--ink-faint);
  transition:
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.head__close:hover {
  background: var(--paper-sunk);
  color: var(--ink);
}

.head__close :deep(.icon) {
  width: 17px;
  height: 17px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 14px 18px;
}

/* Імʼя — єдине обовʼязкове поле, тож воно стоїть на всю ширину вікна. */
.grid__wide {
  grid-column: 1 / -1;
}

.foot {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 4px;
}
</style>
