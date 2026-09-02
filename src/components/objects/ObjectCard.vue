<script setup lang="ts">
import { RouterLink } from 'vue-router'
import StatusBadge from '@/components/objects/StatusBadge.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import { formatDay } from '@/lib/objects'
import { formatDeadline, type ObjectRow } from '@/lib/objectList'

defineProps<{ row: ObjectRow }>()

function percent(value: number): string {
  return `${Math.round(value * 100)}%`
}
</script>

<template>
  <li class="ocard">
    <!-- Обкладинка або її замінник: картки гортають очима, і якір потрібен завжди. -->
    <div class="ocard__cover">
      <img v-if="row.object.cover" :src="row.object.cover" alt="" class="ocard__photo" />
      <span v-else class="ocard__ghost" aria-hidden="true"><AppIcon name="building" /></span>

      <StatusBadge
        class="ocard__status"
        :status="row.object.status.value"
        :label="row.object.status.label"
      />
    </div>

    <div class="ocard__body">
      <h3 class="ocard__name">
        <RouterLink class="ocard__link" :to="{ name: 'object', params: { id: row.object.id } }">
          {{ row.object.name }}
        </RouterLink>
      </h3>

      <p class="ocard__line">
        <AppIcon name="pin" />
        <span>{{ row.object.address }}</span>
      </p>

      <p class="ocard__line" :class="{ 'ocard__line--faint': row.object.client === null }">
        <AppIcon name="user" />
        <span>{{ row.object.client?.name ?? 'Без замовника' }}</span>
      </p>

      <dl class="ocard__bars">
        <div class="bar">
          <dt>Готовність</dt>
          <dd>{{ row.summary.readiness === null ? '—' : percent(row.summary.readiness) }}</dd>
          <span class="track">
            <span class="track__fill" :style="{ width: percent(row.summary.readiness ?? 0) }" />
          </span>
        </div>

        <div class="bar">
          <dt>Оплата</dt>
          <dd class="bar__money">
            {{ formatAmount(row.summary.client) }}
            <span class="bar__slash">/</span>
            <strong>{{ formatAmount(row.summary.paid) }}</strong>
          </dd>
          <span class="track">
            <span
              class="track__fill track__fill--pay"
              :style="{ width: percent(row.summary.progress) }"
            />
          </span>
        </div>
      </dl>

      <div class="ocard__foot">
        <span class="due" :class="{ 'is-late': row.summary.overdue }">
          <AppIcon name="clock" />
          <template v-if="row.object.finished_at === null">Без дедлайну</template>
          <template v-else>
            {{ formatDay(row.object.finished_at) }} ·
            {{ formatDeadline(row.summary.daysLeft, row.summary.overdue) }}
          </template>
        </span>
      </div>
    </div>
  </li>
</template>

<style scoped>
.ocard {
  position: relative;
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
  transition:
    border-color 0.18s var(--ease),
    box-shadow 0.22s var(--ease),
    transform 0.22s var(--ease);
}

.ocard:hover {
  border-color: var(--line-strong);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.ocard__cover {
  position: relative;
  height: 128px;
  background: var(--paper-sunk);
}

.ocard__photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ocard__ghost {
  display: grid;
  place-items: center;
  height: 100%;
  background: linear-gradient(135deg, var(--brand-tint), var(--paper-sunk));
  color: var(--brand-strong);
}

.ocard__ghost :deep(.icon) {
  width: 34px;
  height: 34px;
  opacity: 0.55;
}

.ocard__status {
  position: absolute;
  top: 10px;
  left: 10px;
  background: var(--paper-raised);
  box-shadow: var(--shadow-sm);
}

.ocard__body {
  display: grid;
  align-content: start;
  gap: 8px;
  padding: 14px 16px 16px;
}

.ocard__link {
  color: inherit;
  text-decoration: none;
}

/* Клікабельна вся картка, але посилання лишається одне — на назві. */
.ocard__link::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
}

.ocard__name {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ocard__line {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  font-size: 12.5px;
  color: var(--ink-muted);
}

.ocard__line :deep(.icon) {
  flex: none;
  width: 14px;
  height: 14px;
  color: var(--ink-faint);
}

.ocard__line span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ocard__line--faint {
  color: var(--ink-faint);
}

.ocard__bars {
  display: grid;
  gap: 10px;
  margin: 4px 0 2px;
}

.bar {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 4px 8px;
}

.bar dt {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.bar dd {
  margin: 0;
  font-size: 12.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.bar__money {
  color: var(--ink-muted);
  white-space: nowrap;
}

.bar__money strong {
  color: var(--ink);
}

.bar__slash {
  color: var(--ink-faint);
}

.track {
  grid-column: 1 / -1;
  overflow: hidden;
  height: 4px;
  border-radius: 999px;
  background: var(--paper-sunk);
}

.track__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--ink-muted);
  transition: width 0.3s var(--ease);
}

.track__fill--pay {
  background: var(--brand);
}

.ocard__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 10px;
  border-top: 1px solid var(--line);
}

.due {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--ink-faint);
}

.due :deep(.icon) {
  width: 13px;
  height: 13px;
}

.due.is-late {
  color: var(--danger);
  font-weight: 600;
}
</style>
