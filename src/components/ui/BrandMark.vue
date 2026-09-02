<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'light' | 'dark'; compact?: boolean }>(), {
  tone: 'dark',
  compact: false,
})
</script>

<template>
  <span class="brand" :class="[`brand--${tone}`, { 'brand--compact': compact }]">
    <span class="brand__glyph" aria-hidden="true">
      <svg viewBox="0 0 28 28" fill="none">
        <path d="M4 24V9.5L14 4l10 5.5V24" stroke="currentColor" stroke-width="2.4" />
        <path d="M10 24v-7.5h8V24" stroke="currentColor" stroke-width="2.4" />
        <circle cx="14" cy="11" r="1.9" fill="currentColor" />
      </svg>
    </span>
    <span class="brand__word">Orenza</span>
    <span v-if="!compact" class="brand__tag">CRM</span>
  </span>
</template>

<style scoped>
.brand {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  font-family: var(--font-display);
  font-size: 19px;
  font-weight: 600;
  letter-spacing: -0.03em;
}

.brand__glyph {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 11px;
  background: var(--brand);
  color: #08210a;
}

.brand__glyph svg {
  width: 20px;
  height: 20px;
}

.brand__tag {
  padding: 3px 8px;
  border: 1px solid currentcolor;
  border-radius: 999px;
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.14em;
  opacity: 0.55;
}

.brand--light {
  color: #fff;
}

.brand--dark {
  color: var(--ink);
}

.brand--compact {
  font-size: 17px;
}

.brand--compact .brand__glyph {
  width: 30px;
  height: 30px;
  border-radius: 10px;
}
</style>
