<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ values: number[]; tone?: 'brand' | 'ink' | 'danger' }>(), {
  tone: 'brand',
})

const W = 100
const H = 30

/** Спарклайн без осей: він показує форму, а не значення — цифра поруч. */
const points = computed(() => {
  const values = props.values

  if (values.length < 2) {
    return []
  }

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  return values.map((value, index) => ({
    x: (index / (values.length - 1)) * W,
    y: H - 2 - ((value - min) / span) * (H - 4),
  }))
})

const line = computed(() =>
  points.value.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '),
)

const area = computed(() => {
  const list = points.value

  if (list.length === 0) {
    return ''
  }

  const first = list[0]!
  const last = list[list.length - 1]!

  return `M${first.x},${first.y} ${list
    .slice(1)
    .map((p) => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ')} L${last.x},${H} L${first.x},${H} Z`
})
</script>

<template>
  <svg
    class="spark"
    :class="`spark--${tone}`"
    :viewBox="`0 0 ${W} ${H}`"
    preserveAspectRatio="none"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="area" class="spark__area" />
    <polyline :points="line" class="spark__line" />
  </svg>
</template>

<style scoped>
.spark {
  width: 100%;
  height: 30px;
  overflow: visible;
}

.spark--brand {
  color: var(--c-1);
}

.spark--ink {
  color: var(--ink-muted);
}

.spark--danger {
  color: var(--danger);
}

.spark__area {
  fill: currentcolor;
  opacity: 0.1;
}

.spark__line {
  fill: none;
  stroke: currentcolor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  /* viewBox розтягнутий по X — інакше товщина лінії поїхала б разом із ним. */
  vector-effect: non-scaling-stroke;
}
</style>
