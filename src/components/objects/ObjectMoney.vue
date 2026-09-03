<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import type { ObjectSummary } from '@/lib/objectList'

/**
 * Три цифри, по які найчастіше й заходять у «Фінанси». Залишок до сплати вже
 * стоїть у шапці, тож тут його немає — це не друга вкладка фінансів, а спосіб
 * не клацати на неї заради одного погляду.
 */
defineProps<{ summary: ObjectSummary }>()

const emit = defineEmits<{ open: [] }>()
</script>

<template>
  <div class="money">
    <dl class="money__list">
      <div class="sum">
        <dt>Сума для клієнта</dt>
        <dd>{{ formatAmount(summary.client) }} ₴</dd>
      </div>

      <div class="sum" :class="{ 'sum--minus': summary.profit < 0 }">
        <dt>Профіт</dt>
        <dd>{{ formatAmount(summary.profit) }} ₴</dd>
      </div>

      <div class="sum">
        <dt>Оплачено</dt>
        <dd>{{ formatAmount(summary.paid) }} ₴</dd>
      </div>
    </dl>

    <button type="button" class="money__more" @click="emit('open')">
      Детальніше
      <AppIcon name="forward" />
    </button>
  </div>
</template>

<style scoped>
.money {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.money__list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 22px;
  margin: 0;
}

.sum {
  display: grid;
  gap: 1px;
}

.sum dt {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.sum dd {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
}

.sum--minus dd {
  color: var(--danger);
}

.money__more {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-muted);
  transition: color 0.16s var(--ease);
}

.money__more:hover {
  color: var(--brand-strong);
}

.money__more :deep(.icon) {
  width: 15px;
  height: 15px;
  transition: transform 0.2s var(--ease);
}

.money__more:hover :deep(.icon) {
  transform: translateX(3px);
}
</style>
