<script setup lang="ts">
import AuthShowcase from '@/components/auth/AuthShowcase.vue'
import BrandMark from '@/components/ui/BrandMark.vue'
</script>

<template>
  <div class="auth">
    <AuthShowcase class="auth__aside" />

    <main class="auth__main">
      <div class="auth__bar">
        <BrandMark class="auth__brand" compact />
        <div class="auth__switch"><slot name="switch" /></div>
      </div>

      <div class="auth__content">
        <slot />
      </div>

      <footer class="auth__foot">
        <span>© {{ new Date().getFullYear() }} Orenza</span>
        <span class="auth__foot-links">
          <a href="#" @click.prevent>Умови</a>
          <a href="#" @click.prevent>Конфіденційність</a>
          <a href="#" @click.prevent>Підтримка</a>
        </span>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.auth {
  display: grid;
  grid-template-columns: minmax(0, 1.02fr) minmax(0, 1fr);
  gap: 16px;
  min-height: 100dvh;
  padding: 16px;
  background: var(--paper);
}

.auth__aside {
  position: sticky;
  top: 16px;
  height: calc(100dvh - 32px);
}

.auth__main {
  display: grid;
  grid-template-rows: auto 1fr auto;
  gap: 24px;
  padding: 22px clamp(16px, 4vw, 56px) 18px;
}

.auth__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 44px;
}

.auth__brand {
  visibility: hidden;
}

.auth__switch {
  margin-left: auto;
  font-size: 13.5px;
  color: var(--ink-muted);
}

.auth__content {
  display: grid;
  align-content: center;
  width: 100%;
  max-width: 468px;
  margin: 0 auto;
  padding: 8px 0;
}

.auth__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  color: var(--ink-faint);
}

.auth__foot-links {
  display: flex;
  gap: 16px;
}

.auth__foot-links a {
  text-decoration: none;
  transition: color 0.2s var(--ease);
}

.auth__foot-links a:hover {
  color: var(--ink);
}

@media (width <= 1080px) {
  .auth {
    grid-template-columns: 1fr;
  }

  .auth__aside {
    display: none;
  }

  .auth__brand {
    visibility: visible;
  }

  .auth__main {
    padding: 14px 4px 12px;
  }
}

@media (width <= 520px) {
  .auth__foot {
    flex-direction: column-reverse;
    align-items: flex-start;
    gap: 8px;
  }
}
</style>
