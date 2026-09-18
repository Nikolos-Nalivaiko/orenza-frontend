<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import PanelCard from '@/components/dashboard/PanelCard.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import { formatDays } from '@/lib/objects'
import {
  agingBucket,
  formatPercent,
  type AgingBucket,
  type Receivables,
} from '@/lib/workspaceFinance'

const props = defineProps<{ data: Receivables }>()

const LIMIT = 5

const focus = ref<AgingBucket | null>(null)

const groups = computed(() =>
  props.data.groups.map((group) => ({
    ...group,
    share: props.data.scheduled === 0 ? 0 : group.amount / props.data.scheduled,
  })),
)

const debtors = computed(() =>
  props.data.debtors
    .filter((item) => focus.value === null || agingBucket(item.daysLate) === focus.value)
    .slice(0, LIMIT),
)

const lateGroups = computed(() => groups.value.filter((group) => group.bucket !== 'current'))

function toggle(bucket: AgingBucket): void {
  focus.value = focus.value === bucket ? null : bucket
}
</script>

<template>
  <PanelCard title="Борги замовників" hint="заплановані платежі, яких ще не отримали">
    <div class="ar">
      <div class="ar__head">
        <p class="ar__total">{{ formatAmount(data.scheduled) }}<span>₴</span></p>
        <p v-if="data.overdue > 0" class="ar__late">
          <AppIcon name="alert" />
          {{ formatAmount(data.overdue) }} ₴ прострочено
        </p>
      </div>

      <div v-if="data.scheduled > 0" class="stack" role="presentation">
        <span
          v-for="group in groups"
          v-show="group.amount > 0"
          :key="group.bucket"
          class="stack__seg"
          :class="[`is-${group.bucket}`, { 'is-dim': focus !== null && focus !== group.bucket }]"
          :style="{ flexGrow: group.share }"
        />
      </div>

      <ul class="legend">
        <li v-for="group in groups" :key="group.bucket">
          <button
            type="button"
            class="legend__row"
            :class="{
              'legend__row--on': focus === group.bucket,
              'legend__row--dim': focus !== null && focus !== group.bucket,
            }"
            :aria-pressed="focus === group.bucket"
            :disabled="group.amount === 0 || group.bucket === 'current'"
            @click="toggle(group.bucket)"
          >
            <span class="sw" :class="`is-${group.bucket}`" aria-hidden="true" />
            <span class="legend__label">{{ group.label }}</span>
            <span class="legend__count">{{ group.count }}</span>
            <span class="legend__sum">{{ formatAmount(group.amount) }} ₴</span>
            <span class="legend__share">{{ formatPercent(group.share) }}</span>
          </button>
        </li>
      </ul>

      <p v-if="data.unscheduled > 0" class="unsched">
        Ще <strong>{{ formatAmount(Math.round(data.unscheduled)) }} ₴</strong> залишку по обʼєктах
        без запланованих платежів
      </p>

      <div v-if="lateGroups.some((group) => group.amount > 0)" class="debt">
        <p class="debt__title">
          {{
            focus === null
              ? 'Прострочені платежі'
              : groups.find((group) => group.bucket === focus)?.label
          }}
        </p>

        <ul class="debt__list">
          <li v-for="item in debtors" :key="item.payment.id">
            <RouterLink class="debt__row" :to="{ name: 'object', params: { id: item.object.id } }">
              <span class="debt__ident">
                <span class="debt__who">{{ item.object.client ?? item.object.name }}</span>
                <span class="debt__what">{{ item.object.name }} · {{ item.payment.name }}</span>
              </span>
              <span class="debt__side">
                <strong>{{ formatAmount(item.payment.amount) }} ₴</strong>
                <span class="badge" :class="`is-${agingBucket(item.daysLate)}`">
                  {{ formatDays(item.daysLate) }} прострочки
                </span>
              </span>
            </RouterLink>
          </li>
        </ul>
      </div>

      <p v-else-if="data.scheduled > 0" class="debt__empty">
        Прострочених платежів немає — усе в строк.
      </p>
    </div>
  </PanelCard>
</template>

<style scoped>
.ar {
  --a-current: var(--ink-faint);
  --a-late30: var(--amber);
  --a-late60: #e0612b;
  --a-late90: var(--danger);

  display: grid;
  gap: 14px;
}

.ar__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
}

.ar__total {
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.04em;
  white-space: nowrap;
}

.ar__total span {
  margin-left: 5px;
  font-family: var(--font-body);
  font-size: 13px;
  color: var(--ink-faint);
}

.ar__late {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-radius: 999px;
  background: var(--danger-tint);
  color: var(--danger);
  font-size: 12px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.ar__late :deep(.icon) {
  width: 14px;
  height: 14px;
}

.stack {
  display: flex;
  gap: 2px;
  height: 12px;
}

.stack__seg {
  flex-basis: 0;
  min-width: 6px;
  border-radius: 3px;
  cursor: default;
  transition:
    opacity 0.18s var(--ease),
    flex-grow 0.5s var(--ease);
}

.stack__seg:first-child {
  border-top-left-radius: 999px;
  border-bottom-left-radius: 999px;
}

.stack__seg:last-child {
  border-top-right-radius: 999px;
  border-bottom-right-radius: 999px;
}

.stack__seg.is-dim {
  opacity: 0.25;
}

.is-current {
  --fill: var(--a-current);
}

.is-late30 {
  --fill: var(--a-late30);
}

.is-late60 {
  --fill: var(--a-late60);
}

.is-late90 {
  --fill: var(--a-late90);
}

.stack__seg,
.sw {
  background: var(--fill);
}

.legend {
  display: grid;
  gap: 1px;
  margin: 0 -8px;
  padding: 0;
  list-style: none;
}

.legend__row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto 44px;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 8px;
  border: 0;
  border-radius: var(--r-xs);
  background: transparent;
  text-align: left;
  font-variant-numeric: tabular-nums;
  transition:
    background-color 0.16s var(--ease),
    opacity 0.16s var(--ease);
}

.legend__row:hover:not(:disabled),
.legend__row--on {
  background: var(--paper-sunk);
}

.legend__row:disabled {
  cursor: default;
  opacity: 0.5;
}

.legend__row--dim {
  opacity: 0.55;
}

.sw {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.legend__label {
  font-size: 13px;
  font-weight: 600;
}

.legend__count {
  min-width: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 11px;
  text-align: center;
  color: var(--ink-muted);
}

.legend__row--on .legend__count {
  background: var(--paper-raised);
}

.legend__sum {
  font-size: 13px;
  font-weight: 600;
  text-align: right;
}

.legend__share {
  font-size: 12px;
  text-align: right;
  color: var(--ink-faint);
}

.debt {
  display: grid;
  gap: 6px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.debt__title {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.debt__list {
  display: grid;
  gap: 2px;
  margin: 0 -8px;
  padding: 0;
  list-style: none;
}

.debt__row {
  color: inherit;
  text-decoration: none;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px;
  border: 0;
  border-radius: var(--r-xs);
  background: transparent;
  text-align: left;
  transition: background-color 0.16s var(--ease);
}

.debt__row:hover {
  background: var(--paper-sunk);
}

.debt__ident {
  display: grid;
  min-width: 0;
}

.debt__who {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.debt__what {
  font-size: 12px;
  color: var(--ink-faint);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.debt__side {
  display: grid;
  justify-items: end;
  gap: 3px;
  font-variant-numeric: tabular-nums;
}

.debt__side strong {
  font-size: 13px;
}

.badge {
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  white-space: nowrap;
  background: color-mix(in srgb, var(--fill) 14%, transparent);
  color: color-mix(in srgb, var(--fill) 80%, var(--ink));
}

.badge.is-current {
  background: var(--paper-sunk);
  color: var(--ink-muted);
}

.unsched {
  padding: 10px 12px;
  border-radius: var(--r-sm);
  background: var(--paper-sunk);
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--ink-muted);
}

.unsched strong {
  color: var(--ink);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.debt__empty {
  font-size: 13px;
  color: var(--ink-muted);
}
</style>
