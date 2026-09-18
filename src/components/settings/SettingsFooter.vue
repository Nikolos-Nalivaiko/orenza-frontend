<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    dirty: boolean
    saving: boolean
    saved?: boolean
    error?: string | null
    idleText?: string
    savedText?: string
    submitLabel?: string
    savingLabel?: string
    disabled?: boolean
  }>(),
  {
    saved: false,
    error: null,
    idleText: 'Змін немає',
    savedText: 'Зміни збережено',
    submitLabel: 'Зберегти',
    savingLabel: 'Зберігаємо…',
    disabled: false,
  },
)

const emit = defineEmits<{ reset: [] }>()

const state = computed(() => {
  if (props.saving) {
    return 'saving'
  }

  if (props.error !== null && props.error !== '') {
    return 'error'
  }

  if (props.dirty) {
    return 'dirty'
  }

  return props.saved ? 'saved' : 'idle'
})
</script>

<template>
  <div class="foot">
    <p class="status" :class="`status--${state}`" role="status">
      <span class="status__mark" aria-hidden="true" />
      <span class="status__text">
        <template v-if="state === 'dirty'">Є незбережені зміни</template>
        <template v-else-if="state === 'saved'">{{ savedText }}</template>
        <template v-else-if="state === 'error'">{{ error }}</template>
        <template v-else-if="state === 'saving'">{{ savingLabel }}</template>
        <template v-else>{{ idleText }}</template>
      </span>
    </p>

    <div class="actions">
      <button
        v-if="dirty"
        type="button"
        class="btn btn--ghost btn--sm"
        :disabled="saving"
        @click="emit('reset')"
      >
        Скасувати
      </button>

      <button type="submit" class="btn btn--ink btn--sm" :disabled="!dirty || saving || disabled">
        <span v-if="saving" class="spinner" aria-hidden="true" />
        <span>{{ saving ? savingLabel : submitLabel }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 16px;
  width: 100%;
}

.status {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
  font-size: 12.5px;
  color: var(--ink-faint);
}

.status__mark {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--line-strong);
}

.status--dirty {
  color: var(--ink-soft);
}

.status--dirty .status__mark {
  background: var(--amber);
}

.status--saved {
  color: var(--ink-soft);
}

.status--saved .status__mark {
  background: var(--brand);
}

.status--error {
  color: var(--danger);
}

.status--error .status__mark {
  background: var(--danger);
}

.status--saving .status__mark {
  background: var(--ink-muted);
}

.status__text {
  overflow-wrap: anywhere;
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

@media (width <= 560px) {
  .actions {
    width: 100%;
  }

  .actions .btn {
    flex: 1;
  }
}
</style>
