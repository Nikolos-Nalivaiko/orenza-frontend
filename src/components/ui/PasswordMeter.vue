<script setup lang="ts">
import { computed } from 'vue'
import { PASSWORD_STRONG, passwordLabel, passwordScore } from '@/lib/validation'

const props = defineProps<{ password: string }>()

const score = computed(() => passwordScore(props.password))
const label = computed(() => passwordLabel(score.value))

const checks = computed(() => [
  { text: `від ${PASSWORD_STRONG} символів`, ok: props.password.length >= PASSWORD_STRONG },
  { text: 'літери й цифри', ok: /\p{L}/u.test(props.password) && /\d/.test(props.password) },
  { text: 'спецсимвол', ok: /[^\p{L}\d]/u.test(props.password) },
])
</script>

<template>
  <div class="meter" :data-score="score">
    <div class="meter__bars" role="presentation">
      <span v-for="i in 4" :key="i" class="meter__bar" :class="{ 'meter__bar--on': i <= score }" />
    </div>

    <p class="meter__label">
      Надійність: <strong>{{ label }}</strong>
    </p>

    <ul class="meter__checks">
      <li v-for="check in checks" :key="check.text" :class="{ 'is-ok': check.ok }">
        <svg viewBox="0 0 14 14" aria-hidden="true">
          <path
            d="M3 7.3l2.6 2.6L11 4.4"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        {{ check.text }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
.meter {
  --meter-color: var(--danger);

  display: grid;
  gap: 8px;
}

.meter[data-score='2'],
.meter[data-score='3'] {
  --meter-color: var(--amber);
}

.meter[data-score='4'] {
  --meter-color: var(--brand);
}

.meter__bars {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 5px;
}

.meter__bar {
  height: 4px;
  border-radius: 999px;
  background: var(--paper-sunk);
  transition:
    background-color 0.3s var(--ease),
    transform 0.3s var(--ease);
  transform-origin: left;
}

.meter__bar--on {
  background: var(--meter-color);
}

.meter__label {
  font-size: 12.5px;
  color: var(--ink-muted);
}

.meter__label strong {
  color: var(--meter-color);
}

.meter__checks {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: 12px;
  color: var(--ink-faint);
}

.meter__checks li {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  transition: color 0.2s var(--ease);
}

.meter__checks svg {
  width: 12px;
  height: 12px;
  opacity: 0.35;
}

.meter__checks .is-ok {
  color: var(--brand-strong);
}

.meter__checks .is-ok svg {
  opacity: 1;
}
</style>
