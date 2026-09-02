<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'
import type { IconName } from '@/components/ui/icons'
import { FEED_KIND_LABELS, type FeedItem, type FeedKind } from '@/lib/dashboard'

defineProps<{ items: FeedItem[] }>()

const ICONS: Record<FeedKind, IconName> = {
  act: 'document',
  delivery: 'box',
  crew: 'team',
  money: 'wallet',
  lead: 'spark',
}
</script>

<template>
  <ol class="feed">
    <li v-for="item in items" :key="item.id" class="feed__li">
      <span class="feed__mark" :class="`feed__mark--${item.kind}`">
        <AppIcon :name="ICONS[item.kind]" />
      </span>

      <div class="feed__body">
        <p class="feed__text">{{ item.text }}</p>
        <p class="feed__meta">
          <span class="feed__kind">{{ FEED_KIND_LABELS[item.kind] }}</span>
          <span aria-hidden="true">·</span>
          <span>{{ item.site }}</span>
        </p>
      </div>

      <time class="feed__time">{{ item.time }}</time>
    </li>
  </ol>
</template>

<style scoped>
.feed {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.feed__li {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
  padding: 9px 0;
}

/* Вертикаль стрічки: тонка лінія між мітками подій. */
.feed__li:not(:last-child)::before {
  content: '';
  position: absolute;
  top: 37px;
  bottom: -1px;
  left: 13px;
  width: 1px;
  background: var(--line);
}

.feed__mark {
  display: grid;
  place-items: center;
  width: 27px;
  height: 27px;
  border-radius: 9px;
  background: var(--paper-sunk);
  color: var(--ink-muted);
}

.feed__mark :deep(.icon) {
  width: 15px;
  height: 15px;
}

.feed__mark--act {
  background: var(--c-1-soft);
  color: var(--c-1);
}

.feed__mark--money {
  background: var(--c-2-soft);
  color: var(--c-2);
}

.feed__mark--delivery {
  background: var(--c-3-soft);
  color: var(--c-3);
}

.feed__mark--lead {
  background: var(--c-4-soft);
  color: var(--c-4);
}

.feed__body {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.feed__text {
  font-size: 13px;
  line-height: 1.4;
}

.feed__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--ink-faint);
}

.feed__kind {
  font-weight: 600;
  color: var(--ink-muted);
}

.feed__time {
  font-size: 11.5px;
  color: var(--ink-faint);
  white-space: nowrap;
}
</style>
