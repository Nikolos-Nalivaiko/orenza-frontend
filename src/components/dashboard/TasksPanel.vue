<script setup lang="ts">
import AppIcon from '@/components/ui/AppIcon.vue'
import type { Task } from '@/lib/dashboard'

defineProps<{ tasks: Task[] }>()
defineEmits<{ toggle: [id: number] }>()
</script>

<template>
  <ul class="tasks">
    <li v-for="task in tasks" :key="task.id">
      <button
        type="button"
        class="task"
        :class="{ 'task--done': task.done }"
        :aria-pressed="task.done"
        @click="$emit('toggle', task.id)"
      >
        <span class="task__box" aria-hidden="true">
          <AppIcon name="check" />
        </span>

        <span class="task__body">
          <span class="task__title">{{ task.title }}</span>
          <span class="task__meta">
            <span class="task__due" :class="`task__due--${task.urgency}`">{{ task.due }}</span>
            <span aria-hidden="true">·</span>
            <span>{{ task.site }}</span>
          </span>
        </span>
      </button>
    </li>
  </ul>
</template>

<style scoped>
.tasks {
  display: grid;
  gap: 1px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.task {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: start;
  gap: 11px;
  width: 100%;
  padding: 9px 8px;
  border: 0;
  border-radius: var(--r-xs);
  background: transparent;
  text-align: left;
  transition: background-color 0.16s var(--ease);
}

.task:hover {
  background: var(--paper-sunk);
}

.task__box {
  display: grid;
  place-items: center;
  width: 19px;
  height: 19px;
  margin-top: 1px;
  border: 1.5px solid var(--line-strong);
  border-radius: 6px;
  color: transparent;
  transition:
    background-color 0.18s var(--ease),
    border-color 0.18s var(--ease),
    color 0.18s var(--ease);
}

.task__box :deep(.icon) {
  width: 13px;
  height: 13px;
}

.task:hover .task__box {
  border-color: var(--ink-muted);
}

.task--done .task__box {
  border-color: var(--brand);
  background: var(--brand);
  color: #08210a;
}

.task__body {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.task__title {
  font-size: 13.5px;
  line-height: 1.35;
  transition:
    color 0.18s var(--ease),
    text-decoration-color 0.18s var(--ease);
}

.task--done .task__title {
  color: var(--ink-faint);
  text-decoration: line-through;
  text-decoration-color: var(--ink-faint);
}

.task__meta {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11.5px;
  color: var(--ink-faint);
}

.task__due {
  font-weight: 700;
}

.task__due--late {
  color: var(--danger);
}

.task__due--today {
  color: #8a5c00;
}

.task__due--soon {
  color: var(--ink-muted);
}

.task--done .task__due {
  color: var(--ink-faint);
}
</style>
