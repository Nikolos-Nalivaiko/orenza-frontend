<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import BrandMark from '@/components/ui/BrandMark.vue'
import WorkspaceSwitcher from '@/components/workspace/WorkspaceSwitcher.vue'
import { useDismissable } from '@/composables/useDismissable'
import { NAV, NAV_FOOTER, type NavGroup, type NavItem } from '@/lib/navigation'
import { useAuthStore } from '@/stores/auth'

const props = defineProps<{ collapsed: boolean; overdue: number }>()
const emit = defineEmits<{ toggle: []; navigate: [] }>()

const auth = useAuthStore()
const route = useRoute()
const router = useRouter()

/**
 * Вкладені екрани (наприклад, створення обʼєкта) мають власні адреси, тож
 * exact-active на них не спрацьовує — розділ вони називають самі, у meta.
 */
const section = computed(() => (typeof route.meta.section === 'string' ? route.meta.section : null))

const search = useTemplateRef<HTMLInputElement>('search')
const userRoot = useTemplateRef<HTMLElement>('userRoot')

const query = ref('')
const userOpen = ref(false)

useDismissable(userRoot, userOpen)

const initials = computed(() => {
  const first = auth.user?.first_name?.[0] ?? ''
  const last = auth.user?.last_name?.[0] ?? ''

  return `${first}${last}`.toUpperCase() || 'O'
})

/** Прострочені задачі — єдиний лічильник, який має сенс тримати в меню. */
function withBadge(item: NavItem): NavItem {
  return item.name === 'dashboard' && props.overdue > 0 ? { ...item, badge: props.overdue } : item
}

/**
 * Порожній запит лишає групи як є; щойно щось введено — меню перетворюється
 * на один плаский список збігів, бо заголовки груп у результатах лише заважають.
 */
const groups = computed<NavGroup[]>(() => {
  const needle = query.value.trim().toLowerCase()

  if (needle === '') {
    return NAV.map((group) => ({ ...group, items: group.items.map(withBadge) }))
  }

  const items = [...NAV.flatMap((group) => group.items), ...NAV_FOOTER]
    .filter((item) => item.label.toLowerCase().includes(needle))
    .map(withBadge)

  return [{ title: 'Знайдено', items }]
})

const nothingFound = computed(() => groups.value.every((group) => group.items.length === 0))

function focusSearch(): void {
  if (props.collapsed) {
    emit('toggle')
  }

  // Панель ще розгортається — фокус даємо наступним кадром.
  requestAnimationFrame(() => search.value?.focus())
}

function onKeyDown(event: KeyboardEvent): void {
  if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
    event.preventDefault()
    focusSearch()

    return
  }

  const target = event.target as HTMLElement | null
  const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA'

  if (event.key === '[' && !typing && !event.metaKey && !event.ctrlKey) {
    event.preventDefault()
    emit('toggle')
  }
}

onMounted(() => document.addEventListener('keydown', onKeyDown))
onBeforeUnmount(() => document.removeEventListener('keydown', onKeyDown))

async function signOut(): Promise<void> {
  userOpen.value = false
  auth.logout()
  await router.push({ name: 'login' })
}

async function toWorkspaces(): Promise<void> {
  userOpen.value = false
  await router.push({ name: 'workspaces' })
}
</script>

<template>
  <nav class="side" :class="{ 'side--rail': collapsed }" aria-label="Розділи простору">
    <div class="side__top">
      <RouterLink class="side__brand" :to="{ name: 'dashboard' }" @click="emit('navigate')">
        <BrandMark v-if="!collapsed" compact />
        <span v-else class="side__glyph" aria-hidden="true">
          <svg viewBox="0 0 28 28" fill="none">
            <path d="M4 24V9.5L14 4l10 5.5V24" stroke="currentColor" stroke-width="2.4" />
            <path d="M10 24v-7.5h8V24" stroke="currentColor" stroke-width="2.4" />
          </svg>
        </span>
      </RouterLink>

      <button
        type="button"
        class="side__fold"
        :aria-label="collapsed ? 'Розгорнути меню' : 'Згорнути меню'"
        :title="collapsed ? 'Розгорнути меню — [' : 'Згорнути меню — ['"
        @click="emit('toggle')"
      >
        <AppIcon :name="collapsed ? 'forward' : 'back'" />
      </button>
    </div>

    <WorkspaceSwitcher :collapsed="collapsed" />

    <div class="side__search">
      <button
        v-if="collapsed"
        type="button"
        class="side__seek"
        title="Пошук — ⌘K"
        aria-label="Пошук"
        @click="focusSearch"
      >
        <AppIcon name="search" />
      </button>

      <label v-else class="seek">
        <AppIcon name="search" class="seek__icon" />
        <input
          ref="search"
          v-model="query"
          type="search"
          class="seek__input"
          placeholder="Пошук розділу"
          aria-label="Пошук розділу"
        />
        <kbd v-if="query === ''" class="seek__kbd">⌘K</kbd>
      </label>
    </div>

    <div class="side__scroll">
      <div v-for="(group, gi) in groups" :key="group.title ?? gi" class="group">
        <p v-if="group.title !== null && !collapsed" class="group__title">{{ group.title }}</p>
        <hr v-else-if="group.title !== null" class="group__rule" />

        <RouterLink
          v-for="item in group.items"
          :key="item.name"
          class="item"
          :class="{ 'item--section': item.name === section }"
          :to="{ name: item.name }"
          :title="collapsed ? item.label : undefined"
          @click="emit('navigate')"
        >
          <AppIcon :name="item.icon" class="item__icon" />
          <span v-if="!collapsed" class="item__label">{{ item.label }}</span>
          <span v-if="!collapsed && item.badge !== undefined" class="item__badge">
            {{ item.badge }}
          </span>
          <span v-else-if="!collapsed && item.soon === true" class="item__soon">незабаром</span>
        </RouterLink>
      </div>

      <p v-if="nothingFound" class="empty">Нічого не знайшли</p>
    </div>

    <div class="side__foot">
      <RouterLink
        v-for="item in NAV_FOOTER"
        :key="item.name"
        class="item"
        :to="{ name: item.name }"
        :title="collapsed ? item.label : undefined"
        @click="emit('navigate')"
      >
        <AppIcon :name="item.icon" class="item__icon" />
        <span v-if="!collapsed" class="item__label">{{ item.label }}</span>
      </RouterLink>

      <div ref="userRoot" class="user">
        <button
          type="button"
          class="user__btn"
          :aria-expanded="userOpen"
          aria-haspopup="menu"
          :title="collapsed ? (auth.user?.email ?? '') : undefined"
          @click="userOpen = !userOpen"
        >
          <span class="user__avatar" aria-hidden="true">{{ initials }}</span>
          <span v-if="!collapsed" class="user__text">
            <span class="user__name">{{ auth.user?.full_name || 'Користувач' }}</span>
            <span class="user__mail">{{ auth.user?.email }}</span>
          </span>
          <AppIcon v-if="!collapsed" name="chevron" class="user__caret" />
        </button>

        <Transition name="pop">
          <div v-if="userOpen" class="umenu" role="menu">
            <button type="button" class="umenu__item" role="menuitem" @click="toWorkspaces">
              <AppIcon name="swap" />
              Змінити простір
            </button>
            <button
              type="button"
              class="umenu__item umenu__item--exit"
              role="menuitem"
              @click="signOut"
            >
              <AppIcon name="logout" />
              Вийти
            </button>
          </div>
        </Transition>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.side {
  display: grid;
  grid-template-rows: auto auto auto 1fr auto;
  gap: 12px;
  height: 100%;
  padding: 14px 12px 12px;
  border-right: 1px solid var(--line);
  background: var(--paper-sunk);
}

.side--rail {
  padding-inline: 10px;
}

.side__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 2px 4px 0;
}

.side--rail .side__top {
  flex-direction: column;
  gap: 10px;
  padding-inline: 0;
}

.side__brand {
  text-decoration: none;
}

.side__glyph {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 10px;
  background: var(--brand);
  color: #08210a;
}

.side__glyph svg {
  width: 19px;
  height: 19px;
}

.side__fold {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border: 0;
  border-radius: var(--r-xs);
  background: transparent;
  color: var(--ink-faint);
  transition:
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.side__fold:hover {
  background: var(--paper-raised);
  color: var(--ink);
}

.side__fold :deep(.icon) {
  width: 17px;
  height: 17px;
}

/* ── Пошук ─────────────────────────────────────────────────────── */

.side__search {
  padding-inline: 2px;
}

.seek {
  position: relative;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--paper-raised);
  transition: border-color 0.18s var(--ease);
}

.seek:focus-within {
  border-color: var(--line-strong);
}

.seek__icon {
  width: 16px;
  height: 16px;
  color: var(--ink-faint);
}

.seek__input {
  width: 100%;
  min-width: 0;
  height: 36px;
  border: 0;
  background: transparent;
  font-size: 13px;
  outline: none;
}

.seek__input::-webkit-search-cancel-button {
  appearance: none;
}

.seek__kbd {
  flex: none;
  padding: 2px 6px;
  border: 1px solid var(--line);
  border-radius: 6px;
  font-family: var(--font-body);
  font-size: 10px;
  font-weight: 600;
  color: var(--ink-faint);
}

.side__seek {
  display: grid;
  place-items: center;
  width: 100%;
  height: 36px;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--paper-raised);
  color: var(--ink-faint);
  transition: color 0.16s var(--ease);
}

.side__seek:hover {
  color: var(--ink);
}

.side__seek :deep(.icon) {
  width: 17px;
  height: 17px;
}

/* ── Пункти ────────────────────────────────────────────────────── */

.side__scroll {
  display: grid;
  align-content: start;
  gap: 14px;
  overflow-y: auto;
  padding: 2px;
  scrollbar-width: thin;
}

.group {
  display: grid;
  gap: 1px;
}

.group__title {
  padding: 6px 10px 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.group__rule {
  height: 1px;
  margin: 6px 8px;
  background: var(--line);
  border: 0;
}

.item {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 11px;
  padding: 9px 10px;
  border-radius: var(--r-sm);
  color: var(--ink-muted);
  font-size: 13.5px;
  font-weight: 500;
  text-decoration: none;
  white-space: nowrap;
  transition:
    background-color 0.16s var(--ease),
    color 0.16s var(--ease);
}

.side--rail .item {
  grid-template-columns: 1fr;
  justify-items: center;
  padding-inline: 0;
}

.item:hover {
  background: var(--paper-raised);
  color: var(--ink);
}

.item__icon {
  width: 19px;
  height: 19px;
  color: var(--ink-faint);
  transition: color 0.16s var(--ease);
}

.item:hover .item__icon {
  color: var(--ink-muted);
}

/* Активний пункт: щільна плашка й вертикальна засічка ліворуч. */
.item.router-link-exact-active,
.item--section {
  background: var(--paper-raised);
  color: var(--ink);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}

.item.router-link-exact-active .item__icon,
.item--section .item__icon {
  color: var(--brand-strong);
}

.item.router-link-exact-active::before,
.item--section::before {
  content: '';
  position: absolute;
  top: 50%;
  left: -2px;
  width: 3px;
  height: 18px;
  border-radius: 999px;
  background: var(--brand);
  transform: translateY(-50%);
  animation: mark 0.28s var(--ease);
}

.side--rail .item.router-link-exact-active::before,
.side--rail .item--section::before {
  left: -6px;
}

@keyframes mark {
  from {
    height: 0;
    opacity: 0;
  }
}

.item__label {
  overflow: hidden;
  text-overflow: ellipsis;
}

.item__badge {
  min-width: 20px;
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--danger-tint);
  color: var(--danger);
  font-size: 11px;
  font-weight: 700;
  text-align: center;
}

.item__soon {
  font-size: 9.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--ink-faint);
  opacity: 0;
  transition: opacity 0.18s var(--ease);
}

.item:hover .item__soon {
  opacity: 1;
}

.empty {
  padding: 8px 10px;
  font-size: 12.5px;
  color: var(--ink-faint);
}

/* ── Низ панелі ────────────────────────────────────────────────── */

.side__foot {
  display: grid;
  gap: 4px;
  padding: 8px 2px 0;
  border-top: 1px solid var(--line);
}

.user {
  position: relative;
}

.user__btn {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 7px 8px;
  border: 0;
  border-radius: var(--r-sm);
  background: transparent;
  text-align: left;
  transition: background-color 0.16s var(--ease);
}

.side--rail .user__btn {
  grid-template-columns: 1fr;
  justify-items: center;
  padding-inline: 0;
}

.user__btn:hover,
.user__btn[aria-expanded='true'] {
  background: var(--paper-raised);
}

.user__avatar {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: var(--ink);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
}

.user__text {
  display: grid;
  min-width: 0;
}

.user__name {
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user__mail {
  font-size: 11px;
  color: var(--ink-faint);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user__caret {
  width: 15px;
  height: 15px;
  color: var(--ink-faint);
}

.umenu {
  position: absolute;
  bottom: calc(100% + 8px);
  left: 0;
  z-index: 30;
  display: grid;
  gap: 2px;
  width: max(100%, 210px);
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  background: var(--paper-raised);
  box-shadow: var(--shadow-md);
}

.umenu__item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 8px;
  border: 0;
  border-radius: var(--r-xs);
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  transition: background-color 0.16s var(--ease);
}

.umenu__item:hover {
  background: var(--paper-sunk);
}

.umenu__item :deep(.icon) {
  width: 17px;
  height: 17px;
  color: var(--ink-faint);
}

.umenu__item--exit {
  color: var(--danger);
}

.umenu__item--exit :deep(.icon) {
  color: var(--danger);
}

.pop-enter-active,
.pop-leave-active {
  transition:
    opacity 0.18s var(--ease),
    transform 0.18s var(--ease);
}

.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.98);
}
</style>
