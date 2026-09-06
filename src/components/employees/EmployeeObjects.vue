<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import StatusBadge from '@/components/objects/StatusBadge.vue'
import { formatAmount } from '@/lib/amount'
import { groupByObject, type PayrollCharge } from '@/lib/payroll'
import { formatWorks } from '@/lib/services'

/**
 * Де людина задіяна. Це не нова сутність, а той самий склад бригади, тільки з
 * іншого боку: не «хто на цій роботі», а «на яких роботах ця людина».
 *
 * Один обʼєкт — одна картка: три роботи на одній будові це одне місце роботи,
 * а не три різні. Картка ціла веде в обʼєкт, бо саме туди йдуть далі — щось
 * поправити в роботі можна лише там.
 *
 * У рядку роботи головне не сума (вона на вкладці «Фінанси»), а частка: 50 із
 * 120 м³ — це і є задіювання людини, і смуга під рядком показує його одразу,
 * без ділення в голові.
 */

const props = defineProps<{ charges: PayrollCharge[] }>()

const groups = computed(() => groupByObject(props.charges))

function percent(share: number): number {
  return Math.round(share * 100)
}
</script>

<template>
  <section class="eobj">
    <p v-if="groups.length === 0" class="empty">
      Людину ще не ставили на жодну роботу. Щойно її додадуть у бригаду на вкладці «Роботи»
      будь-якого обʼєкта, тут зʼявиться і обʼєкт, і обсяг, і статус.
    </p>

    <article
      v-for="group in groups"
      :key="group.objectId"
      class="site"
      :class="{ 'site--off': group.archived }"
    >
      <header class="site__head">
        <div class="site__intro">
          <h2 class="site__title">
            <RouterLink class="site__link" :to="{ name: 'object', params: { id: group.objectId } }">
              {{ group.objectName }}
            </RouterLink>
          </h2>

          <p class="site__where">{{ group.address }}</p>
        </div>

        <div class="site__marks">
          <span v-if="group.archived" class="tag">Архів</span>
          <StatusBadge v-else :status="group.status.value" :label="group.status.label" />
        </div>
      </header>

      <ul class="works">
        <li v-for="row in group.rows" :key="row.id" class="work">
          <span class="work__dot" :class="`work__dot--${row.status.value}`" aria-hidden="true" />

          <p class="work__name">{{ row.serviceName }}</p>

          <p class="work__vol">
            {{ formatAmount(row.volume) }}
            <span class="work__of">з {{ formatAmount(row.serviceVolume) }} {{ row.unit }}</span>
          </p>

          <p class="work__state">{{ row.status.label }}</p>

          <p class="work__share">{{ percent(row.share) }}% обсягу</p>

          <span class="bar">
            <span
              class="bar__fill"
              :class="`bar__fill--${row.status.value}`"
              :style="{ width: `${percent(row.share)}%` }"
            />
          </span>
        </li>
      </ul>

      <footer class="site__foot">
        <p class="site__works">
          {{ formatWorks(group.rows.length) }}
          <template v-if="group.done > 0">· {{ group.done }} закрито</template>
        </p>

        <p class="site__sum">
          Нараховано <strong>{{ formatAmount(group.amount) }} ₴</strong>
        </p>
      </footer>
    </article>
  </section>
</template>

<style scoped>
/* Картки стають у два стовпці, щойно місця вистачає: у людини їх буває
   з десяток, і одна колонка перетворює вкладку на довгу стрічку. */
.eobj {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  align-items: start;
  gap: 12px;
}

.empty {
  grid-column: 1 / -1;
  padding: 24px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-lg);
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--ink-muted);
}

.site {
  position: relative;
  display: grid;
  align-content: start;
  gap: 12px;
  padding: 18px 20px 14px;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
  transition:
    border-color 0.18s var(--ease),
    box-shadow 0.22s var(--ease);
}

.site:hover {
  border-color: var(--line-strong);
  box-shadow: var(--shadow-sm);
}

/* Архівний обʼєкт — історія: він не має важити стільки ж, скільки живий. */
.site--off {
  background: transparent;
}

.site__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px 14px;
}

.site__intro {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.site__title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.site__link {
  color: inherit;
  text-decoration: none;
}

/* Клікабельна вся картка, але посилання лишається одне — на назві. */
.site__link::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

.site__link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.site__where {
  font-size: 12.5px;
  color: var(--ink-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.site__marks {
  flex: none;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--ink-faint);
}

/* ── Роботи ────────────────────────────────────────────────────── */

.works {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/*
 * Рядок роботи: крапка стадії, назва, обсяг людини з загального. Під ними —
 * підпис стадії, частка й смуга на всю ширину рядка.
 */
.work {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas:
    'dot name vol'
    'dot state share'
    'bar bar  bar';
  align-items: center;
  gap: 2px 10px;
  padding: 9px 0;
}

.work + .work {
  border-top: 1px solid var(--line);
}

.work__dot {
  grid-area: dot;
  align-self: start;
  width: 7px;
  height: 7px;
  margin-top: 6px;
  border-radius: 50%;
  background: var(--ink-faint);
}

.work__dot--in_progress {
  background: var(--amber);
}

.work__dot--done {
  background: var(--brand);
}

.work__name {
  grid-area: name;
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.work__vol {
  grid-area: vol;
  text-align: right;
  font-size: 13.5px;
  font-weight: 600;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

/* «з 120 м³» — загальний обсяг роботи: він тихіший за обсяг людини. */
.work__of {
  font-weight: 500;
  color: var(--ink-faint);
}

.work__state {
  grid-area: state;
  font-size: 11.5px;
  color: var(--ink-faint);
}

.work__share {
  grid-area: share;
  text-align: right;
  font-size: 11.5px;
  color: var(--ink-faint);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.bar {
  grid-area: bar;
  overflow: hidden;
  height: 3px;
  margin-top: 8px;
  border-radius: 999px;
  background: var(--paper-sunk);
}

.bar__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--ink-faint);
  transition: width 0.3s var(--ease);
}

.bar__fill--in_progress {
  background: var(--amber);
}

.bar__fill--done {
  background: var(--brand);
}

/* ── Підсумок картки ───────────────────────────────────────────── */

.site__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 4px 14px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
  font-size: 12px;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.site__sum strong {
  font-size: 13px;
  color: var(--ink);
}
</style>
