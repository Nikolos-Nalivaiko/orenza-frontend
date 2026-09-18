<script setup lang="ts">
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import type { Kpi } from '@/lib/dashboard'

defineProps<{ kpis: Kpi[] }>()
</script>

<template>
  <section class="strip" :style="{ '--n': kpis.length }" aria-label="Головні показники">
    <RouterLink
      v-for="kpi in kpis"
      :key="kpi.key"
      class="cell"
      :class="`cell--${kpi.tone}`"
      :to="{ name: kpi.to }"
      :title="kpi.hint"
    >
      <span class="cell__label">
        <AppIcon :name="kpi.icon" class="cell__icon" />
        {{ kpi.label }}
      </span>

      <span class="cell__value">
        {{ formatAmount(Math.round(kpi.value)) }}<span class="cell__unit">₴</span>
      </span>

      <span class="cell__meter" aria-hidden="true">
        <span
          class="cell__fill"
          :style="{ width: `${Math.min(Math.max(kpi.meter?.share ?? 0, 0), 1) * 100}%` }"
        />
      </span>

      <span class="cell__caption">{{ kpi.meter?.label ?? kpi.hint }}</span>
    </RouterLink>
  </section>
</template>

<style scoped>
.strip {
  display: grid;
  grid-template-columns: repeat(var(--n), minmax(0, 1fr));
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-raised);
}

.cell {
  --tone: var(--ink-muted);

  display: grid;
  align-content: start;
  gap: 8px;
  min-width: 0;
  padding: 16px 18px;
  color: var(--ink);
  text-decoration: none;
  transition: background-color 0.16s var(--ease);
}

.cell + .cell {
  border-left: 1px solid var(--line);
}

.cell:hover {
  background: var(--paper);
}

.cell--brand {
  --tone: var(--brand-strong);
}

.cell--danger {
  --tone: var(--danger);
}

.cell__label {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--ink-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.cell__icon {
  flex: none;
  width: 15px;
  height: 15px;
  color: var(--ink-faint);
}

.cell__value {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.15;
  white-space: nowrap;
}

.cell--danger .cell__value {
  color: var(--danger);
}

.cell__unit {
  margin-left: 4px;
  font-size: 14px;
  font-weight: 500;
  color: var(--ink-faint);
}

.cell__meter {
  height: 3px;
  border-radius: 999px;
  background: var(--paper-sunk);
  overflow: hidden;
}

.cell__fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--tone);
  transition: width 0.6s var(--ease);
}

.cell__caption {
  font-size: 12px;
  color: var(--ink-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

@media (width <= 1180px) {
  .strip {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .cell:nth-child(3n + 1) {
    border-left: 0;
  }

  .cell:nth-child(n + 4) {
    border-top: 1px solid var(--line);
  }
}

@media (width <= 640px) {
  .strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cell:nth-child(n) {
    border-left: 0;
    border-top: 0;
  }

  .cell:nth-child(2n) {
    border-left: 1px solid var(--line);
  }

  .cell:nth-child(n + 3) {
    border-top: 1px solid var(--line);
  }

  .cell:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }
}
</style>
