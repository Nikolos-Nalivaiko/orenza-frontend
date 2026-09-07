<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import ApiOffline from '@/components/ui/ApiOffline.vue'
import AppProgress from '@/components/ui/AppProgress.vue'
import { useApiStore } from '@/stores/api'

const api = useApiStore()

onMounted(() => void api.check())
</script>

<template>
  <AppProgress />

  <RouterView v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>

  <ApiOffline />
</template>
