<script setup lang="ts">
import { computed } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import { isPaymentLate, sortPayments, type Payment } from '@/lib/finance'
import { formatDay } from '@/lib/objects'

/**
 * Платежі обʼєкта одним списком: і те, що вже отримали, і те, чого ще
 * чекаємо. Очікуване стоїть тут же, пунктиром — це відповідь на щоденне
 * питання власника «коли прийде решта», а не окремий модуль рахунків.
 */

const props = defineProps<{ payments: Payment[]; today: string }>()

const emit = defineEmits<{ add: []; receive: [id: number]; remove: [id: number] }>()

const rows = computed(() => sortPayments(props.payments, props.today))
</script>

<template>
  <div class="pays">
    <header class="pays__head">
      <h3 class="pays__title">Платежі</h3>

      <button type="button" class="add" @click="emit('add')">
        <AppIcon name="plus" />
        Додати платіж
      </button>
    </header>

    <p v-if="rows.length === 0" class="empty">
      Платежів ще не було. Сюди ж заводять і очікувані — щоб бачити, коли прийде решта грошей.
    </p>

    <template v-else>
      <div class="phead">
        <span>Дата</span>
        <span class="phead__num">Сума</span>
        <span>Коментар</span>
        <span>Статус</span>
        <span />
      </div>

      <TransitionGroup tag="ul" name="rows" class="prows">
        <li
          v-for="row in rows"
          :key="row.id"
          class="prow"
          :class="[`prow--${row.status.value}`, { 'prow--late': isPaymentLate(row, today) }]"
        >
          <p class="cell cell--day" data-label="Дата">
            <span v-if="row.paid_at" class="day">{{ formatDay(row.paid_at) }}</span>
            <span v-else class="day day--none">без дати</span>
          </p>

          <p class="cell cell--num" data-label="Сума">
            <span class="sum">{{ formatAmount(row.amount) }} <span class="cur">₴</span></span>
          </p>

          <p class="cell cell--note" data-label="Коментар">
            <span class="note">{{ row.name }}</span>
            <span v-if="row.description" class="note note--extra">{{ row.description }}</span>
          </p>

          <p class="cell cell--state" data-label="Статус">
            <span class="chip">
              <span class="chip__dot" aria-hidden="true" />
              {{ isPaymentLate(row, today) ? 'Прострочено' : row.status.label }}
            </span>
          </p>

          <div class="cell cell--acts">
            <!-- Гроші прийшли — очікуваний платіж стає отриманим одним дотиком. -->
            <button
              v-if="row.status.value === 'pending'"
              type="button"
              class="got"
              @click="emit('receive', row.id)"
            >
              <AppIcon name="check" />
              Отримано
            </button>

            <button
              type="button"
              class="ctl-drop"
              :aria-label="`Прибрати платіж на ${formatAmount(row.amount)} ₴`"
              @click="emit('remove', row.id)"
            >
              <AppIcon name="trash" />
            </button>
          </div>
        </li>
      </TransitionGroup>
    </template>
  </div>
</template>

<style scoped>
.pays {
  container-type: inline-size;

  --cols: 116px 132px minmax(0, 1fr) 148px 128px;

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
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.add {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 38px;
  padding: 0 16px 0 12px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--ink);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  transition: background-color 0.18s var(--ease);
}

.add:hover {
  background: var(--ink-soft);
}

.add :deep(.icon) {
  width: 15px;
  height: 15px;
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
  position: relative;
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
}

.cell {
  min-width: 0;
}

.cell--num {
  text-align: right;
}

.cell--acts {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
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

.prow--cancelled {
  opacity: 0.6;
}

.note {
  display: block;
  font-size: 13px;
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

.got {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px dashed var(--line-strong);
  border-radius: 999px;
  background: transparent;
  font-size: 12px;
  font-weight: 600;
  color: var(--ink-muted);
  white-space: nowrap;
  transition:
    border-color 0.16s var(--ease),
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.got:hover {
  border-style: solid;
  border-color: var(--brand);
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.got :deep(.icon) {
  width: 13px;
  height: 13px;
}

/* Прибрати платіж — дія рідкісна: у спокої вона не тягне на себе погляд. */
.cell--acts .ctl-drop {
  opacity: 0;
  transition: opacity 0.16s var(--ease);
}

.prow:hover .cell--acts .ctl-drop,
.prow:focus-within .cell--acts .ctl-drop {
  opacity: 1;
}

/* ── Анімація рядків ───────────────────────────────────────────── */

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

@container (width < 720px) {
  .phead {
    display: none;
  }

  .prows {
    gap: 10px;
  }

  .prow {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'day  sum'
      'note note'
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

  .cell--note {
    grid-area: note;
  }

  .cell--state {
    grid-area: state;
  }

  .cell--acts {
    grid-area: acts;
  }

  .cell--acts .ctl-drop {
    opacity: 1;
  }

  .note {
    white-space: normal;
  }
}
</style>
