<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatMoney, SITE_STATUS_LABELS, type Site } from '@/lib/dashboard'
import { monogram } from '@/lib/workspaces'

defineProps<{ sites: Site[] }>()
</script>

<template>
  <ul class="sites">
    <li v-for="(site, index) in sites" :key="site.id" class="sites__li" :style="{ '--i': index }">
      <article class="site">
        <span class="site__mono" aria-hidden="true">{{ monogram(site.name) }}</span>

        <div class="site__ident">
          <p class="site__name">{{ site.name }}</p>
          <p class="site__meta">
            <span class="site__stage">{{ site.stage }}</span>
            <span class="site__dot" aria-hidden="true">·</span>
            <span>{{ site.crew }}</span>
            <span class="site__dot" aria-hidden="true">·</span>
            <span class="site__addr">{{ site.address }}</span>
          </p>
        </div>

        <div class="site__progress">
          <div class="site__track">
            <span class="site__fill" :style="{ width: `${site.progress}%` }" />
          </div>
          <p class="site__numbers">
            <strong>{{ site.progress }}%</strong>
            <span>{{ formatMoney(site.spent) }} з {{ formatMoney(site.budget) }} ₴</span>
          </p>
        </div>

        <div class="site__due">
          <span class="badge" :class="`badge--${site.status}`">
            <AppIcon :name="site.status === 'ok' ? 'check' : 'alert'" />
            {{ SITE_STATUS_LABELS[site.status] }}
          </span>
          <span class="site__deadline">до {{ site.deadline }}</span>
        </div>
      </article>
    </li>
  </ul>
</template>

<style scoped>
.sites {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sites__li {
  animation: rise 0.4s var(--ease) backwards;
  animation-delay: calc(var(--i, 0) * 60ms);
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

.site {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) 160px 116px;
  align-items: center;
  gap: 14px;
  padding: 12px 10px;
  border-radius: var(--r-sm);
  transition: background-color 0.16s var(--ease);
}

.site:hover {
  background: var(--paper-sunk);
}

.site__mono {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--paper-sunk);
  color: var(--ink-muted);
  font-family: var(--font-display);
  font-size: 12px;
  font-weight: 600;
  transition:
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.site:hover .site__mono {
  background: var(--ink);
  color: #fff;
}

.site__ident {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.site__name {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.site__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--ink-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.site__stage {
  color: var(--ink-muted);
  font-weight: 500;
}

.site__addr {
  overflow: hidden;
  text-overflow: ellipsis;
}

.site__progress {
  display: grid;
  gap: 6px;
}

.site__track {
  height: 6px;
  border-radius: 999px;
  background: var(--paper-sunk);
  overflow: hidden;
}

.site__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--c-1);
  transition: width 0.6s var(--ease);
}

.site__numbers {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-size: 11.5px;
  color: var(--ink-faint);
  font-variant-numeric: tabular-nums;
}

.site__numbers strong {
  font-size: 12.5px;
  color: var(--ink);
}

.site__due {
  display: grid;
  justify-items: end;
  gap: 4px;
}

/* Статус — колір + іконка + слово, ніколи не сам колір. */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px 3px 6px;
  border-radius: 999px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}

.badge :deep(.icon) {
  width: 12px;
  height: 12px;
}

.badge--ok {
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.badge--risk {
  background: var(--amber-tint);
  color: #8a5c00;
}

.badge--late {
  background: var(--danger-tint);
  color: var(--danger);
}

.site__deadline {
  font-size: 11.5px;
  color: var(--ink-faint);
}

@media (width <= 900px) {
  .site {
    grid-template-columns: auto minmax(0, 1fr);
    row-gap: 10px;
  }

  .site__progress {
    grid-column: 2 / -1;
  }

  .site__due {
    grid-column: 2 / -1;
    justify-items: start;
    grid-auto-flow: column;
    justify-content: start;
    align-items: center;
    gap: 10px;
  }
}
</style>
