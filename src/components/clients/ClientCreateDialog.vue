<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, useId } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import TextField from '@/components/ui/TextField.vue'
import {
  hasClientErrors,
  validateClientForm,
  type ClientErrors,
  type ClientForm,
} from '@/lib/clients'

/**
 * Новий замовник із довідника. Обовʼязкове тут одне — імʼя: контакт заводять
 * заздалегідь, часто з візитки чи переписки, і змушувати людину вигадувати
 * пошту з адресою заради збереження означає не отримати запис узагалі.
 *
 * Знижки й опису у вікні немає навмисно: це умови роботи, які зʼявляються
 * пізніше й правляться в картці замовника, коли вже є про що домовлятись.
 */

const emit = defineEmits<{ create: [form: ClientForm]; close: [] }>()

const titleId = useId()

const form = reactive<ClientForm>({ name: '', contact: '', phone: '', email: '', address: '' })
const errors = ref<ClientErrors>({})

function submit(): void {
  errors.value = validateClientForm(form)

  if (hasClientErrors(errors.value)) {
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
          <h2 :id="titleId" class="display head__title">Новий замовник</h2>
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
          label="Назва або ПІБ"
          autofocus
          placeholder="ТОВ «Мегабуд» або Олександр Романюк"
          :error="errors.name"
        />

        <TextField
          v-model="form.contact"
          label="Контактна особа"
          optional
          placeholder="З ким саме розмовляємо"
          :error="errors.contact"
        />

        <TextField
          v-model="form.phone"
          label="Телефон"
          optional
          inputmode="tel"
          autocomplete="tel"
          placeholder="+380 67 000 00 00"
          :error="errors.phone"
        >
          <template #prefix><AppIcon name="phone" /></template>
        </TextField>

        <TextField
          v-model="form.email"
          label="Пошта"
          optional
          type="email"
          inputmode="email"
          placeholder="office@company.ua"
          :error="errors.email"
        >
          <template #prefix><AppIcon name="mail" /></template>
        </TextField>

        <TextField
          v-model="form.address"
          label="Адреса"
          optional
          placeholder="вул. Антоновича, 44 · Київ"
          :error="errors.address"
        >
          <template #prefix><AppIcon name="pin" /></template>
        </TextField>
      </div>

      <footer class="foot">
        <button type="submit" class="btn btn--primary btn--sm">Завести замовника</button>
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
