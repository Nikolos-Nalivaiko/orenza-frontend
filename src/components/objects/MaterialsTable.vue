<script setup lang="ts">
import { computed } from 'vue'
import MaterialStatusMenu from '@/components/objects/MaterialStatusMenu.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import {
  materialClientTotal,
  materialCostTotal,
  materialLineProfit,
  type Material,
  type MaterialStatus,
} from '@/lib/materials'

/**
 * Матеріали — таблиця, а не картки: їх на обʼєкті буває півсотні, і дивляться
 * на них порівнюючи, рядок за рядком. У колонках грошей стоїть сума рядка, бо
 * саме вона складається в цифри зведення; ціна за одиницю йде підписом.
 */

const props = defineProps<{ rows: Material[]; selected: number[] }>()

const emit = defineEmits<{
  pick: [id: number, on: boolean]
  all: [on: boolean]
  status: [id: number, status: MaterialStatus]
  approve: [id: number, on: boolean]
  remove: [id: number]
}>()

const allPicked = computed(
  () => props.rows.length > 0 && props.rows.every((row) => props.selected.includes(row.id)),
)

/** Частина рядків обрана — головний чекбокс стає проміжним. */
const somePicked = computed(() => props.selected.length > 0 && !allPicked.value)

function unitPrice(price: number | null): string {
  return price === null || price === 0 ? '' : `${formatAmount(price)} ₴ / од.`
}
</script>

<template>
  <div class="mtable">
    <div class="mhead">
      <label class="tick tick--head">
        <input
          type="checkbox"
          class="tick__input"
          :checked="allPicked"
          :indeterminate="somePicked"
          aria-label="Обрати всі показані позиції"
          @change="emit('all', !allPicked)"
        />
        <span class="tick__box" aria-hidden="true">
          <AppIcon :name="somePicked ? 'menu' : 'check'" />
        </span>
      </label>

      <span>Назва</span>
      <span class="mhead__num">Кількість</span>
      <span>Купує</span>
      <span class="mhead__num">Клієнту</span>
      <span class="mhead__num">Собівартість</span>
      <span class="mhead__apart">Статус</span>
      <span>Погоджено</span>
      <span />
    </div>

    <TransitionGroup tag="ul" name="rows" class="mrows">
      <li
        v-for="row in rows"
        :key="row.id"
        class="mrow"
        :class="{
          'mrow--picked': selected.includes(row.id),
          'mrow--client': row.buyer.value === 'client',
        }"
      >
        <label class="tick">
          <input
            type="checkbox"
            class="tick__input"
            :checked="selected.includes(row.id)"
            :aria-label="`Обрати «${row.name}»`"
            @change="emit('pick', row.id, !selected.includes(row.id))"
          />
          <span class="tick__box" aria-hidden="true"><AppIcon name="check" /></span>
        </label>

        <div class="cell cell--name">
          <p class="name">{{ row.name }}</p>
        </div>

        <!-- Кількість і одиниця — одна величина, тож і колонка одна. -->
        <div class="cell cell--num cell--qty" data-label="Кількість">
          <p class="num">
            {{ formatAmount(row.quantity) }} <span class="unit">{{ row.unit }}</span>
          </p>
        </div>

        <div class="cell cell--buyer" data-label="Купує">
          <p class="buyer">{{ row.buyer.label }}</p>
        </div>

        <!-- Купує замовник — грошей ми не рухаємо, тож обидві суми прочерком:
             нуль тут читався б як «безкоштовно». -->
        <div class="cell cell--num cell--client" data-label="Клієнту">
          <template v-if="materialClientTotal(row) !== null">
            <p class="num">{{ formatAmount(materialClientTotal(row) ?? 0) }} ₴</p>
            <p v-if="unitPrice(row.client_price)" class="per">{{ unitPrice(row.client_price) }}</p>
          </template>
          <p v-else class="dash" title="Купує замовник — наших грошей тут немає">—</p>
        </div>

        <div class="cell cell--num cell--cost" data-label="Собівартість">
          <template v-if="materialCostTotal(row) !== null">
            <p class="num">{{ formatAmount(materialCostTotal(row) ?? 0) }} ₴</p>
            <p
              v-if="materialLineProfit(row)"
              class="per per--profit"
              :class="{ 'per--minus': (materialLineProfit(row) ?? 0) < 0 }"
            >
              {{ (materialLineProfit(row) ?? 0) > 0 ? '+' : '−'
              }}{{ formatAmount(Math.abs(materialLineProfit(row) ?? 0)) }} ₴
            </p>
          </template>
          <p v-else class="dash">—</p>
        </div>

        <div class="cell cell--status cell--apart" data-label="Статус">
          <MaterialStatusMenu
            :status="row.status.value"
            :label="row.status.label"
            :name="row.name"
            @change="emit('status', row.id, $event)"
          />
        </div>

        <div class="cell cell--ok" data-label="Погоджено">
          <label class="tick tick--ok">
            <input
              type="checkbox"
              class="tick__input"
              :checked="row.approved_by_client"
              :aria-label="`Погоджено замовником: «${row.name}»`"
              @change="emit('approve', row.id, !row.approved_by_client)"
            />
            <span class="tick__box" aria-hidden="true"><AppIcon name="check" /></span>
            <span class="tick__text">Погоджено замовником</span>
          </label>
        </div>

        <div class="cell cell--drop">
          <button
            type="button"
            class="ctl-drop"
            :aria-label="`Прибрати «${row.name}»`"
            @click="emit('remove', row.id)"
          >
            <AppIcon name="trash" />
          </button>
        </div>
      </li>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.mtable {
  /* Ширина таблиці залежить від колонки, а не від вікна: бічну панель можна
     згорнути, і рядок тоді ще довго лишається рядком. */
  container-type: inline-size;

  --cols: 28px minmax(140px, 2.4fr) 112px 100px 120px 128px 150px 76px 28px;

  /* Колонки стоять на відстані: підписи в шапці короткі й без роздільників,
     тісний проміжок злипав би їх в одне слово. */
  --col-gap: 26px;

  display: grid;
  gap: 10px;
}

.mhead {
  display: grid;
  grid-template-columns: var(--cols);
  align-items: center;
  gap: var(--col-gap);
  padding: 0 18px 14px;
  border-bottom: 1px solid var(--line);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--ink-faint);
}

.mhead__num {
  text-align: right;
}

/* Собівартість тулиться праворуч, статус — ліворуч: без цього відступу вони
   читаються як один підпис. */
.mhead__apart,
.cell--apart {
  padding-left: 14px;
}

.mrows {
  position: relative;
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.mrow {
  display: grid;
  grid-template-columns: var(--cols);
  align-items: center;
  gap: var(--col-gap);
  padding: 15px 18px;
  border: 1px solid transparent;
  border-radius: var(--r-md);
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease);
}

.mrow:hover {
  border-color: var(--line);
  background: var(--paper);
}

.mrow--picked {
  border-color: var(--brand);
  background: var(--brand-tint);
}

.cell {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.cell--num {
  justify-items: end;
  text-align: right;
}

.name {
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.num {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.per {
  font-size: 11px;
  color: var(--ink-faint);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.per--profit {
  font-weight: 600;
  color: var(--brand-strong);
}

.per--minus {
  color: var(--danger);
}

.buyer {
  font-size: 12.5px;
  color: var(--ink-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Одиниця виміру — підпис при числі, а не окрема величина. */
.unit {
  font-size: 12px;
  font-weight: 500;
  color: var(--ink-muted);
}

/* Позиція замовника проходить повз наші гроші — рядок тримається тихіше. */
.mrow--client .buyer {
  color: var(--ink-faint);
  font-style: italic;
}

.dash {
  font-size: 13px;
  color: var(--ink-faint);
}

/* ── Чекбокси ──────────────────────────────────────────────────── */

.tick {
  display: inline-grid;
  place-items: center;
  cursor: pointer;
}

.tick--ok {
  justify-self: center;
}

.tick__input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.tick__box {
  display: grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border: 1px solid var(--line-strong);
  border-radius: 6px;
  background: var(--paper-raised);
  color: transparent;
  transition:
    background-color 0.16s var(--ease),
    border-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.tick__box :deep(.icon) {
  width: 12px;
  height: 12px;
}

.tick__input:checked + .tick__box,
.tick__input:indeterminate + .tick__box {
  border-color: var(--brand);
  background: var(--brand);
  color: #08210a;
}

.tick__input:focus-visible + .tick__box {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}

/* Підпис потрібен лише у вузькій розкладці — там немає шапки таблиці. */
.tick__text {
  display: none;
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

/* Вузько — рядок розгортається в картку: підписи колонок беруться з
   data-label, бо шапки таблиці там немає. */
@container (width < 1160px) {
  .mhead {
    display: none;
  }

  .mrows {
    gap: 12px;
  }

  /* Розкладка задана поіменно: у картці порядок читання інший, ніж порядок
     колонок у таблиці, а автопотік сітки такого не вміє. */
  .mrow {
    grid-template-columns: auto repeat(3, minmax(0, 1fr));
    grid-template-areas:
      'tick name name  drop'
      'rail qty  buyer buyer'
      'rail cli  cost  cost'
      'rail stat stat stat'
      'rail ok   ok   ok';
    align-items: start;
    gap: 14px 16px;
    padding: 18px;
    border-color: var(--line);
    background: var(--paper-raised);
  }

  .mrow > .tick {
    grid-area: tick;
  }

  .cell--name {
    grid-area: name;
  }

  .cell--qty {
    grid-area: qty;
  }

  .cell--buyer {
    grid-area: buyer;
  }

  .cell--client {
    grid-area: cli;
  }

  .cell--cost {
    grid-area: cost;
  }

  .cell--status {
    grid-area: stat;
  }

  /* У картці колонок немає — розсувати нема чого. */
  .cell--apart {
    padding-left: 0;
  }

  .cell--ok {
    grid-area: ok;
  }

  .cell--drop {
    grid-area: drop;
    justify-items: end;
  }

  .cell::before {
    content: attr(data-label);
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }

  .cell--name::before,
  .cell--ok::before,
  .cell--drop::before {
    content: none;
  }

  .cell--num {
    justify-items: start;
    text-align: left;
  }

  .cell--status :deep(.pick__btn) {
    width: auto;
  }

  .tick--ok {
    grid-auto-flow: column;
    justify-self: start;
    justify-content: start;
    gap: 10px;
  }

  .tick__text {
    display: inline;
    font-size: 13px;
    color: var(--ink-muted);
  }

  .name {
    font-size: 14.5px;
    white-space: normal;
  }
}
</style>
