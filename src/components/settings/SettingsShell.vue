<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SettingsNav from '@/components/settings/SettingsNav.vue'
import { groupOf, sectionAnchor, type SettingsPage, type SettingsSectionId } from '@/lib/settings'

const props = defineProps<{ page: SettingsPage }>()

const route = useRoute()
const router = useRouter()

const sections = computed(() => groupOf(props.page).sections)

const active = ref<SettingsSectionId>(sections.value[0]!.id)
const dirty = reactive<Partial<Record<SettingsSectionId, boolean>>>({})

let frame = 0
let locked = false
let unlockTimer: ReturnType<typeof setTimeout> | undefined

function offset(): number {
  return window.innerWidth <= 900 ? 160 : 120
}

function spy(): void {
  cancelAnimationFrame(frame)

  frame = requestAnimationFrame(() => {
    if (locked) {
      return
    }

    const list = sections.value
    const atBottom =
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4

    if (atBottom) {
      active.value = list[list.length - 1]!.id

      return
    }

    let current = list[0]!.id

    for (const section of list) {
      const element = document.getElementById(sectionAnchor(section.id))

      if (element !== null && element.getBoundingClientRect().top <= offset()) {
        current = section.id
      }
    }

    active.value = current
  })
}

function go(id: SettingsSectionId, smooth = true): void {
  const element = document.getElementById(sectionAnchor(id))

  if (element === null) {
    return
  }

  active.value = id
  locked = true
  clearTimeout(unlockTimer)
  unlockTimer = setTimeout(() => (locked = false), 700)

  element.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' })

  if (route.hash !== `#${id}`) {
    void router.replace({ hash: `#${id}` })
  }
}

function mark(id: SettingsSectionId, value: boolean): void {
  dirty[id] = value
}

function fromHash(hash: string): SettingsSectionId | null {
  const id = hash.replace(/^#/, '')

  return sections.value.find((section) => section.id === id)?.id ?? null
}

watch(
  () => route.hash,
  (hash) => {
    const id = fromHash(hash)

    if (id !== null && id !== active.value) {
      go(id)
    }
  },
)

onMounted(() => {
  window.addEventListener('scroll', spy, { passive: true })

  const id = fromHash(route.hash)

  if (id !== null) {
    void nextTick(() => go(id, false))
  } else {
    window.scrollTo({ top: 0 })
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', spy)
  cancelAnimationFrame(frame)
  clearTimeout(unlockTimer)
})
</script>

<template>
  <div class="shell">
    <aside class="shell__nav">
      <SettingsNav :page="page" :active="active" :dirty="dirty" @go="go" />
    </aside>

    <div class="shell__cards">
      <slot :mark="mark" :go="go" />
    </div>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  align-items: start;
  gap: 40px;
  width: 100%;
}

.shell__nav {
  align-self: stretch;
}

.shell__cards {
  display: grid;
  gap: 24px;
  min-width: 0;
}

.shell :deep(.btn) {
  border-radius: var(--r-xs);
  box-shadow: none;
}

.shell :deep(.btn:hover:not(:disabled)),
.shell :deep(.btn:active:not(:disabled)) {
  transform: none;
}

.shell :deep(.btn--sm) {
  min-height: 38px;
  padding: 0 14px;
  font-size: 13.5px;
}

.shell :deep(.btn--ink:hover:not(:disabled)) {
  --btn-bg: var(--ink-soft);
}

.shell :deep(.btn .spinner) {
  width: 13px;
  height: 13px;
}

@media (width <= 900px) {
  .shell {
    grid-template-columns: minmax(0, 1fr);
    gap: 16px;
  }

  .shell__nav {
    position: sticky;
    top: 64px;
    z-index: 5;
  }
}
</style>
