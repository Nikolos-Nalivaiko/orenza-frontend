<script setup lang="ts">
import { computed, nextTick, onMounted, useTemplateRef } from 'vue'
import ServiceCard from '@/components/objects/ServiceCard.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import { emptyService, servicesTotals, type ServiceErrors, type ServiceForm } from '@/lib/services'
import { useEmployeesStore } from '@/stores/employees'

const props = defineProps<{
  errors: Record<string, ServiceErrors>
  /** Приватний простір: без виконавців і без розкладки на профіт. */
  solo: boolean
}>()

const services = defineModel<ServiceForm[]>({ required: true })

const employees = useEmployeesStore()

const root = useTemplateRef<HTMLElement>('root')

onMounted(() => {
  // У приватному просторі виконавців немає — довідник там ні до чого.
  if (!props.solo && employees.items.length === 0) {
    void employees.fetchEmployees()
  }
})

const totals = computed(() => servicesTotals(services.value))
const isEmpty = computed(() => services.value.length === 0)

function errorsFor(id: string): ServiceErrors | undefined {
  return props.errors[id]
}

async function add(): Promise<void> {
  services.value = [...services.value, emptyService()]

  await nextTick()
  root.value?.querySelector<HTMLElement>('.svc:last-child input')?.focus()
}

function remove(id: string): void {
  services.value = services.value.filter((service) => service.id !== id)
}
</script>

<template>
  <div ref="root" class="services">
    <div v-if="isEmpty" class="empty">
      <span class="empty__icon" aria-hidden="true"><AppIcon name="estimate" /></span>

      <p class="empty__text">
        Роботи по обʼєкту з обсягами та ціною для замовника.
        <template v-if="!solo">
          Виконавці й їхні ставки дають собівартість, різниця — профіт із роботи.
        </template>
      </p>

      <button type="button" class="btn btn--primary btn--sm" @click="add">
        <AppIcon name="plus" />
        Додати роботу
      </button>
    </div>

    <template v-else>
      <ul class="list">
        <ServiceCard
          v-for="(service, index) in services"
          :key="service.id"
          :model-value="service"
          :index="index"
          :errors="errorsFor(service.id)"
          :solo="solo"
          :employees="employees.items"
          :employees-loading="employees.isLoading"
          @remove="remove(service.id)"
        />
      </ul>

      <div class="foot">
        <button type="button" class="add" @click="add">
          <AppIcon name="plus" />
          Додати роботу
        </button>

        <dl class="sums">
          <div class="sum">
            <dt>Дохід</dt>
            <dd>{{ formatAmount(totals.revenue) }} ₴</dd>
          </div>

          <template v-if="!solo">
            <div class="sum">
              <dt>ЗП виконавцям</dt>
              <dd>{{ formatAmount(totals.cost) }} ₴</dd>
            </div>

            <div class="sum sum--profit" :class="{ 'sum--minus': totals.profit < 0 }">
              <dt>Профіт із робіт</dt>
              <dd>{{ formatAmount(totals.profit) }} ₴</dd>
            </div>
          </template>
        </dl>
      </div>
    </template>
  </div>
</template>

<style scoped>
.services {
  /* Ширина карток залежить від колонки, а не від вікна. */
  container-type: inline-size;

  --cols: minmax(160px, 2.4fr) 96px 104px 104px 116px 132px 30px;

  display: grid;
  gap: 10px;
}

.list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.add {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 14px 8px 11px;
  border: 1px dashed var(--line-strong);
  border-radius: 999px;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  transition:
    border-color 0.18s var(--ease),
    background-color 0.18s var(--ease);
}

.add:hover {
  border-color: var(--brand);
  background: var(--brand-tint);
}

.add :deep(.icon) {
  width: 15px;
  height: 15px;
}

.sums {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0;
}

.sum {
  display: flex;
  align-items: baseline;
  gap: 7px;
  padding: 6px 12px;
  border-radius: 999px;
  background: var(--paper-sunk);
}

.sum dt {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.sum dd {
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.sum--profit {
  background: var(--brand-tint);
}

.sum--profit dt,
.sum--profit dd {
  color: var(--brand-strong);
}

.sum--minus {
  background: var(--danger-tint);
}

.sum--minus dt,
.sum--minus dd {
  color: var(--danger);
}

.empty {
  display: grid;
  justify-items: start;
  gap: 12px;
  padding: 22px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-md);
}

.empty__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 13px;
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.empty__text {
  max-width: 62ch;
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink-muted);
}

.empty .btn :deep(.icon) {
  width: 15px;
  height: 15px;
}

@container (width < 950px) {
  .foot {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
