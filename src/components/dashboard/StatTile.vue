<script setup lang="ts">
import { computed, toRef } from 'vue'
import SparkLine from '@/components/dashboard/SparkLine.vue'
import { useAnimatedNumber } from '@/composables/useAnimatedNumber'
import { formatDelta, formatMetric, type Metric } from '@/lib/dashboard'

const props = defineProps<{ metric: Metric }>()

const animated = useAnimatedNumber(toRef(() => props.metric.value))

const shown = computed(() => formatMetric(animated.value, props.metric.format))

/** Для прострочених задач зростання — погана новина, тож знак читаємо навпаки. */
const good = computed(() =>
  props.metric.tone === 'danger' ? props.metric.delta < 0 : props.metric.delta > 0,
)

const deltaClass = computed(() => {
  if (Math.round(props.metric.delta) === 0) {
    return 'tile__delta--flat'
  }

  return good.value ? 'tile__delta--up' : 'tile__delta--down'
})
</script>

<template>
  <article class="tile" :class="`tile--${metric.tone}`">
    <p class="tile__label">{{ metric.label }}</p>

    <p class="tile__value">
      {{ shown }}
      <span v-if="metric.format === 'money'" class="tile__unit">₴</span>
    </p>

    <p class="tile__foot">
      <span class="tile__delta" :class="deltaClass">
        <svg viewBox="0 0 10 10" aria-hidden="true">
          <path d="M5 1.6 8.4 8H1.6z" fill="currentColor" />
        </svg>
        {{ formatDelta(metric.delta) }}
      </span>
      <span class="tile__hint">{{ metric.hint }}</span>
    </p>

    <SparkLine class="tile__spark" :values="metric.trend" :tone="metric.tone" />
  </article>
</template>

<style scoped>
.tile {
  position: relative;
  display: grid;
  align-content: start;
  gap: 6px;
  min-width: 0;
  padding: 18px 18px 0;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
  transition:
    transform 0.22s var(--ease),
    border-color 0.22s var(--ease),
    box-shadow 0.28s var(--ease);
}

.tile:hover {
  transform: translateY(-3px);
  border-color: var(--line-strong);
  box-shadow: var(--shadow-md);
}

.tile__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.tile__value {
  font-family: var(--font-display);
  font-size: clamp(24px, 2.2vw, 30px);
  font-weight: 600;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
}

.tile__unit {
  margin-left: 3px;
  font-family: var(--font-body);
  font-size: 13px;
  font-weight: 600;
  color: var(--ink-faint);
}

.tile__foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--ink-faint);
}

.tile__delta {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.tile__delta svg {
  width: 8px;
  height: 8px;
}

.tile__delta--up {
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.tile__delta--down {
  background: var(--danger-tint);
  color: var(--danger);
}

/* Стрілка вниз — той самий трикутник, перевернутий. */
.tile__delta--down svg {
  transform: rotate(180deg);
}

.tile__delta--flat {
  background: var(--paper-sunk);
  color: var(--ink-muted);
}

.tile__delta--flat svg {
  display: none;
}

.tile__hint {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* Спарклайн приклеєний до низу плитки — це підкладка, а не окремий блок. */
.tile__spark {
  margin: 0 -18px;
}
</style>
