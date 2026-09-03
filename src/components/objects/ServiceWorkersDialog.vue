<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId } from 'vue'
import ServiceWorkersEditor from '@/components/objects/ServiceWorkersEditor.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount, parseAmount } from '@/lib/amount'
import type { Employee } from '@/lib/employees'
import {
  nextServiceId,
  serviceUsedVolume,
  type Service,
  type ServiceWorkerErrors,
  type ServiceWorkerForm,
  type ServiceWorkerPayload,
} from '@/lib/services'

/**
 * Склад бригади на роботі — окреме вікно, а не колонка таблиці: тут три поля
 * на людину, і в рядок вони не влазять, а дивляться на них рідше, ніж на
 * обсяги й гроші.
 */

const props = defineProps<{ service: Service; employees: Employee[]; loading: boolean }>()

const emit = defineEmits<{ save: [workers: ServiceWorkerPayload[]]; close: [] }>()

const titleId = useId()

/** Числа в редакторі — рядки: поле може бути порожнім або недописаним. */
const workers = ref<ServiceWorkerForm[]>(
  props.service.workers.map((worker) => ({
    id: nextServiceId('w'),
    employeeId: worker.employee_id,
    volume: String(worker.volume),
    rate: String(worker.rate),
  })),
)

const tried = ref(false)

const volume = computed(() => serviceUsedVolume(props.service))

function rowErrors(worker: ServiceWorkerForm): ServiceWorkerErrors {
  const errors: ServiceWorkerErrors = {}

  if (worker.employeeId === null) {
    errors.employeeId = 'Оберіть виконавця'
  }

  for (const field of ['volume', 'rate'] as const) {
    const raw = worker[field]

    if (raw.trim() === '') {
      continue
    }

    const parsed = parseAmount(raw)

    if (parsed === null) {
      errors[field] = 'Тільки число'
    } else if (parsed < 0) {
      errors[field] = 'Не менше нуля'
    }
  }

  return errors
}

const errors = computed(() => {
  if (!tried.value) {
    return {}
  }

  const map: Record<string, ServiceWorkerErrors> = {}

  for (const worker of workers.value) {
    const found = rowErrors(worker)

    if (Object.keys(found).length > 0) {
      map[worker.id] = found
    }
  }

  return map
})

function save(): void {
  tried.value = true

  if (workers.value.some((worker) => Object.keys(rowErrors(worker)).length > 0)) {
    return
  }

  emit(
    'save',
    workers.value.map((worker) => ({
      // Рядок без людини сюди не доходить — його ловить перевірка вище.
      employee_id: worker.employeeId ?? 0,
      volume: parseAmount(worker.volume) ?? 0,
      rate: parseAmount(worker.rate) ?? 0,
    })),
  )
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
    <div class="dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId">
      <header class="dialog__head">
        <div class="dialog__intro">
          <h2 :id="titleId" class="display dialog__title">Виконавці</h2>

          <p class="dialog__sub">
            {{ service.name }} ·
            <strong>{{ formatAmount(volume.value) }} {{ service.unit }}</strong>
            {{ volume.basis === 'fact' ? 'за фактом' : 'за планом' }}
          </p>
        </div>

        <button type="button" class="dialog__close" aria-label="Закрити" @click="emit('close')">
          <AppIcon name="close" />
        </button>
      </header>

      <ServiceWorkersEditor
        v-model="workers"
        :unit="service.unit"
        :volume="volume.value"
        :employees="employees"
        :loading="loading"
        :errors="errors"
      />

      <footer class="dialog__foot">
        <button type="button" class="btn btn--primary btn--sm" @click="save">Зберегти</button>
        <button type="button" class="btn btn--ghost btn--sm" @click="emit('close')">
          Скасувати
        </button>

        <span class="dialog__hint">Esc — закрити</span>
      </footer>
    </div>
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
  gap: 18px;
  width: min(760px, 100%);
  padding: 28px 30px;
  border-radius: var(--r-xl);
  background: var(--paper-raised);
  box-shadow: var(--shadow-lg);
}

.dialog__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.dialog__intro {
  display: grid;
  gap: 5px;
  min-width: 0;
}

.dialog__title {
  font-size: 20px;
}

.dialog__sub {
  font-size: 12.5px;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

.dialog__close {
  display: grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--ink-faint);
  transition:
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.dialog__close:hover {
  background: var(--paper-sunk);
  color: var(--ink);
}

.dialog__close :deep(.icon) {
  width: 16px;
  height: 16px;
}

.dialog__foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.dialog__hint {
  margin-left: auto;
  font-size: 11.5px;
  color: var(--ink-faint);
}

@media (width <= 560px) {
  .dialog__hint {
    width: 100%;
    margin-left: 0;
  }
}
</style>
