<script setup lang="ts">
import SettingsAccountDanger from '@/components/settings/SettingsAccountDanger.vue'
import SettingsProfile from '@/components/settings/SettingsProfile.vue'
import SettingsSecurity from '@/components/settings/SettingsSecurity.vue'
import SettingsShell from '@/components/settings/SettingsShell.vue'
</script>

<template>
  <SettingsShell page="account">
    <template #default="{ mark }">
      <SettingsProfile @dirty="mark('profile', $event)" />
      <SettingsSecurity @dirty="mark('security', $event)" />
      <SettingsAccountDanger />
    </template>
  </SettingsShell>
</template>
