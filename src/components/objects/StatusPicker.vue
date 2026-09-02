<script setup lang="ts">
import { useId } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { OBJECT_STATUSES, type ObjectStatus } from '@/lib/objects'

const model = defineModel<ObjectStatus>({ required: true })

/**
 * Під картками — справжні radio-input'и: стрілки, Home/End і читання
 * скрінрідером дістаються безкоштовно, малювати їх власноруч немає причин.
 */
const name = useId()
</script>

<template>
  <fieldset class="statuses">
    <!-- Назву блоку несе секція форми — тут вона лишається тільки для читалок. -->
    <legend class="sr-only">Статус обʼєкта</legend>

    <div class="statuses__grid">
      <label
        v-for="status in OBJECT_STATUSES"
        :key="status.value"
        class="status"
        :class="[`status--${status.value}`, { 'status--on': status.value === model }]"
      >
        <input
          v-model="model"
          type="radio"
          class="status__input"
          :name="name"
          :value="status.value"
        />

        <span class="status__icon" aria-hidden="true">
          <AppIcon :name="status.icon" />
        </span>

        <span class="status__name">{{ status.label }}</span>
      </label>
    </div>
  </fieldset>
</template>

<style scoped>
.statuses {
  margin: 0;
  padding: 0;
  border: 0;
}

.statuses__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
}

.status {
  --tone: var(--ink-muted);
  --tone-tint: var(--paper-sunk);
  --tone-ring: rgb(12 17 14 / 10%);

  position: relative;
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 11px;
  padding: 11px 14px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper);
  cursor: pointer;
  transition:
    border-color 0.2s var(--ease),
    background-color 0.2s var(--ease),
    box-shadow 0.2s var(--ease);
}

.status:hover {
  border-color: var(--line-strong);
  background: var(--paper-raised);
}

/* Кожен статус має власний колір — але він вмикається лише на обраному,
   інакше чотири плашки поруч читаються як світлофор без сенсу. */
.status--planned {
  --tone: var(--ink-soft);
  --tone-tint: var(--paper-sunk);
  --tone-ring: rgb(12 17 14 / 12%);
}

.status--in_progress {
  --tone: var(--brand-strong);
  --tone-tint: var(--brand-tint);
  --tone-ring: var(--brand-glow);
}

.status--paused {
  --tone: #8a5c00;
  --tone-tint: var(--amber-tint);
  --tone-ring: rgb(217 144 0 / 24%);
}

.status--done {
  --tone: var(--c-4);
  --tone-tint: var(--c-4-soft);
  --tone-ring: rgb(42 120 214 / 22%);
}

/*
 * Обраний статус тримається на кольорі й кільці — тінь тут піднімала б
 * плитку над формою, хоча вона з нею в одній площині.
 */
.status--on {
  border-color: var(--tone);
  background: var(--paper-raised);
  box-shadow: 0 0 0 3px var(--tone-ring);
}

.status__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.status__input:focus-visible ~ .status__icon {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

.status__icon {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--paper-sunk);
  color: var(--ink-faint);
  transition:
    background-color 0.2s var(--ease),
    color 0.2s var(--ease);
}

.status--on .status__icon {
  background: var(--tone-tint);
  color: var(--tone);
}

.status__icon :deep(.icon) {
  width: 17px;
  height: 17px;
}

.status__name {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.status--on .status__name {
  color: var(--tone);
}
</style>
