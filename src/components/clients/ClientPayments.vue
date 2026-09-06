<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import type { ClientPaymentRow } from '@/lib/clients'
import { isPaymentLate } from '@/lib/finance'
import { formatDay } from '@/lib/objects'

/**
 * Усі платежі замовника одним списком — з обʼєктом у кожному рядку. Це
 * відповідь на щоденне «прийшов переказ, а за що він був»: без обʼєкта
 * зведений список у людини з трьома будовами не читається взагалі.
 *
 * Помилку в сумі чи підписі помічають саме тут, переглядаючи всі платежі
 * підряд, — тож і виправляють її звідси, а не після мандрівки в картку
 * обʼєкта. Решта дій над платежем лишається в обʼєкті, де його заводили.
 */

defineProps<{ rows: ClientPaymentRow[]; today: string }>()

const emit = defineEmits<{ edit: [row: ClientPaymentRow] }>()
</script>

<template>
  <div class="pays">
    <header class="pays__head">
      <h3 class="pays__title">
        Платежі замовника
        <span v-if="rows.length > 0" class="pays__count">{{ rows.length }}</span>
      </h3>
    </header>

    <p v-if="rows.length === 0" class="empty">
      Платежів ще не було. Вони зʼявляться тут, щойно їх заведуть у картці будь-якого обʼєкта цього
      замовника.
    </p>

    <template v-else>
      <div class="phead">
        <span>Дата</span>
        <span class="phead__num">Сума</span>
        <span>Обʼєкт</span>
        <span>Коментар</span>
        <span>Статус</span>
        <span />
      </div>

      <ul class="prows">
        <li
          v-for="{ payment, object } in rows"
          :key="`${object.id}-${payment.id}`"
          class="prow"
          :class="[
            `prow--${payment.status.value}`,
            { 'prow--late': isPaymentLate(payment, today) },
          ]"
        >
          <p class="cell cell--day" data-label="Дата">
            <span v-if="payment.paid_at" class="day">{{ formatDay(payment.paid_at) }}</span>
            <span v-else class="day day--none">без дати</span>
          </p>

          <p class="cell cell--num" data-label="Сума">
            <span class="sum">{{ formatAmount(payment.amount) }} <span class="cur">₴</span></span>
          </p>

          <p class="cell cell--obj" data-label="Обʼєкт">
            <RouterLink class="obj" :to="{ name: 'object', params: { id: object.id } }">
              {{ object.name }}
            </RouterLink>
          </p>

          <p class="cell cell--note" data-label="Коментар">
            <span class="note">{{ payment.name }}</span>
            <span v-if="payment.description" class="note note--extra">
              {{ payment.description }}
            </span>
          </p>

          <p class="cell cell--state" data-label="Статус">
            <span class="chip">
              <span class="chip__dot" aria-hidden="true" />
              {{ isPaymentLate(payment, today) ? 'Прострочено' : payment.status.label }}
            </span>
          </p>

          <div class="cell cell--acts">
            <button
              type="button"
              class="ctl-drop edit"
              :aria-label="`Виправити платіж на ${formatAmount(payment.amount)} ₴ — ${object.name}`"
              @click="emit('edit', { payment, object })"
            >
              <AppIcon name="edit" />
            </button>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>

<style scoped>
.pays {
  container-type: inline-size;

  --cols: 106px 128px minmax(0, 1.2fr) minmax(0, 1fr) 142px 36px;

  display: grid;
  gap: 12px;
}

.pays__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}

.pays__title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.pays__count {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 11px;
  text-align: center;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

.empty {
  padding: 22px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-md);
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink-muted);
}

.phead {
  display: grid;
  grid-template-columns: var(--cols);
  align-items: center;
  gap: 20px;
  padding: 0 16px 12px;
  border-bottom: 1px solid var(--line);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--ink-faint);
}

.phead__num {
  text-align: right;
}

.prows {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.prow {
  position: relative;
  display: grid;
  grid-template-columns: var(--cols);
  align-items: center;
  gap: 20px;
  padding: 13px 16px;
  border: 1px solid transparent;
  border-radius: var(--r-md);
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease);
}

.prow:hover {
  border-color: var(--line);
  background: var(--paper);
}

/* Рельс стану ліворуч: отримане — суцільне, очікуване — пунктир. */
.prow::before {
  content: '';
  position: absolute;
  top: 12px;
  bottom: 12px;
  left: 0;
  width: 3px;
  border-radius: 0 3px 3px 0;
  background: var(--tone);
}

.prow--paid {
  --tone: var(--brand);
}

.prow--pending {
  --tone: var(--line-strong);
}

.prow--pending::before {
  background: repeating-linear-gradient(180deg, var(--tone) 0 4px, transparent 4px 8px);
}

.prow--overdue,
.prow--late {
  --tone: var(--danger);
}

.prow--cancelled {
  --tone: var(--line);

  opacity: 0.6;
}

.cell {
  min-width: 0;
}

.cell--num {
  text-align: right;
}

.cell--acts {
  display: flex;
  justify-content: flex-end;
}

/* Правка — дія рідкісна: у спокої вона не тягне на себе погляд. */
.edit {
  opacity: 0;
  transition:
    opacity 0.16s var(--ease),
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.prow:hover .edit,
.prow:focus-within .edit {
  opacity: 1;
}

/* Виправити — не те саме, що прибрати: червоне тло тут лякало б даремно. */
.edit:hover {
  background: var(--paper-sunk);
  color: var(--ink);
}

.day {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.day--none {
  font-weight: 500;
  color: var(--ink-faint);
}

.sum {
  font-size: 14.5px;
  font-weight: 600;
  letter-spacing: -0.015em;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.cur {
  font-weight: 500;
  color: var(--ink-faint);
}

/* Очікуване ще не гроші — рядок тримається тихіше за отримане. */
.prow--pending .sum,
.prow--pending .day,
.prow--cancelled .sum {
  color: var(--ink-muted);
}

.obj {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--ink);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.obj:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.note {
  display: block;
  font-size: 13px;
  color: var(--ink-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.note--extra {
  font-size: 11.5px;
  color: var(--ink-faint);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 11px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--ink-muted);
}

.chip__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--tone);
}

.prow--paid .chip {
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.prow--late .chip {
  background: var(--danger-tint);
  color: var(--danger);
}

@container (width < 760px) {
  .phead {
    display: none;
  }

  .prows {
    gap: 10px;
  }

  .prow {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'day   sum'
      'obj   obj'
      'note  note'
      'state acts';
    align-items: start;
    gap: 10px 16px;
    padding: 16px 16px 16px 18px;
    border-color: var(--line);
    background: var(--paper-raised);
  }

  .cell--day {
    grid-area: day;
  }

  .cell--num {
    grid-area: sum;
  }

  .cell--obj {
    grid-area: obj;
  }

  .cell--note {
    grid-area: note;
  }

  .cell--state {
    grid-area: state;
  }

  .cell--acts {
    grid-area: acts;
  }

  /* З телефона наведення немає — інакше правку було б не дістати взагалі. */
  .edit {
    opacity: 1;
  }

  .note {
    white-space: normal;
  }
}
</style>
