<script setup lang="ts">
import { computed, nextTick, useTemplateRef } from 'vue'
import MaterialRow from '@/components/objects/MaterialRow.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import {
  emptyMaterial,
  materialsTotals,
  type MaterialErrors,
  type MaterialForm,
} from '@/lib/materials'

const props = defineProps<{ errors: Record<string, MaterialErrors> }>()

const materials = defineModel<MaterialForm[]>({ required: true })

const root = useTemplateRef<HTMLElement>('root')

const totals = computed(() => materialsTotals(materials.value))
const isEmpty = computed(() => materials.value.length === 0)

function errorsFor(id: string): MaterialErrors | undefined {
  return props.errors[id]
}

/** Нова позиція одразу отримує фокус — інакше після кліку треба цілитись мишею. */
async function add(): Promise<void> {
  materials.value = [...materials.value, emptyMaterial()]

  await nextTick()
  root.value?.querySelector<HTMLElement>('.mrow:last-child input')?.focus()
}

function remove(id: string): void {
  materials.value = materials.value.filter((material) => material.id !== id)
}
</script>

<template>
  <div ref="root" class="materials">
    <div v-if="isEmpty" class="empty">
      <span class="empty__icon" aria-hidden="true"><AppIcon name="box" /></span>

      <p class="empty__text">
        Список закупівель ведеться прямо тут: що потрібно, що вже замовлено й що лежить на
        майданчику.
      </p>

      <button type="button" class="btn btn--primary btn--sm" @click="add">
        <AppIcon name="plus" />
        Додати матеріал
      </button>
    </div>

    <template v-else>
      <div class="head" aria-hidden="true">
        <span>Матеріал</span>
        <span>Кількість</span>
        <span>Купує</span>
        <span class="head__num">Закупівля</span>
        <span class="head__num">Замовнику</span>
        <span>Статус</span>
        <span>Погоджено</span>
        <span />
      </div>

      <TransitionGroup tag="ul" name="rows" class="rows">
        <MaterialRow
          v-for="(material, index) in materials"
          :key="material.id"
          :model-value="material"
          :index="index"
          :errors="errorsFor(material.id)"
          @remove="remove(material.id)"
        />
      </TransitionGroup>

      <div class="foot">
        <button type="button" class="add" @click="add">
          <AppIcon name="plus" />
          Додати матеріал
        </button>

        <!-- Профіт рахуємо лише з наших закупівель: у позиціях клієнта націнки немає. -->
        <dl class="sums">
          <div class="sum">
            <dt>Закупівля</dt>
            <dd>{{ formatAmount(totals.cost) }} ₴</dd>
          </div>

          <div class="sum">
            <dt>Замовнику</dt>
            <dd>{{ formatAmount(totals.revenue) }} ₴</dd>
          </div>

          <div class="sum sum--profit" :class="{ 'sum--minus': totals.profit < 0 }">
            <dt>Профіт</dt>
            <dd>{{ formatAmount(totals.profit) }} ₴</dd>
          </div>

          <div v-if="totals.clientCount > 0" class="sum sum--muted">
            <dt>Купує замовник</dt>
            <dd>{{ totals.clientCount }} поз.</dd>
          </div>
        </dl>
      </div>
    </template>
  </div>
</template>

<style scoped>
.materials {
  /* Ширина таблиці залежить від колонки, а не від вікна: бічну панель можна згорнути. */
  container-type: inline-size;

  --cols: minmax(160px, 2.2fr) 128px 124px 100px 100px 124px 100px 32px;

  display: grid;
  gap: 8px;
}

.head {
  display: grid;
  grid-template-columns: var(--cols);
  gap: 8px;
  padding: 0 8px 6px;
  border-bottom: 1px solid var(--line);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--ink-faint);
}

/* Підпис має стояти рівно над текстом у полі, а не над його рамкою. */
.head > span {
  padding-inline: 10px;
}

.head__num {
  text-align: right;
}

.rows {
  position: relative;
  display: grid;
  gap: 2px;
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

.sum--muted dd {
  color: var(--ink-muted);
  font-weight: 500;
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

.rows-enter-active,
.rows-leave-active {
  transition:
    opacity 0.24s var(--ease),
    transform 0.24s var(--ease);
}

.rows-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

.rows-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}

.rows-leave-active {
  position: absolute;
}

.rows-move {
  transition: transform 0.24s var(--ease);
}

@container (width < 950px) {
  .head {
    display: none;
  }

  .rows {
    gap: 10px;
  }

  .foot {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
