<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import type { IconName } from '@/components/ui/icons'
import type { Client } from '@/lib/objects'

/**
 * Звʼязок із замовником: телефон, пошта, адреса.
 *
 * Це не три картки, а одна смуга з трьох колонок — інакше шапка розсипається
 * на окремі коробочки, і погляд не має де зупинитись. Кожне значення саме по
 * собі дія: подзвонити, написати, знайти на мапі. Поруч — копіювання: номер
 * частіше переносять у месенджер, ніж набирають з екрана.
 *
 * Колонки різняться значком і підписом, а не кольором: три різнокольорові
 * плашки в шапці читались би як статуси, яких у контактів немає.
 */

const props = defineProps<{ client: Client }>()

const emit = defineEmits<{ fill: [] }>()

interface Contact {
  key: 'phone' | 'email' | 'address'
  icon: IconName
  label: string
  value: string
  /** Куди веде саме значення. Порожньо — вести нікуди. */
  href: string | null
  /** Зовнішнє посилання відкриваємо в новій вкладці, tel: і mailto: — ні. */
  external: boolean
  blank: string
}

const contacts = computed<Contact[]>(() => [
  {
    key: 'phone',
    icon: 'phone',
    label: 'Телефон',
    value: props.client.phone,
    href: props.client.phone === '' ? null : `tel:${props.client.phone}`,
    external: false,
    blank: 'Номера ще немає',
  },
  {
    key: 'email',
    icon: 'mail',
    label: 'Пошта',
    value: props.client.email,
    href: props.client.email === '' ? null : `mailto:${props.client.email}`,
    external: false,
    blank: 'Пошти ще немає',
  },
  {
    key: 'address',
    icon: 'pin',
    label: 'Адреса',
    value: props.client.address,
    // Адресу не набирають — за нею їдуть, тож вона веде на мапу.
    href:
      props.client.address === ''
        ? null
        : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(props.client.address)}`,
    external: true,
    blank: 'Адреси ще немає',
  },
])

const copied = ref<string | null>(null)

let timer: number | undefined

async function copy(contact: Contact): Promise<void> {
  try {
    await navigator.clipboard.writeText(contact.value)
  } catch {
    // Браузер не дав доступу до буфера — мовчки лишаємо значення на екрані.
    return
  }

  copied.value = contact.key
  window.clearTimeout(timer)
  timer = window.setTimeout(() => (copied.value = null), 1600)
}

onBeforeUnmount(() => window.clearTimeout(timer))
</script>

<template>
  <ul class="strip">
    <li
      v-for="contact in contacts"
      :key="contact.key"
      class="col"
      :class="[`col--${contact.key}`, { 'col--blank': contact.value === '' }]"
    >
      <span class="col__icon" aria-hidden="true"><AppIcon :name="contact.icon" /></span>

      <div class="col__body">
        <p class="col__label">{{ contact.label }}</p>

        <a
          v-if="contact.href"
          class="col__value"
          :class="{ 'col__value--num': contact.key === 'phone' }"
          :href="contact.href"
          :target="contact.external ? '_blank' : undefined"
          :rel="contact.external ? 'noreferrer' : undefined"
        >
          {{ contact.value }}
        </a>

        <button v-else type="button" class="col__add" @click="emit('fill')">
          {{ contact.blank }}
          <AppIcon name="plus" />
        </button>
      </div>

      <button
        v-if="contact.href"
        type="button"
        class="col__copy"
        :class="{ 'col__copy--done': copied === contact.key }"
        :title="copied === contact.key ? 'Скопійовано' : `Скопіювати: ${contact.label}`"
        :aria-label="copied === contact.key ? 'Скопійовано' : `Скопіювати: ${contact.label}`"
        @click="copy(contact)"
      >
        <AppIcon :name="copied === contact.key ? 'check' : 'copy'" />
      </button>
    </li>
  </ul>
</template>

<style scoped>
.strip {
  /* Роздільники вмикаються лише тоді, коли колонки справді стоять поруч. */
  container-type: inline-size;

  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(228px, 1fr));
  gap: 4px 0;
  margin: 0;
  padding: 0;
  list-style: none;
}

.col {
  --tone: var(--ink);
  --tone-soft: var(--paper-sunk);

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

/*
 * Тонка вертикаль між колонками — рівно щоб вони не злипались у рядок. Коли
 * місця мало й колонки стають одна під одною, лінія збоку не має сенсу.
 */
@container (min-width: 690px) {
  .col + .col::before {
    content: '';
    position: absolute;
    top: 12px;
    bottom: 12px;
    left: 0;
    width: 1px;
    background: var(--line);
  }
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

/* Значення — воно ж і дія: подзвонити, написати, поїхати. */
.col__value {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--ink);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: color 0.16s var(--ease);
}

.col__value:hover {
  color: var(--tone);
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
  color: var(--brand-strong);
}

.col__add :deep(.icon) {
  width: 13px;
  height: 13px;
}

.col--blank .col__icon {
  color: var(--ink-faint);
}

.col__copy {
  display: grid;
  place-items: center;
  flex: none;
  width: 30px;
  height: 30px;
  margin-left: auto;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--ink-faint);
  opacity: 0;
  transition:
    opacity 0.16s var(--ease),
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.col:hover .col__copy,
.col__copy:focus-visible,
.col__copy--done {
  opacity: 1;
}

.col__copy:hover {
  background: var(--tone-soft);
  color: var(--tone);
}

/* Підтвердження живе півтори секунди — рівно щоб його встигли побачити. */
.col__copy--done,
.col__copy--done:hover {
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.col__copy :deep(.icon) {
  width: 15px;
  height: 15px;
}

/* З телефона наведення немає — копіювання має бути видимим одразу. */
@media (hover: none) {
  .col__copy {
    opacity: 1;
  }
}
</style>
