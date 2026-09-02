<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useTemplateRef } from 'vue'
import BrandMark from '@/components/ui/BrandMark.vue'
import { useCountUp } from '@/composables/useCountUp'
import { usePointerGlow } from '@/composables/usePointerGlow'

interface SiteCard {
  name: string
  address: string
  stage: string
  progress: number
  budget: string
  crew: string
}

const sites: SiteCard[] = [
  {
    name: 'ЖК «Пасаж», 3 черга',
    address: 'вул. Стеценка, 12 · Київ',
    stage: 'Монолітні роботи',
    progress: 68,
    budget: '2,4 млн ₴',
    crew: 'Бригада №3 · 9 осіб',
  },
  {
    name: 'Котеджне містечко «Липки»',
    address: 'с. Гатне · Київська обл.',
    stage: 'Покрівля',
    progress: 41,
    budget: '1,1 млн ₴',
    crew: 'Бригада №1 · 6 осіб',
  },
  {
    name: 'Реконструкція складу №4',
    address: 'вул. Промислова, 8 · Львів',
    stage: 'Оздоблення',
    progress: 87,
    budget: '860 тис ₴',
    crew: 'Підряд «Стальпром»',
  },
]

const feed = [
  'Бетонування 3-го рівня завершено',
  'Прийнято 24 т арматури',
  'Акт КБ-2в підписано',
  'Заявка на автокран узгоджена',
  'Новий лід: ремонт офісу, 240 м²',
  'Табель бригади №1 закрито',
]

const root = useTemplateRef<HTMLElement>('root')
usePointerGlow(root)

const index = ref(0)
const paused = ref(false)
const active = computed(() => sites[index.value] ?? sites[0]!)

let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  timer = setInterval(() => {
    if (!paused.value) {
      index.value = (index.value + 1) % sites.length
    }
  }, 4600)
})

onBeforeUnmount(() => clearInterval(timer))

const objects = useCountUp(12)
const estimate = useCountUp(4.8)
const acts = useCountUp(37)
</script>

<template>
  <aside ref="root" class="showcase">
    <div class="showcase__grid" aria-hidden="true" />
    <div class="showcase__glow" aria-hidden="true" />

    <header class="showcase__head">
      <BrandMark tone="light" />
      <span class="showcase__pill">
        <span class="showcase__dot" aria-hidden="true" />
        дані оновлено щойно
      </span>
    </header>

    <div class="showcase__lead">
      <h2 class="display showcase__title">
        Обʼєкти, кошториси і бригади — <em>в одному вікні</em>
      </h2>
      <p class="showcase__sub">
        Orenza збирає забудову, підряд і закупівлі в один процес: від першого ліда до підписаного
        акта виконаних робіт.
      </p>
    </div>

    <dl class="stats">
      <div class="stats__item">
        <dt>Обʼєктів у роботі</dt>
        <dd>{{ Math.round(objects) }}</dd>
      </div>
      <div class="stats__item">
        <dt>Кошторис, ₴</dt>
        <dd>{{ estimate.toFixed(1) }}<span>млн</span></dd>
      </div>
      <div class="stats__item">
        <dt>Актів за тиждень</dt>
        <dd>{{ Math.round(acts) }}</dd>
      </div>
    </dl>

    <div class="card" @pointerenter="paused = true" @pointerleave="paused = false">
      <Transition name="swap" mode="out-in">
        <div :key="active.name" class="card__body">
          <div class="card__top">
            <span class="card__stage">{{ active.stage }}</span>
            <span class="card__progress-value">{{ active.progress }}%</span>
          </div>

          <h3 class="card__name">{{ active.name }}</h3>
          <p class="card__address">{{ active.address }}</p>

          <div class="card__track">
            <span class="card__fill" :style="{ width: `${active.progress}%` }" />
          </div>

          <div class="card__meta">
            <span>{{ active.budget }}</span>
            <span class="card__sep" aria-hidden="true">·</span>
            <span>{{ active.crew }}</span>
          </div>
        </div>
      </Transition>

      <div class="card__dots">
        <button
          v-for="(site, i) in sites"
          :key="site.name"
          type="button"
          class="card__dot"
          :class="{ 'card__dot--on': i === index }"
          :aria-label="`Показати обʼєкт: ${site.name}`"
          @click="index = i"
        />
      </div>
    </div>

    <div class="ticker" aria-hidden="true">
      <div class="ticker__row">
        <span v-for="item in [...feed, ...feed]" :key="item" class="ticker__item">
          <span class="ticker__bullet" />
          {{ item }}
        </span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.showcase {
  --mx: 50;
  --my: 38;

  position: relative;
  display: grid;
  grid-template-rows: auto 1fr auto auto auto;
  gap: 30px;
  overflow: hidden;
  padding: 38px 40px 30px;
  border-radius: var(--r-xl);
  background: radial-gradient(120% 100% at 20% 0%, #16211a 0%, #0b100d 55%, #080b09 100%);
  color: #fff;
  isolation: isolate;
}

/* Креслярська сітка */
.showcase__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgb(255 255 255 / 5%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 5%) 1px, transparent 1px),
    linear-gradient(rgb(255 255 255 / 2.5%) 1px, transparent 1px),
    linear-gradient(90deg, rgb(255 255 255 / 2.5%) 1px, transparent 1px);
  background-size:
    112px 112px,
    112px 112px,
    28px 28px,
    28px 28px;
  mask-image: linear-gradient(180deg, #000 0%, rgb(0 0 0 / 35%) 70%, transparent 100%);
  z-index: -2;
}

/* Пляма світла за курсором */
.showcase__glow {
  position: absolute;
  inset: -20%;
  background: radial-gradient(
    38% 38% at calc(var(--mx) * 1%) calc(var(--my) * 1%),
    rgb(56 176 0 / 26%) 0%,
    transparent 70%
  );
  transition: opacity 0.4s var(--ease);
  z-index: -1;
}

.showcase__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.showcase__pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 12px;
  border: 1px solid rgb(255 255 255 / 14%);
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 62%);
}

.showcase__dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--brand);
  box-shadow: 0 0 0 0 var(--brand-glow);
  animation: pulse 2.4s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgb(56 176 0 / 55%);
  }

  70% {
    box-shadow: 0 0 0 9px rgb(56 176 0 / 0%);
  }

  100% {
    box-shadow: 0 0 0 0 rgb(56 176 0 / 0%);
  }
}

.showcase__lead {
  align-self: end;
  display: grid;
  gap: 18px;
}

.showcase__title {
  max-width: 17ch;
  font-size: clamp(32px, 3.3vw, 52px);
  line-height: 1.06;
}

/* Акцентна фраза завжди займає власний рядок — так заголовок не рветься. */
.showcase__title em {
  display: block;
  font-style: normal;
  color: var(--brand-soft);
}

.showcase__sub {
  max-width: 42ch;
  font-size: 14.5px;
  line-height: 1.6;
  color: rgb(255 255 255 / 60%);
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1px;
  margin: 0;
  padding: 18px 0;
  border-top: 1px solid rgb(255 255 255 / 10%);
  border-bottom: 1px solid rgb(255 255 255 / 10%);
}

.stats__item {
  display: grid;
  gap: 5px;
  padding-right: 14px;
}

.stats__item + .stats__item {
  padding-left: 18px;
  border-left: 1px solid rgb(255 255 255 / 8%);
}

.stats dt {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 42%);
}

.stats dd {
  margin: 0;
  font-family: var(--font-display);
  font-size: 25px;
  font-weight: 600;
  letter-spacing: -0.04em;
  font-variant-numeric: tabular-nums;
}

.stats dd span {
  margin-left: 5px;
  font-family: var(--font-body);
  font-size: 12px;
  font-weight: 600;
  color: rgb(255 255 255 / 45%);
}

/* Картка обʼєкта з легким паралаксом за курсором */
.card {
  display: grid;
  gap: 16px;
  padding: 22px;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: var(--r-lg);
  background: rgb(255 255 255 / 5%);
  backdrop-filter: blur(14px);
  transform: translate3d(calc((var(--mx) - 50) * 0.06px), calc((var(--my) - 50) * 0.05px), 0);
  transition: transform 0.4s var(--ease);
}

.card__body {
  display: grid;
  gap: 9px;
}

.card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card__stage {
  padding: 5px 10px;
  border-radius: 999px;
  background: rgb(56 176 0 / 16%);
  color: var(--brand-soft);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.card__progress-value {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.card__name {
  font-size: 17px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.card__address {
  font-size: 13px;
  color: rgb(255 255 255 / 52%);
}

.card__track {
  height: 6px;
  margin-top: 4px;
  border-radius: 999px;
  background: rgb(255 255 255 / 10%);
  overflow: hidden;
}

.card__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--brand-strong), var(--brand-soft));
  transition: width 0.7s var(--ease);
}

.card__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: rgb(255 255 255 / 62%);
}

.card__sep {
  color: rgb(255 255 255 / 28%);
}

.card__dots {
  display: flex;
  gap: 6px;
}

.card__dot {
  width: 22px;
  height: 4px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: rgb(255 255 255 / 18%);
  transition:
    background-color 0.25s var(--ease),
    width 0.25s var(--ease);
}

.card__dot--on {
  width: 38px;
  background: var(--brand);
}

.swap-enter-active,
.swap-leave-active {
  transition:
    opacity 0.3s var(--ease),
    transform 0.3s var(--ease);
}

.swap-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.swap-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Стрічка подій */
.ticker {
  overflow: hidden;
  padding-top: 18px;
  border-top: 1px solid rgb(255 255 255 / 10%);
  mask-image: linear-gradient(90deg, transparent, #000 6%, #000 88%, transparent);
}

.ticker__row {
  display: flex;
  gap: 26px;
  width: max-content;
  animation: marquee 34s linear infinite;
}

.ticker__item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  white-space: nowrap;
  color: rgb(255 255 255 / 45%);
}

.ticker__bullet {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--brand);
}

@keyframes marquee {
  to {
    transform: translateX(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ticker__row {
    animation: none;
  }
}
</style>
