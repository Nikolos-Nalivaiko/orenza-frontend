<script setup lang="ts">
import { RouterLink } from 'vue-router'
import {
  SETTINGS_MENU,
  type SettingsMenuItem,
  type SettingsPage,
  type SettingsSectionId,
} from '@/lib/settings'

const props = defineProps<{
  page: SettingsPage
  active: SettingsSectionId
  dirty: Partial<Record<SettingsSectionId, boolean>>
}>()

const emit = defineEmits<{ go: [id: SettingsSectionId] }>()

function isOn(item: SettingsMenuItem): boolean {
  return item.page === props.page && item.id === props.active
}

function onClick(event: MouseEvent, item: SettingsMenuItem): void {
  if (item.page === props.page) {
    event.preventDefault()
    emit('go', item.id)
  }
}
</script>

<template>
  <nav class="snav" aria-label="Розділи налаштувань">
    <RouterLink
      v-for="item in SETTINGS_MENU"
      :key="item.id"
      class="snav__item"
      :class="{ 'snav__item--on': isOn(item) }"
      :to="{ name: item.route, hash: `#${item.id}` }"
      :aria-current="isOn(item) ? 'location' : undefined"
      @click="onClick($event, item)"
    >
      {{ item.label }}
      <span
        v-if="item.page === page && dirty[item.id]"
        class="snav__dot"
        title="Є незбережені зміни"
        aria-label="є незбережені зміни"
      />
    </RouterLink>
  </nav>
</template>

<style scoped>
.snav {
  position: sticky;
  top: 92px;
  display: grid;
  align-content: start;
  justify-items: start;
  gap: 12px;
}

.snav__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--ink-muted);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.4;
  text-decoration: none;
  transition: color 0.15s var(--ease);
}

.snav__item:hover {
  color: var(--ink);
}

.snav__item--on {
  color: var(--ink);
  font-weight: 600;
}

.snav__dot {
  flex: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--amber);
}

@media (width <= 900px) {
  .snav {
    position: relative;
    top: auto;
    display: flex;
    gap: 20px;
    margin: 0 calc(clamp(16px, 3vw, 34px) * -1);
    padding: 12px clamp(16px, 3vw, 34px);
    overflow-x: auto;
    border-bottom: 1px solid var(--line);
    background: rgb(246 244 239 / 92%);
    backdrop-filter: blur(12px);
    scrollbar-width: none;
  }

  .snav::-webkit-scrollbar {
    display: none;
  }

  .snav__item {
    flex: none;
    white-space: nowrap;
  }
}
</style>
