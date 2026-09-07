<script setup lang="ts">
import { computed, toRef } from 'vue'
import { RouterLink } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useAnimatedNumber } from '@/composables/useAnimatedNumber'
import { formatAmount } from '@/lib/amount'
import type { Kpi } from '@/lib/dashboard'

/**
 * Одна цифра власника. Стрілок «+12% до минулого тижня» тут немає навмисно:
 * історії простір ще не накопичив, і намальована динаміка була б вигадкою.
 * Замість неї — реальна пропорція у смужці та підпис, звідки цифра взялась.
 */
const props = defineProps<{ kpi: Kpi }>()

const animated = useAnimatedNumber(toRef(() => props.kpi.value))

// Копійки в підсумку простору не читаються — округляємо до гривні.
const shown = computed(() => formatAmount(Math.round(animated.value)))

/** Смужка росте синхронно з цифрою, що доїжджає до свого значення. */
const width = computed(() => {
  const meter = props.kpi.meter

  if (meter === null) {
    return '0%'
  }

  const done = props.kpi.value === 0 ? 1 : Math.min(Math.abs(animated.value / props.kpi.value), 1)

  return `${meter.share * done * 100}%`
})
</script>

<template>
  <RouterLink class="tile" :class="`tile--${kpi.tone}`" :to="{ name: kpi.to }">
    <span class="tile__glow" aria-hidden="true" />

    <span class="tile__top">
      <span class="tile__label">{{ kpi.label }}</span>

      <span class="tile__icon" aria-hidden="true">
        <AppIcon :name="kpi.icon" />
      </span>
    </span>

    <span class="tile__value">
      {{ shown }}
      <span class="tile__unit">₴</span>
    </span>

    <span v-if="kpi.meter" class="meter">
      <span class="meter__track" aria-hidden="true">
        <span class="meter__fill" :style="{ width }" />
      </span>
      <span class="meter__label">{{ kpi.meter.label }}</span>
    </span>

    <span class="tile__foot">
      <span class="tile__hint">{{ kpi.hint }}</span>

      <span class="tile__go" aria-hidden="true">
        <svg viewBox="0 0 18 18">
          <path
            d="M3.5 9h11M10 4.5 14.5 9 10 13.5"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    </span>
  </RouterLink>
</template>

<style scoped>
.tile {
  --tone: var(--ink);
  --tone-tint: var(--paper-sunk);

  position: relative;
  display: grid;
  align-content: start;
  gap: 10px;
  min-width: 0;
  padding: 22px;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
  color: var(--ink);
  text-decoration: none;
  transition:
    transform 0.24s var(--ease),
    border-color 0.24s var(--ease),
    box-shadow 0.3s var(--ease);
}

.tile:hover {
  transform: translateY(-4px);
  border-color: var(--tone);
  box-shadow: var(--shadow-md);
}

.tile--plain {
  --tone: var(--line-strong);
}

.tile--brand {
  --tone: var(--brand);
  --tone-tint: var(--brand-tint);
}

.tile--danger {
  --tone: var(--danger);
  --tone-tint: var(--danger-tint);
}

/* Світло в кольорі показника — вмикається під курсором. */
.tile__glow {
  position: absolute;
  inset: -70% -20% auto -20%;
  height: 150%;
  background: radial-gradient(circle at 78% 0, var(--tone-tint), transparent 62%);
  opacity: 0;
  transition: opacity 0.3s var(--ease);
}

.tile:hover .tile__glow {
  opacity: 1;
}

.tile__top {
  position: relative;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.tile__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.tile__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 36px;
  height: 36px;
  margin: -4px -2px 0 0;
  border-radius: 13px;
  background: var(--paper-sunk);
  color: var(--ink-faint);
  transition:
    background-color 0.24s var(--ease),
    color 0.24s var(--ease),
    transform 0.24s var(--ease);
}

.tile:hover .tile__icon {
  background: var(--tone-tint);
  color: var(--tone);
  transform: scale(1.06);
}

.tile--plain:hover .tile__icon {
  color: var(--ink);
}

.tile__icon :deep(.icon) {
  width: 19px;
  height: 19px;
}

.tile__value {
  position: relative;
  font-family: var(--font-display);
  font-size: clamp(26px, 2.4vw, 34px);
  font-weight: 600;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
  line-height: 1.05;
}

.tile--danger .tile__value {
  color: var(--danger);
}

.tile__unit {
  margin-left: 4px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  color: var(--ink-faint);
}

/* ── Смужка пропорції ──────────────────────────────────────────── */

.meter {
  position: relative;
  display: grid;
  gap: 7px;
  margin-top: 2px;
}

.meter__track {
  height: 6px;
  border-radius: 999px;
  background: var(--paper-sunk);
  overflow: hidden;
}

.meter__fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--tone);
}

.tile--plain .meter__fill {
  background: var(--ink-muted);
}

.meter__label {
  font-size: 11.5px;
  color: var(--ink-faint);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* ── Низ ───────────────────────────────────────────────────────── */

.tile__foot {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 6px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
}

.tile__hint {
  font-size: 12px;
  color: var(--ink-faint);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.tile__go {
  display: grid;
  place-items: center;
  flex: none;
  width: 28px;
  height: 28px;
  margin: -4px -4px -4px auto;
  border-radius: 50%;
  background: var(--paper-sunk);
  color: var(--ink-muted);
  opacity: 0;
  transform: translateX(-4px);
  transition:
    opacity 0.22s var(--ease),
    transform 0.22s var(--ease),
    background-color 0.22s var(--ease),
    color 0.22s var(--ease);
}

.tile:hover .tile__go,
.tile:focus-visible .tile__go {
  opacity: 1;
  transform: translateX(0);
}

.tile:hover .tile__go {
  background: var(--tone-tint);
  color: var(--tone);
}

.tile--plain:hover .tile__go {
  background: var(--ink);
  color: #fff;
}

.tile__go svg {
  width: 15px;
  height: 15px;
}

/* Без анімації стрілка не «виїжджає» — але й ховатись їй нема сенсу. */
@media (prefers-reduced-motion: reduce) {
  .tile__go {
    opacity: 1;
    transform: none;
  }
}
</style>
