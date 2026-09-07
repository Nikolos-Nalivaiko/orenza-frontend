import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useAuthStore } from './stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

const auth = useAuthStore(pinia)

void auth.restore().then(() => {
  if (!auth.isAuthenticated && router.currentRoute.value.meta.requiresAuth === true) {
    void router.replace({ name: 'login' })
  }
})

app.mount('#app')

// Знімаємо заставку лише після першого кадру застосунку — без стрибка.
requestAnimationFrame(() => {
  const boot = document.getElementById('boot')

  if (boot === null) {
    return
  }

  boot.classList.add('is-done')

  // Таймер, а не transitionend: подія не приходить, якщо вкладка неактивна
  // або анімації вимкнено системними налаштуваннями.
  setTimeout(() => boot.remove(), 450)
})
