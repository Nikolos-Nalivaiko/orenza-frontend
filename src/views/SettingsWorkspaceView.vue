<script setup lang="ts">
import SettingsData from '@/components/settings/SettingsData.vue'
import SettingsShell from '@/components/settings/SettingsShell.vue'
import SettingsWorkspaceDanger from '@/components/settings/SettingsWorkspaceDanger.vue'
import SettingsWorkspaceGeneral from '@/components/settings/SettingsWorkspaceGeneral.vue'
</script>

<template>
  <SettingsShell page="workspace">
    <template #default="{ mark, go }">
      <SettingsWorkspaceGeneral @dirty="mark('general', $event)" />
      <SettingsData />
      <SettingsWorkspaceDanger @export="go('data')" />
    </template>
  </SettingsShell>
</template>
