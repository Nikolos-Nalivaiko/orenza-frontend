<script setup lang="ts">
import { computed } from 'vue'
import { ICONS, type IconName } from './icons'

const props = defineProps<{ name: IconName }>()

const paths = computed<readonly string[]>(() => ICONS[props.name])
</script>

<template>
  <svg class="icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    <path
      v-for="d in paths"
      :key="d"
      :d="d"
      stroke="currentColor"
      stroke-width="1.6"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
</template>

<style scoped>
.icon {
  flex: none;
  width: 20px;
  height: 20px;
}
</style>
