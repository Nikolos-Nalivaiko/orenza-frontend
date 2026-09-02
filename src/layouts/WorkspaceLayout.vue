<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppSidebar from '@/components/workspace/AppSidebar.vue'
import { useDashboardStore } from '@/stores/dashboard'
import { useWorkspacesStore } from '@/stores/workspaces'

const COLLAPSE_KEY = 'orenza.sidebar.collapsed'

const route = useRoute()
const workspaces = useWorkspacesStore()
const dashboard = useDashboardStore()

const collapsed = ref(false)
const drawer = ref(false)
const narrow = ref(false)

/** На вузьких екранах панель — шухляда, і згорнутою вона там сенсу не має. */
const railed = computed(() => collapsed.value && !narrow.value)

const narrowQuery = window.matchMedia('(width <= 1000px)')

function syncNarrow(): void {
  narrow.value = narrowQuery.matches

  if (!narrow.value) {
    drawer.value = false
  }
}

onMounted(() => {
  syncNarrow()
  narrowQuery.addEventListener('change', syncNarrow)

  try {
    collapsed.value = localStorage.getItem(COLLAPSE_KEY) === '1'
  } catch {
    // Приватний режим — панель просто щоразу відкрита.
  }
})

onBeforeUnmount(() => narrowQuery.removeEventListener('change', syncNarrow))

watch(collapsed, (value) => {
  try {
    localStorage.setItem(COLLAPSE_KEY, value ? '1' : '0')
  } catch {
    // див. вище
  }
})

/** Заголовок екрана бере той самий title, що й вкладка браузера. */
const title = computed(() => (typeof route.meta.title === 'string' ? route.meta.title : ''))
const subtitle = computed(() =>
  typeof route.meta.subtitle === 'string' ? route.meta.subtitle : '',
)

const overdue = computed(
  () => dashboard.data?.tasks.filter((task) => !task.done && task.urgency === 'late').length ?? 0,
)

const today = new Intl.DateTimeFormat('uk-UA', {
  weekday: 'short',
  day: 'numeric',
  month: 'long',
}).format(new Date())
</script>

<template>
  <div class="shell" :class="{ 'shell--rail': railed, 'shell--open': drawer }">
    <aside class="shell__side">
      <AppSidebar
        :collapsed="railed"
        :overdue="overdue"
        @toggle="collapsed = !collapsed"
        @navigate="drawer = false"
      />
    </aside>

    <div class="shell__scrim" role="presentation" @click="drawer = false" />

    <div class="shell__main">
      <header class="top">
        <button
          type="button"
          class="top__burger"
          aria-label="Меню розділів"
          @click="drawer = !drawer"
        >
          <AppIcon :name="drawer ? 'close' : 'menu'" />
        </button>

        <div class="top__text">
          <p class="top__crumbs">
            <span class="top__ws">{{ workspaces.current?.name }}</span>
            <span class="top__sep" aria-hidden="true">/</span>
            <span>{{ title }}</span>
          </p>
          <p v-if="subtitle" class="top__sub">{{ subtitle }}</p>
        </div>

        <div class="top__side">
          <span class="top__date">{{ today }}</span>
        </div>
      </header>

      <main class="shell__view">
        <RouterView v-slot="{ Component }">
          <Transition name="view" mode="out-in">
            <component :is="Component" />
          </Transition>
        </RouterView>
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: var(--sidebar-w) minmax(0, 1fr);
  min-height: 100dvh;
  transition: grid-template-columns 0.26s var(--ease);
}

.shell--rail {
  grid-template-columns: var(--sidebar-rail) minmax(0, 1fr);
}

.shell__side {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 100dvh;
  overflow: hidden;
}

.shell__scrim {
  display: none;
}

.shell__main {
  display: grid;
  grid-template-rows: auto 1fr;
  min-width: 0;
}

/* ── Верхня смуга ──────────────────────────────────────────────── */

.top {
  position: sticky;
  top: 0;
  z-index: 15;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px clamp(16px, 3vw, 34px);
  border-bottom: 1px solid var(--line);
  background: rgb(246 244 239 / 82%);
  backdrop-filter: blur(12px);
}

.top__burger {
  display: none;
  place-items: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--line);
  border-radius: var(--r-xs);
  background: var(--paper-raised);
  color: var(--ink);
}

.top__text {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.top__crumbs {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.top__ws {
  color: var(--ink-faint);
  font-weight: 500;
}

.top__sep {
  color: var(--ink-faint);
}

.top__sub {
  font-size: 12px;
  color: var(--ink-muted);
}

.top__side {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.top__date {
  font-size: 12.5px;
  color: var(--ink-faint);
  white-space: nowrap;
}

.shell__view {
  padding: clamp(18px, 2.6vw, 30px) clamp(16px, 3vw, 34px) 46px;
}

/* Перехід між розділами простору — коротший за перехід між сторінками входу. */
.view-enter-active,
.view-leave-active {
  transition:
    opacity 0.22s var(--ease),
    transform 0.22s var(--ease);
}

.view-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.view-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ── Планшет і телефон: панель стає шухлядою ───────────────────── */

@media (width <= 1000px) {
  .shell,
  .shell--rail {
    grid-template-columns: minmax(0, 1fr);
  }

  .shell__side {
    position: fixed;
    inset: 0 auto 0 0;
    width: var(--sidebar-w);
    transform: translateX(-100%);
    transition: transform 0.26s var(--ease);
    box-shadow: var(--shadow-lg);
  }

  .shell--open .shell__side {
    transform: translateX(0);
  }

  .shell__scrim {
    position: fixed;
    inset: 0;
    z-index: 18;
    display: block;
    background: rgb(12 17 14 / 34%);
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.24s var(--ease);
  }

  .shell--open .shell__scrim {
    opacity: 1;
    pointer-events: auto;
  }

  .top__burger {
    display: grid;
  }
}
</style>
