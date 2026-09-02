import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

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
