<script setup lang="ts">
withDefaults(
  defineProps<{
    anchor: string
    title: string
    lead?: string
    tone?: 'plain' | 'danger'
    form?: boolean
  }>(),
  { tone: 'plain', form: false },
)

const emit = defineEmits<{ submit: [] }>()
</script>

<template>
  <section :id="anchor" class="card" :class="`card--${tone}`" :aria-labelledby="`${anchor}-title`">
    <header class="card__head">
      <div class="card__text">
        <h2 :id="`${anchor}-title`" class="card__title">{{ title }}</h2>
        <p v-if="lead" class="card__lead">{{ lead }}</p>
      </div>

      <div v-if="$slots.aside" class="card__aside"><slot name="aside" /></div>
    </header>

    <component
      :is="form ? 'form' : 'div'"
      class="card__inner"
      :novalidate="form ? true : undefined"
      @submit.prevent="emit('submit')"
    >
      <div class="card__body"><slot /></div>

      <footer v-if="$slots.footer" class="card__foot"><slot name="footer" /></footer>
    </component>

    <div v-if="$slots.extra" class="card__extra"><slot name="extra" /></div>
  </section>
</template>

<style scoped>
.card {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--r-sm);
  background: var(--paper-raised);
  scroll-margin-top: 92px;
}

.card--danger {
  border-color: rgb(200 52 31 / 32%);
}

.card__head {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: 1px solid var(--line);
}

.card__text {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.card__title {
  font-size: 15px;
  font-weight: 600;
  letter-spacing: -0.015em;
}

.card--danger .card__title {
  color: var(--danger);
}

.card__lead {
  max-width: 70ch;
  font-size: 13px;
  line-height: 1.5;
  color: var(--ink-muted);
}

.card__aside {
  flex: none;
  margin-left: auto;
}

.card__inner {
  display: grid;
}

.card__body {
  display: grid;
}

.card__foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 16px;
  min-height: 60px;
  padding: 10px 24px;
  border-top: 1px solid var(--line);
  background: var(--paper);
}

.card__extra {
  border-top: 1px solid var(--line);
}

@media (width <= 900px) {
  .card {
    scroll-margin-top: 140px;
  }
}

@media (width <= 560px) {
  .card__head {
    padding: 16px 18px;
  }

  .card__foot {
    padding: 10px 18px;
  }
}
</style>
