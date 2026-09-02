<template>
  <div class="sk" aria-hidden="true">
    <div class="sk__tiles">
      <div v-for="i in 4" :key="i" class="sk__tile" :style="{ '--i': i - 1 }">
        <span class="bone bone--xs" />
        <span class="bone bone--lg" />
        <span class="bone bone--sm" />
      </div>
    </div>

    <div class="sk__grid">
      <div class="sk__col">
        <div class="sk__panel sk__panel--tall">
          <span class="bone bone--sm" />
          <span class="bone bone--plot" />
        </div>
        <div class="sk__panel">
          <span class="bone bone--sm" />
          <span v-for="i in 4" :key="i" class="bone bone--row" />
        </div>
      </div>

      <div class="sk__col">
        <div class="sk__panel">
          <span class="bone bone--sm" />
          <span class="bone bone--bar" />
          <span v-for="i in 4" :key="i" class="bone bone--row" />
        </div>
        <div class="sk__panel">
          <span class="bone bone--sm" />
          <span v-for="i in 5" :key="i" class="bone bone--row" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sk {
  display: grid;
  gap: 16px;
}

.sk__tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}

.sk__tile {
  display: grid;
  gap: 12px;
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
  animation: fade 0.4s var(--ease) backwards;
  animation-delay: calc(var(--i, 0) * 70ms);
}

@keyframes fade {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
}

.sk__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
  gap: 16px;
}

.sk__col {
  display: grid;
  align-content: start;
  gap: 16px;
}

.sk__panel {
  display: grid;
  gap: 12px;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

.bone {
  display: block;
  border-radius: 8px;
  background: linear-gradient(
      90deg,
      var(--paper-sunk) 0%,
      rgb(255 255 255 / 92%) 45%,
      var(--paper-sunk) 90%
    )
    0 0 / 220% 100%;
  animation: shine 1.6s var(--ease) infinite;
}

.bone--xs {
  width: 45%;
  height: 9px;
}

.bone--sm {
  width: 38%;
  height: 12px;
}

.bone--lg {
  width: 62%;
  height: 26px;
  border-radius: 10px;
}

.bone--row {
  width: 100%;
  height: 30px;
}

.bone--bar {
  width: 100%;
  height: 14px;
  border-radius: 999px;
}

.bone--plot {
  width: 100%;
  height: 240px;
  border-radius: var(--r-sm);
}

@keyframes shine {
  from {
    background-position: 140% 0;
  }

  to {
    background-position: -40% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bone {
    animation: none;
    background: var(--paper-sunk);
  }
}

@media (width <= 1040px) {
  .sk__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
