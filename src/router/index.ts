import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import { NAV_FOOTER, NAV } from '@/lib/navigation'
import { useAuthStore } from '@/stores/auth'
import { useProgressStore } from '@/stores/progress'
import { useWorkspacesStore } from '@/stores/workspaces'
import LoginView from '@/views/LoginView.vue'

/**
 * Розділи, яких ще немає на бекенді, ведуть на спільну заглушку — але це
 * справжні маршрути: адреса, заголовок і активний пункт меню працюють.
 */
/** Розділи з власним екраном — заглушка їх не стосується. */
const READY = ['dashboard', 'objects']

const sections: RouteRecordRaw[] = [...NAV.flatMap((group) => group.items), ...NAV_FOOTER]
  .filter((item) => !READY.includes(item.name))
  .map((item) => ({
    path: item.name,
    name: item.name,
    component: () => import('@/views/SectionView.vue'),
    meta: { title: item.label },
  }))

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: { name: 'login' } },
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { guestOnly: true, title: 'Вхід' },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { guestOnly: true, title: 'Реєстрація' },
    },
    /**
     * Публічна сторінка обʼєкта для замовника: ані входу, ані простору вона
     * не вимагає — доступ дає сам токен у адресі, тож і id обʼєкта тут немає.
     */
    {
      path: '/track/:token',
      name: 'track',
      component: () => import('@/views/TrackView.vue'),
      meta: { title: 'Обʼєкт' },
    },
    {
      path: '/workspaces',
      name: 'workspaces',
      component: () => import('@/views/WorkspacesView.vue'),
      meta: { requiresAuth: true, title: 'Робочі простори' },
    },
    {
      path: '/w',
      component: () => import('@/layouts/WorkspaceLayout.vue'),
      meta: { requiresAuth: true, requiresWorkspace: true },
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { title: 'Дашборд', subtitle: 'Обʼєкти, гроші та команда за обраний період' },
        },
        {
          path: 'objects',
          name: 'objects',
          component: () => import('@/views/ObjectsView.vue'),
          meta: { title: 'Обʼєкти', subtitle: 'Усі будівельні обʼєкти простору' },
        },
        {
          path: 'objects/:id(\\d+)',
          name: 'object',
          component: () => import('@/views/ObjectView.vue'),
          meta: { title: 'Картка обʼєкта', section: 'objects' },
        },
        {
          path: 'objects/new',
          name: 'object-create',
          component: () => import('@/views/ObjectCreateView.vue'),
          meta: {
            title: 'Новий обʼєкт',
            subtitle: 'Загальна інформація про будівельний обʼєкт',
            // Розділ меню, який лишається активним на вкладених екранах.
            section: 'objects',
          },
        },
        ...sections,
      ],
    },
    // Стара адреса простору — лишаємо, щоб збережені посилання не ламались.
    { path: '/workspace', redirect: { name: 'dashboard' } },
    { path: '/:pathMatch(.*)*', redirect: { name: 'login' } },
  ],
})

router.beforeEach((to) => {
  const auth = useAuthStore()

  useProgressStore().start()

  if (to.meta.requiresAuth === true && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.meta.guestOnly === true && auth.isAuthenticated) {
    return { name: 'workspaces' }
  }

  // Всередину простору не пускаємо, поки його не обрано.
  if (to.meta.requiresWorkspace === true && useWorkspacesStore().current === null) {
    return { name: 'workspaces' }
  }

  return true
})

router.afterEach((to) => {
  useProgressStore().done()

  const title = typeof to.meta.title === 'string' ? to.meta.title : null

  document.title = title === null ? 'Orenza' : `${title} — Orenza`
})

export default router
