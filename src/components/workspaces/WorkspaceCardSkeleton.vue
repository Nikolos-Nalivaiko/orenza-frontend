<template>
  <div class="skeleton" aria-hidden="true">
    <div class="skeleton__top">
      <span class="sk sk--mono" />
      <span class="sk sk--badge" />
    </div>

    <span class="sk sk--name" />

    <div class="skeleton__foot">
      <span class="sk sk--chip" />
      <span class="sk sk--date" />
      <span class="sk sk--go" />
    </div>
  </div>
</template>

<style scoped>
.skeleton {
  display: grid;
  gap: 8px;
  padding: 20px;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

.skeleton__top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 4px;
}

.skeleton__foot {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 14px;
  padding-top: 12px;
  border-top: 1px solid var(--line);
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

.sk--mono {
  width: 44px;
  height: 44px;
  border-radius: 14px;
}

.sk--badge {
  width: 84px;
  height: 22px;
  border-radius: 999px;
}

.sk--name {
  width: 68%;
  height: 17px;
}

.sk--chip {
  width: 70px;
  height: 20px;
  border-radius: 999px;
}

.sk--date {
  width: 96px;
  height: 12px;
}

.sk--go {
  width: 30px;
  height: 30px;
  margin-left: auto;
  border-radius: 50%;
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
</style>
