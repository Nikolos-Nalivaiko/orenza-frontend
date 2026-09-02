<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppProgress from '@/components/ui/AppProgress.vue'
</script>

<template>
  <AppProgress />

  <RouterView v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>
