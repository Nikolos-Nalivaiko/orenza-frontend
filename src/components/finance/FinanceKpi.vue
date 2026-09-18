<script setup lang="ts">
import { computed, toRef } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import type { IconName } from '@/components/ui/icons'
import { useAnimatedNumber } from '@/composables/useAnimatedNumber'
import { formatAmount } from '@/lib/amount'

const props = withDefaults(
  defineProps<{
    label: string
    value: number
    icon: IconName
    hint: string
    tone?: 'plain' | 'brand' | 'danger'
    meter?: { share: number; label: string } | null
  }>(),
  { tone: 'plain', meter: null },
)

const animated = useAnimatedNumber(toRef(() => props.value))

const shown = computed(() => formatAmount(Math.round(animated.value)))

const width = computed(() => `${Math.min(Math.max(props.meter?.share ?? 0, 0), 1) * 100}%`)
</script>

<template>
  <article class="kpi" :class="`kpi--${tone}`">
    <header class="kpi__top">
      <span class="kpi__label">{{ label }}</span>
      <span class="kpi__icon" aria-hidden="true"><AppIcon :name="icon" /></span>
    </header>

    <p class="kpi__value">{{ shown }}<span class="kpi__unit">₴</span></p>

    <span v-if="meter" class="meter">
      <span class="meter__track" aria-hidden="true">
        <span class="meter__fill" :style="{ width }" />
      </span>
      <span class="meter__label">{{ meter.label }}</span>
    </span>

    <footer class="kpi__foot">{{ hint }}</footer>
  </article>
</template>

<style scoped>
.kpi {
  --tone: var(--ink);
  --tone-tint: var(--paper-sunk);

  display: grid;
  align-content: start;
  gap: 10px;
  min-width: 0;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

.kpi--brand {
  --tone: var(--brand-strong);
  --tone-tint: var(--brand-tint);
}

.kpi--danger {
  --tone: var(--danger);
  --tone-tint: var(--danger-tint);
}

.kpi__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.kpi__label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.kpi__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: 34px;
  height: 34px;
  margin: -4px -2px 0 0;
  border-radius: 12px;
  background: var(--tone-tint);
  color: var(--tone);
}

.kpi--plain .kpi__icon {
  color: var(--ink-muted);
}

.kpi__icon :deep(.icon) {
  width: 18px;
  height: 18px;
}

.kpi__value {
  font-family: var(--font-display);
  font-size: clamp(24px, 2.2vw, 30px);
  font-weight: 600;
  letter-spacing: -0.04em;
  line-height: 1.05;
  white-space: nowrap;
}

.kpi--danger .kpi__value {
  color: var(--danger);
}

.kpi__unit {
  margin-left: 5px;
  font-family: var(--font-body);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
  color: var(--ink-faint);
}

.meter {
  display: grid;
  gap: 7px;
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
  transition: width 0.6s var(--ease);
}

.kpi--plain .meter__fill {
  background: var(--ink-muted);
}

.meter__label {
  font-size: 11.5px;
  color: var(--ink-faint);
}

.kpi__foot {
  padding-top: 10px;
  border-top: 1px solid var(--line);
  font-size: 12px;
  color: var(--ink-faint);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
</style>
