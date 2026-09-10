<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatMomentDay } from '@/lib/activity'
import { formatAmount } from '@/lib/amount'
import { formatActive } from '@/lib/clients'
import type { ClientRow } from '@/lib/clientList'
import { formatPhone } from '@/lib/phone'

defineProps<{ rows: ClientRow[]; today: string }>()

const emit = defineEmits<{ remove: [row: ClientRow] }>()
</script>

<template>
  <div class="ctable">
    <div class="chead" aria-hidden="true">
      <span>Замовник</span>
      <span>Телефон</span>
      <span>Обʼєкти</span>
      <span class="chead__num">До сплати</span>
      <span class="chead__num">Знижка</span>
      <span>Активність</span>
      <span></span>
    </div>

    <ul class="crows">
      <li v-for="{ client, totals, regular, last } in rows" :key="client.id" class="crow">
        <div class="cell cell--name">
          <p class="crow__title">
            <RouterLink class="crow__link" :to="{ name: 'client', params: { id: client.id } }">
              {{ client.name }}
            </RouterLink>

            <span v-if="regular" class="mark" title="Більше одного обʼєкта за весь час">
              <AppIcon name="spark" />
              Постійний
            </span>
          </p>

          <p v-if="client.type.value === 'company'" class="crow__contact">
            {{ client.contact || 'контактну особу не вказано' }}
          </p>
        </div>

        <div class="cell" data-label="Телефон">
          <a v-if="client.phone" class="crow__phone" :href="`tel:${client.phone}`">
            {{ formatPhone(client.phone) }}
          </a>
          <p v-else class="crow__value crow__value--none">—</p>
        </div>

        <div class="cell" data-label="Обʼєкти">
          <p class="crow__value">{{ totals.objects }}</p>
          <p class="crow__sub">
            <template v-if="totals.active > 0">{{ formatActive(totals.active) }}</template>
            <template v-else-if="totals.objects > 0">без активних</template>
            <template v-else>ще жодного</template>
          </p>
        </div>

        <div class="cell cell--num" data-label="До сплати">
          <p
            class="crow__value crow__value--money"
            :class="{ 'is-late': totals.overdue > 0, 'is-clear': totals.due < 0.01 }"
          >
            <template v-if="totals.due < -0.01"> +{{ formatAmount(-totals.due) }} </template>
            <template v-else>{{ formatAmount(Math.max(0, totals.due)) }}</template>
            <span class="cur">₴</span>
          </p>

          <p class="crow__sub" :class="{ 'is-late': totals.overdue > 0 }">
            <template v-if="totals.overdue > 0">
              прострочено {{ formatAmount(totals.overdue) }} ₴
            </template>
            <template v-else-if="totals.due < -0.01">переплата</template>
            <template v-else-if="totals.due < 0.01 && totals.client > 0">усе оплачено</template>
            <template v-else-if="totals.pending > 0">
              чекаємо {{ formatAmount(totals.pending) }} ₴
            </template>
          </p>
        </div>

        <div class="cell cell--num" data-label="Знижка">
          <p v-if="client.discount > 0" class="crow__value">−{{ client.discount }}%</p>
          <p v-else class="crow__value crow__value--none">—</p>
        </div>

        <div class="cell" data-label="Активність">
          <p class="crow__value" :class="{ 'crow__value--none': last === null }">
            {{ last ? formatMomentDay(last.at, today) : '—' }}
          </p>
          <p class="crow__sub">{{ last ? last.text : 'руху ще не було' }}</p>
        </div>

        <div class="cell cell--drop">
          <button
            type="button"
            class="ctl-drop"
            :aria-label="`Видалити замовника «${client.name}»`"
            @click="emit('remove', { client, totals, regular, last })"
          >
            <AppIcon name="trash" />
          </button>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.ctable {
  container-type: inline-size;

  --cols: minmax(180px, 1fr) 152px 96px 152px 88px 150px 28px;
  --row-line: 20px;
  --col-gap: 24px;

  display: grid;
  gap: 6px;
}

.chead {
  display: grid;
  grid-template-columns: var(--cols);
  gap: var(--col-gap);
  padding: 0 14px 8px;
  border-bottom: 1px solid var(--line);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--ink-faint);
}

.chead__num {
  text-align: right;
}

.crows {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.crow {
  position: relative;
  display: grid;
  grid-template-columns: var(--cols);
  align-items: stretch;
  gap: var(--col-gap);
  padding: 11px 14px 12px;
  border: 1px solid transparent;
  border-radius: var(--r-md);
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease);
}

.crow:hover {
  border-color: var(--line);
  background: var(--paper-raised);
}

/*
 * Клітинка з одним рядком стоїть по центру рядка, з двома — заповнює його
 * повністю. Так імʼя без контактної особи не висить угорі.
 */
.cell {
  display: grid;
  align-content: center;
  gap: 2px;
  min-width: 0;
}

.cell--num {
  justify-items: end;
  text-align: right;
}

.cell--drop {
  position: relative;
  z-index: 1;
  justify-items: center;
}

.cell--drop .ctl-drop {
  opacity: 0;
  transition:
    opacity 0.16s var(--ease),
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.crow:hover .ctl-drop,
.cell--drop .ctl-drop:focus-visible {
  opacity: 1;
}

@media (hover: none) {
  .cell--drop .ctl-drop {
    opacity: 1;
  }
}

.crow__title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  height: var(--row-line);
}

.crow__link {
  font-size: 14px;
  font-weight: 600;
  line-height: var(--row-line);
  letter-spacing: -0.01em;
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.crow__link::after {
  /* Клікабельний увесь рядок, але посилання лишається одне — на імені. */
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

.crow__link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

/* Мітка постійного — факт, а не нагорода: тихий контур і значок кольором. */
.mark {
  display: inline-flex;
  align-items: center;
  flex: none;
  gap: 5px;
  padding: 2px 8px 2px 6px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--ink-muted);
}

.mark :deep(.icon) {
  width: 11px;
  height: 11px;
  color: var(--brand-strong);
}

.crow__contact {
  font-size: 12.5px;
  line-height: 16px;
  color: var(--ink-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Телефон лежить над накладкою рядка: інакше в нього не влучити. */
.crow__phone {
  position: relative;
  z-index: 1;
  justify-self: start;
  font-size: 13px;
  font-weight: 600;
  line-height: var(--row-line);
  color: var(--ink);
  text-decoration: none;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.crow__phone:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.crow__value {
  font-size: 13px;
  font-weight: 600;
  line-height: var(--row-line);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.crow__value--money {
  font-size: 14px;
  letter-spacing: -0.015em;
}

/* Порожня клітинка тримає той самий рядок, що й заповнена. */
.crow__value--none {
  font-weight: 500;
  color: var(--ink-faint);
}

/* Нуль боргу — не подія: він не має важити стільки ж, скільки сума. */
.crow__value.is-clear {
  font-weight: 500;
  color: var(--ink-faint);
}

.cur {
  font-weight: 500;
  color: var(--ink-faint);
}

.crow__sub {
  font-size: 11.5px;
  line-height: 16px;
  color: var(--ink-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.is-late {
  color: var(--danger);
}

/* Вузько — рядок розгортається в картку: шапки таблиці там немає. */
@container (width < 980px) {
  .chead {
    display: none;
  }

  .crows {
    gap: 10px;
  }

  /* У картці колонки стоять одна під одною — широкий крок їй ні до чого. */
  .crow {
    grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
    align-items: start;
    gap: 14px;
    border-color: var(--line);
    background: var(--paper-raised);
  }

  .cell {
    align-content: start;
  }

  .cell--name {
    grid-column: 1 / -1;
  }

  .cell--num {
    justify-items: start;
    text-align: left;
  }

  .cell--drop {
    position: absolute;
    top: 6px;
    right: 6px;
  }

  .cell--name {
    padding-right: 36px;
  }

  .cell--drop .ctl-drop {
    opacity: 1;
  }

  .cell:not(.cell--name, .cell--drop)::before {
    content: attr(data-label);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }
}
</style>
