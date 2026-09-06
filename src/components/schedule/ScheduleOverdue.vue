<script setup lang="ts">
import { ref } from 'vue'
import ScheduleRow from '@/components/schedule/ScheduleRow.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import type { ScheduleEvent } from '@/lib/schedule'

/**
 * Прострочене — окремий блок над стрічкою й поза періодом: день, який минув,
 * нікуди не зник, і саме з цих рядків починається робочий ранок. Тому вони
 * стоять зверху в обох режимах і не залежать від обраного періоду.
 */
const props = defineProps<{ events: ScheduleEvent[]; amount: number }>()

/** Довгий список згортається: він не має відсувати найближчий тиждень за екран. */
const SHORT = 4

const full = ref(false)

function shown(): ScheduleEvent[] {
  return full.value ? props.events : props.events.slice(0, SHORT)
}
</script>

<template>
  <section class="late">
    <header class="late__head">
      <span class="late__icon" aria-hidden="true"><AppIcon name="alert" /></span>

      <div class="late__intro">
        <h2 class="late__title">Прострочено · {{ events.length }}</h2>
        <p class="late__sub">
          Дати вже минули, а події так і не сталися.
          <template v-if="amount > 0">
            Серед них {{ formatAmount(amount) }} ₴ ненадійшлих платежів.
          </template>
        </p>
      </div>
    </header>

    <ul class="late__list">
      <ScheduleRow v-for="event in shown()" :key="event.id" :event="event" with-date />
    </ul>

    <button v-if="events.length > SHORT" type="button" class="late__more" @click="full = !full">
      {{ full ? 'Згорнути' : `Показати ще ${events.length - SHORT}` }}
    </button>
  </section>
</template>

<style scoped>
.late {
  display: grid;
  gap: 10px;
  padding: 14px;
  border: 1px solid rgb(200 52 31 / 26%);
  border-radius: var(--r-md);
  background: var(--danger-tint);
}

.late__head {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.late__icon {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 10px;
  background: rgb(200 52 31 / 12%);
  color: var(--danger);
}

.late__icon :deep(.icon) {
  width: 16px;
  height: 16px;
}

.late__intro {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.late__title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  color: var(--danger);
}

.late__sub {
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--ink-muted);
}

.late__list {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.late__more {
  justify-self: start;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--danger);
  font-size: 12.5px;
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
