<script setup lang="ts">
import { onMounted } from 'vue'
import SettingsData from '@/components/settings/SettingsData.vue'
import SettingsShell from '@/components/settings/SettingsShell.vue'
import SettingsWorkspaceDanger from '@/components/settings/SettingsWorkspaceDanger.vue'
import SettingsWorkspaceGeneral from '@/components/settings/SettingsWorkspaceGeneral.vue'
import { useEmployeesStore } from '@/stores/employees'
import { useObjectsStore } from '@/stores/objects'
import { useWorkspacesStore } from '@/stores/workspaces'

const objects = useObjectsStore()
const employees = useEmployeesStore()
const workspaces = useWorkspacesStore()

onMounted(() => {
  if (!objects.loaded) {
    void objects.fetchObjects()
  }

  if (objects.clients.length === 0) {
    void objects.fetchClients()
  }

  if (workspaces.hasTeam && !employees.loaded) {
    void employees.fetchEmployees()
  }
})
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
