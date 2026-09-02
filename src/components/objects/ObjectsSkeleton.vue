<script setup lang="ts">
import type { ObjectsView } from '@/stores/objects'

/** Скелетон повторює форму подання — інакше список смикнеться, коли доїде. */
defineProps<{ view: ObjectsView }>()

const PLACEHOLDERS = [0, 1, 2, 3, 4]
</script>

<template>
  <div :class="view === 'cards' ? 'grid' : 'rows'" aria-hidden="true">
    <div v-for="index in PLACEHOLDERS" :key="index" :class="view === 'cards' ? 'card' : 'row'">
      <template v-if="view === 'cards'">
        <span class="sk sk--cover" />
        <div class="card__body">
          <span class="sk sk--name" />
          <span class="sk sk--line" />
          <span class="sk sk--bar" />
          <span class="sk sk--bar" />
        </div>
      </template>

      <template v-else>
        <div class="row__main">
          <span class="sk sk--name" />
          <span class="sk sk--line" />
        </div>
        <span class="sk sk--cell" />
        <span class="sk sk--cell" />
        <span class="sk sk--chip" />
        <span class="sk sk--cell" />
      </template>
    </div>
  </div>
</template>

<style scoped>
.rows {
  display: grid;
  gap: 2px;
}

.row {
  display: grid;
  grid-template-columns: minmax(190px, 2.4fr) minmax(120px, 1.3fr) 132px 136px 168px;
  align-items: center;
  gap: 12px;
  padding: 16px 14px;
}

.row__main {
  display: grid;
  gap: 8px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(272px, 1fr));
  gap: 14px;
}

.card {
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

.card__body {
  display: grid;
  gap: 10px;
  padding: 16px;
}

/* Мʼякий перелив замість різкого сірого прямокутника. */
.sk {
  display: block;
  border-radius: 8px;
  background: linear-gradient(
      90deg,
      var(--paper-sunk) 0%,
      rgb(255 255 255 / 90%) 45%,
      var(--paper-sunk) 90%
    )
    0 0 / 220% 100%;
  animation: shimmer 1.6s var(--ease) infinite;
}

.sk--cover {
  height: 128px;
  border-radius: 0;
}

.sk--name {
  width: 62%;
  height: 15px;
}

.sk--line {
  width: 82%;
  height: 11px;
}

.sk--bar {
  width: 100%;
  height: 10px;
}

.sk--cell {
  width: 74%;
  height: 12px;
}

.sk--chip {
  width: 96px;
  height: 22px;
  border-radius: 999px;
}

@keyframes shimmer {
  from {
    background-position: 140% 0;
  }

  to {
    background-position: -40% 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sk {
    animation: none;
    background: var(--paper-sunk);
  }
}

@media (width <= 1080px) {
  .row {
    grid-template-columns: minmax(0, 1fr);
  }

  .row .sk--cell,
  .row .sk--chip {
    display: none;
  }
}
</style>
