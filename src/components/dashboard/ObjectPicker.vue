<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, useId } from 'vue'
import StatusBadge from '@/components/objects/StatusBadge.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import type { ObjectRow } from '@/lib/objectList'

/**
 * Перший крок швидкого платежу: на який обʼєкт він прийшов. Далі відкриється
 * звичайне вікно платежу — те саме, що й у картці, тож нових правил у грошей
 * не зʼявляється, змінюється лише те, звідки їх завели.
 *
 * Список стоїть за боргом: гроші приходять саме туди, де їх чекають.
 */
defineProps<{ rows: ObjectRow[] }>()

const emit = defineEmits<{ pick: [id: number]; close: [] }>()

const titleId = useId()

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
      <header class="head">
        <div class="head__intro">
          <h2 :id="titleId" class="display head__title">Куди платіж</h2>
          <p class="head__sub">Оберіть обʼєкт — суму й дату запитаємо наступним кроком.</p>
        </div>

        <button type="button" class="head__close" aria-label="Закрити" @click="emit('close')">
          <AppIcon name="close" />
        </button>
      </header>

      <p v-if="rows.length === 0" class="empty">
        Живих обʼєктів немає — платіж поки нікуди записати.
      </p>

      <ul v-else class="list">
        <li v-for="{ object, summary } in rows" :key="object.id">
          <button type="button" class="item" @click="emit('pick', object.id)">
            <span class="item__main">
              <span class="item__name">{{ object.name }}</span>
              <span class="item__address">{{ object.client?.name ?? object.address }}</span>
            </span>

            <StatusBadge :status="object.status.value" :label="object.status.label" />

            <span class="item__due" :class="{ 'item__due--none': summary.due <= 0 }">
              <span class="item__label">
                {{ summary.due > 0 ? 'Залишок' : 'Оплачено' }}
              </span>
              <span class="item__sum">
                {{ formatAmount(Math.max(summary.due, 0)) }} <span class="item__cur">₴</span>
              </span>
            </span>
          </button>
        </li>
      </ul>
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

.empty {
  font-size: 13.5px;
  color: var(--ink-muted);
}

.list {
  display: grid;
  gap: 4px;
  /* Довгий список не має виштовхувати вікно за екран. */
  max-height: min(52vh, 420px);
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  background: transparent;
  text-align: left;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease);
}

.item:hover {
  border-color: var(--line);
  background: var(--paper-sunk);
}

.item__main {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.item__name {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item__address {
  font-size: 12.5px;
  color: var(--ink-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item__due {
  display: grid;
  justify-items: end;
  gap: 2px;
  white-space: nowrap;
}

.item__label {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.item__sum {
  font-size: 13.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.item__due--none .item__sum {
  color: var(--brand-strong);
}

.item__cur {
  color: var(--ink-faint);
  font-weight: 500;
}

@media (width <= 520px) {
  .item {
    grid-template-columns: minmax(0, 1fr) auto;
  }

  .item__due {
    grid-column: 1 / -1;
    justify-items: start;
  }
}
</style>
