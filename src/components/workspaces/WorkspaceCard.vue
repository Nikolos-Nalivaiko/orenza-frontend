<script setup lang="ts">
import { computed } from 'vue'
import { formatCreatedAt, monogram, WORKSPACE_TYPE_LABELS, type Workspace } from '@/lib/workspaces'

const props = defineProps<{
  workspace: Workspace
  current: boolean
  owned: boolean
}>()

defineEmits<{ open: [] }>()

const typeLabel = computed(() => WORKSPACE_TYPE_LABELS[props.workspace.type.value])
const created = computed(() => formatCreatedAt(props.workspace.created_at))
</script>

<template>
  <button
    type="button"
    class="card"
    :class="[`card--${workspace.type.value}`, { 'card--current': current }]"
    @click="$emit('open')"
  >
    <span class="card__top">
      <span class="card__mono" aria-hidden="true">{{ monogram(workspace.name) }}</span>

      <span class="card__badges">
        <span class="card__type">{{ typeLabel }}</span>
        <span v-if="current" class="card__now">Поточний</span>
      </span>
    </span>

    <span class="card__name">{{ workspace.name }}</span>

    <span class="card__foot">
      <span v-if="owned" class="card__owner">Власник</span>
      <span v-if="created" class="card__date">створено {{ created }}</span>

      <span class="card__go" aria-hidden="true">
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
  </button>
</template>

<style scoped>
.card {
  display: grid;
  gap: 8px;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
  color: var(--ink);
  text-align: left;
  transition:
    transform 0.22s var(--ease),
    border-color 0.22s var(--ease),
    box-shadow 0.28s var(--ease);
}

.card:hover {
  transform: translateY(-3px);
  border-color: var(--line-strong);
  box-shadow: var(--shadow-md);
}

.card--current {
  border-color: var(--brand);
  box-shadow: 0 0 0 3px var(--brand-glow);
}

.card__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}

.card__mono {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--ink);
  color: #fff;
  font-family: var(--font-display);
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.card--company .card__mono {
  background: var(--brand);
  color: #08210a;
}

.card__badges {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

.card__type,
.card__now {
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.card__type {
  background: var(--paper-sunk);
  color: var(--ink-muted);
}

.card__now {
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.card__name {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.02em;
  overflow-wrap: anywhere;
}

.card__foot {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
  font-size: 12px;
  color: var(--ink-faint);
}

.card__owner {
  padding: 3px 8px;
  border: 1px solid var(--line-strong);
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.card__go {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  margin-left: auto;
  border-radius: 50%;
  background: var(--paper-sunk);
  color: var(--ink);
  transition:
    background-color 0.22s var(--ease),
    color 0.22s var(--ease),
    transform 0.22s var(--ease);
}

.card__go svg {
  width: 15px;
  height: 15px;
}

.card:hover .card__go {
  background: var(--brand);
  color: #08210a;
  transform: translateX(3px);
}
</style>
