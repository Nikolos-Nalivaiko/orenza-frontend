<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import PhotoViewer from '@/components/objects/PhotoViewer.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { formatAmount } from '@/lib/amount'
import { DUE_STATE_LABELS } from '@/lib/finance'
import { formatDay, todayIso } from '@/lib/objects'
import { trackObject } from '@/lib/track'
import { useObjectsStore } from '@/stores/objects'

/**
 * Публічна сторінка обʼєкта: замовник відкриває її за посиланням, без входу
 * й без реєстрації. Нічого редагувати тут не можна — це вітрина ходу робіт.
 *
 * Що саме сюди потрапляє, вирішує lib/track: собівартості, виконавців і
 * внутрішніх коментарів у цьому екрані немає навіть у даних.
 */

const route = useRoute()
const objects = useObjectsStore()

/** День фіксуємо на час життя екрана: прострочення не має мигати опівночі. */
const today = todayIso()

const token = computed(() => String(route.params.token ?? ''))

const object = computed(() => objects.findByToken(token.value))

const view = computed(() => (object.value === null ? null : trackObject(object.value, today)))

const photos = computed(() => (object.value === null ? [] : objects.objectPhotos(object.value.id)))

/** Індекс відкритого знімка; null — переглядач закритий. */
const viewing = ref<number | null>(null)

function openPhoto(index: number): void {
  if (photos.value.length > 0) {
    viewing.value = index
  }
}

const percent = computed(() =>
  view.value === null || view.value.readiness === null
    ? null
    : Math.round(view.value.readiness * 100),
)

const paidPercent = computed(() =>
  view.value === null ? 0 : Math.round(view.value.money.progress * 100),
)

onMounted(() => {
  if (!objects.loaded) {
    void objects.fetchTrack()
  }
})
</script>

<template>
  <div class="track">
    <p v-if="objects.isLoading" class="state">Відкриваємо сторінку обʼєкта…</p>

    <!-- Посилання не працює: обʼєкт видалили або токен набрали з помилкою.
         Що саме сталось — не кажемо: це сторонній відвідувач. -->
    <section v-else-if="view === null" class="state state--missing">
      <span class="state__icon" aria-hidden="true"><AppIcon name="alert" /></span>
      <h1 class="display state__title">Сторінка недоступна</h1>
      <p class="state__text">
        Посилання застаріло або більше не діє. Попросіть підрядника надіслати актуальне.
      </p>
    </section>

    <template v-else>
      <header class="hero">
        <!-- Фото першим і крупно: це те, заради чого сюди й заходять. -->
        <div class="shot" :class="{ 'shot--empty': !view.cover }">
          <img v-if="view.cover" class="shot__img" :src="view.cover" alt="" />
          <span v-else class="shot__ghost" aria-hidden="true"><AppIcon name="building" /></span>

          <span class="shot__status" :class="`shot__status--${view.status.value}`">
            {{ view.status.label }}
          </span>

          <!-- Знімки відкриваються прямо з обкладинки: саме по них сюди й
               заходять найчастіше. -->
          <button v-if="photos.length > 0" type="button" class="shot__more" @click="openPhoto(0)">
            <AppIcon name="image" />
            {{ photos.length }} фото
          </button>
        </div>

        <div class="intro">
          <h1 class="display intro__name">{{ view.name }}</h1>

          <p class="intro__addr">
            <AppIcon name="pin" />
            <span>{{ view.address }}</span>
          </p>

          <p v-if="view.description" class="intro__note">{{ view.description }}</p>
        </div>
      </header>

      <!-- Готовність — велика смуга, а не сухий рядок: це головне питання. -->
      <section class="card ready">
        <div class="ready__head">
          <h2 class="card__title">Готовність обʼєкта</h2>

          <p class="ready__percent">
            {{ percent === null ? '—' : `${percent}%` }}
          </p>
        </div>

        <span class="bar bar--tall">
          <span class="bar__fill" :style="{ width: `${percent ?? 0}%` }" />
        </span>

        <p class="ready__sub">
          <template v-if="view.works.total > 0">
            Виконано {{ view.works.done }} з {{ view.works.total }} робіт
          </template>
          <template v-else>Роботи ще плануються</template>
        </p>

        <dl class="dates">
          <div class="date">
            <dt>Початок за планом</dt>
            <dd>{{ view.plannedStart ? formatDay(view.plannedStart) : '—' }}</dd>
          </div>

          <div class="date">
            <dt>Завершення за планом</dt>
            <dd>{{ view.plannedFinish ? formatDay(view.plannedFinish) : '—' }}</dd>
          </div>

          <!-- Фактичні дати показуємо лише на завершеному обʼєкті: на півдорозі
               вони ще не остаточні. -->
          <template v-if="view.finished">
            <div v-if="view.actualStart" class="date">
              <dt>Початок фактично</dt>
              <dd>{{ formatDay(view.actualStart) }}</dd>
            </div>

            <div v-if="view.actualFinish" class="date date--done">
              <dt>Завершено</dt>
              <dd>{{ formatDay(view.actualFinish) }}</dd>
            </div>
          </template>
        </dl>
      </section>

      <section v-if="photos.length > 0" class="card">
        <div class="card__head">
          <h2 class="card__title">Фото з майданчика</h2>
          <p class="card__hint">Натисніть, щоб роздивитись</p>
        </div>

        <ul class="gallery">
          <li v-for="(photo, index) in photos" :key="photo.id">
            <button
              type="button"
              class="tile"
              :aria-label="`Відкрити фото: ${photo.name}`"
              @click="openPhoto(index)"
            >
              <img class="tile__img" :src="photo.src" :alt="photo.name" loading="lazy" />

              <span class="tile__zoom" aria-hidden="true"><AppIcon name="search" /></span>
            </button>
          </li>
        </ul>
      </section>

      <section v-if="view.services.length > 0" class="card">
        <h2 class="card__title">Роботи</h2>

        <div class="table table--svc">
          <div class="table__head">
            <span>Назва</span>
            <span class="num">Обсяг, план</span>
            <span class="num">Обсяг, факт</span>
            <span class="num">Сума</span>
            <span>Статус</span>
          </div>

          <ul class="table__rows">
            <li v-for="row in view.services" :key="row.id" class="table__row">
              <div class="cell">
                <p class="cell__name">{{ row.name }}</p>
                <p v-if="row.description" class="cell__note">{{ row.description }}</p>
              </div>

              <p class="cell cell--num" data-label="Обсяг, план">
                {{ formatAmount(row.plannedVolume) }} <span class="unit">{{ row.unit }}</span>
              </p>

              <p class="cell cell--num" data-label="Обсяг, факт">
                <template v-if="row.actualVolume === null">
                  <span class="soft">ще не завершено</span>
                </template>
                <template v-else>
                  {{ formatAmount(row.actualVolume) }} <span class="unit">{{ row.unit }}</span>
                </template>
              </p>

              <p class="cell cell--num cell--sum" data-label="Сума">
                {{ formatAmount(row.total) }} <span class="unit">₴</span>
              </p>

              <p class="cell" data-label="Статус">
                <span class="chip" :class="`chip--${row.status.value}`">{{
                  row.status.label
                }}</span>
              </p>
            </li>
          </ul>
        </div>
      </section>

      <section v-if="view.materials.length > 0" class="card">
        <h2 class="card__title">Матеріали</h2>

        <div class="table table--mat">
          <div class="table__head">
            <span>Назва</span>
            <span class="num">Кількість</span>
            <span>Статус</span>
          </div>

          <ul class="table__rows">
            <li v-for="row in view.materials" :key="row.id" class="table__row">
              <p class="cell cell__name">{{ row.name }}</p>

              <p class="cell cell--num" data-label="Кількість">
                {{ formatAmount(row.quantity) }} <span class="unit">{{ row.unit }}</span>
              </p>

              <p class="cell" data-label="Статус">
                <span class="chip" :class="`chip--${row.status.value}`">{{
                  row.status.label
                }}</span>
              </p>
            </li>
          </ul>
        </div>
      </section>

      <section class="card">
        <h2 class="card__title">Гроші за обʼєктом</h2>

        <dl class="figs">
          <div class="fig">
            <dt>Сума за договором</dt>
            <dd>{{ formatAmount(view.money.client) }} ₴</dd>
          </div>

          <div class="fig">
            <dt>Оплачено</dt>
            <dd>{{ formatAmount(view.money.paid) }} ₴</dd>
          </div>

          <div class="fig fig--due" :class="`fig--${view.money.state}`">
            <dt>{{ view.money.due < 0 ? 'Переплата' : 'Залишок' }}</dt>
            <dd>{{ formatAmount(Math.abs(view.money.due)) }} ₴</dd>
          </div>
        </dl>

        <span class="bar">
          <span class="bar__fill bar__fill--pay" :style="{ width: `${paidPercent}%` }" />
        </span>

        <p class="state__line" :class="`state__line--${view.money.state}`">
          {{ DUE_STATE_LABELS[view.money.state] }}
        </p>

        <template v-if="view.payments.length > 0">
          <h3 class="card__sub">Платежі</h3>

          <ul class="pays">
            <li
              v-for="row in view.payments"
              :key="row.id"
              class="pay"
              :class="{ 'pay--wait': !row.received }"
            >
              <span class="pay__day">
                {{ row.date ? formatDay(row.date) : 'дата уточнюється' }}
              </span>

              <span class="pay__sum">{{ formatAmount(row.amount) }} ₴</span>

              <span class="pay__note">{{ row.note ?? '' }}</span>

              <span class="pay__state">{{ row.received ? 'Отримано' : 'Очікується' }}</span>
            </li>
          </ul>
        </template>
      </section>

      <footer class="foot">
        <p class="foot__text">
          Сторінка оновлюється разом із роботами на обʼєкті — просто відкрийте це посилання ще раз.
        </p>
        <p class="foot__brand">Orenza</p>
      </footer>

      <!-- Той самий переглядач, що й у картці обʼєкта, але без видалення. -->
      <PhotoViewer
        v-if="viewing !== null"
        :photos="photos"
        :index="viewing"
        :removable="false"
        @move="viewing = $event"
        @close="viewing = null"
      />
    </template>
  </div>
</template>

<style scoped>
.track {
  display: grid;
  gap: 16px;
  width: min(980px, 100%);
  margin: 0 auto;
  padding: 24px 20px 40px;
}

/* ── Стани ─────────────────────────────────────────────────────── */

.state {
  padding: 28px;
  font-size: 14px;
  color: var(--ink-muted);
}

.state--missing {
  display: grid;
  justify-items: start;
  gap: 12px;
  padding: 40px;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

.state__icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--danger-tint);
  color: var(--danger);
}

.state__title {
  font-size: 20px;
}

.state__text {
  max-width: 52ch;
  font-size: 13.5px;
  line-height: 1.55;
  color: var(--ink-muted);
}

/* ── Шапка ─────────────────────────────────────────────────────── */

.hero {
  display: grid;
  gap: 16px;
}

.shot {
  position: relative;
  overflow: hidden;
  aspect-ratio: 21 / 9;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-sunk);
}

.shot__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.shot--empty {
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, var(--brand-tint), var(--paper-sunk));
}

.shot__ghost :deep(.icon) {
  width: 56px;
  height: 56px;
  color: var(--brand-strong);
  opacity: 0.5;
}

.shot__status {
  position: absolute;
  top: 14px;
  left: 14px;
  padding: 7px 14px;
  border-radius: 999px;
  background: var(--paper-raised);
  box-shadow: var(--shadow-sm);
  font-size: 12px;
  font-weight: 600;
  color: var(--ink);
}

.shot__status--in_progress {
  background: var(--brand);
  color: #08210a;
}

.shot__status--done {
  background: var(--ink);
  color: #fff;
}

.shot__more {
  position: absolute;
  right: 14px;
  bottom: 14px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 15px;
  border: 0;
  border-radius: 999px;
  background: rgb(9 13 10 / 62%);
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
  backdrop-filter: blur(6px);
  transition:
    background-color 0.18s var(--ease),
    transform 0.18s var(--ease);
}

.shot__more:hover {
  background: rgb(9 13 10 / 80%);
  transform: translateY(-1px);
}

.shot__more :deep(.icon) {
  width: 15px;
  height: 15px;
}

.intro {
  display: grid;
  gap: 8px;
}

.intro__name {
  font-size: clamp(24px, 3.4vw, 34px);
}

.intro__addr {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--ink-muted);
}

.intro__addr :deep(.icon) {
  flex: none;
  width: 16px;
  height: 16px;
  color: var(--ink-faint);
}

.intro__note {
  max-width: 72ch;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--ink-muted);
}

/* ── Картки ────────────────────────────────────────────────────── */

.card {
  display: grid;
  gap: 14px;
  padding: 22px 24px;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

.card__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px 16px;
}

.card__title {
  font-size: 14px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.card__hint {
  font-size: 11.5px;
  color: var(--ink-faint);
}

.card__sub {
  margin-top: 4px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

/* ── Готовність ────────────────────────────────────────────────── */

.ready__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.ready__percent {
  font-family: var(--font-display);
  font-size: clamp(28px, 5vw, 40px);
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.ready__sub {
  font-size: 13px;
  color: var(--ink-muted);
  font-variant-numeric: tabular-nums;
}

.bar {
  overflow: hidden;
  height: 6px;
  border-radius: 999px;
  background: var(--paper-sunk);
}

.bar--tall {
  height: 12px;
}

.bar__fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--brand);
  transition: width 0.5s var(--ease);
}

.bar__fill--pay {
  background: var(--ink-muted);
}

.dates {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px 20px;
  margin: 4px 0 0;
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.date {
  display: grid;
  gap: 4px;
}

.date dt {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.date dd {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.date--done dd {
  color: var(--brand-strong);
}

/* ── Фото ──────────────────────────────────────────────────────── */

.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.tile {
  position: relative;
  display: block;
  overflow: hidden;
  width: 100%;
  aspect-ratio: 4 / 3;
  padding: 0;
  border: 0;
  border-radius: var(--r-md);
  background: var(--paper-sunk);
}

.tile__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s var(--ease);
}

.tile:hover .tile__img,
.tile:focus-visible .tile__img {
  transform: scale(1.04);
}

/* Значок лупи — єдиний натяк, що знімок відкривається на весь екран. */
.tile__zoom {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgb(9 13 10 / 55%);
  color: #fff;
  opacity: 0;
  transform: translateY(4px);
  transition:
    opacity 0.18s var(--ease),
    transform 0.18s var(--ease);
}

.tile:hover .tile__zoom,
.tile:focus-visible .tile__zoom {
  opacity: 1;
  transform: none;
}

.tile__zoom :deep(.icon) {
  width: 14px;
  height: 14px;
}

/* ── Таблиці ───────────────────────────────────────────────────── */

.table {
  container-type: inline-size;

  display: grid;
  gap: 8px;
}

.table--svc {
  --cols: minmax(0, 2.2fr) 118px 138px 118px 130px;
}

.table--mat {
  --cols: minmax(0, 2.4fr) 132px 140px;
}

.table__head {
  display: grid;
  grid-template-columns: var(--cols);
  align-items: center;
  gap: 18px;
  padding: 0 12px 10px;
  border-bottom: 1px solid var(--line);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  color: var(--ink-faint);
}

.table__head .num {
  text-align: right;
}

.table__rows {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.table__row {
  display: grid;
  grid-template-columns: var(--cols);
  align-items: center;
  gap: 18px;
  padding: 12px;
  border-radius: var(--r-md);
  transition: background-color 0.16s var(--ease);
}

.table__row:hover {
  background: var(--paper);
}

.cell {
  min-width: 0;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.cell--num {
  text-align: right;
  font-weight: 600;
  white-space: nowrap;
}

.cell--sum {
  font-size: 13.5px;
}

.cell__name {
  font-size: 13.5px;
  font-weight: 600;
  letter-spacing: -0.01em;
}

.cell__note {
  margin-top: 2px;
  font-size: 12px;
  color: var(--ink-faint);
}

.unit {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

/* Факту ще немає — замість цифри чесний підпис, а не нуль. */
.soft {
  font-weight: 500;
  color: var(--ink-faint);
}

.chip {
  display: inline-block;
  padding: 4px 11px;
  border-radius: 999px;
  background: var(--paper-sunk);
  font-size: 11.5px;
  font-weight: 600;
  white-space: nowrap;
  color: var(--ink-muted);
}

.chip--in_progress,
.chip--ordered {
  background: var(--c-4-soft);
  color: var(--c-4);
}

.chip--done,
.chip--delivered,
.chip--used {
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.chip--planned,
.chip--needed {
  background: var(--amber-tint);
  color: #8a5c00;
}

/* ── Гроші ─────────────────────────────────────────────────────── */

.figs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin: 0;
}

.fig {
  display: grid;
  gap: 6px;
  padding: 14px 16px;
  border-radius: var(--r-md);
  background: var(--paper-sunk);
}

.fig dt {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.fig dd {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}

.fig--none {
  background: var(--danger-tint);
}

.fig--none dd {
  color: var(--danger);
}

.fig--partial {
  background: var(--amber-tint);
}

.fig--partial dd {
  color: #8a5c00;
}

.fig--paid,
.fig--over {
  background: var(--brand-tint);
}

.fig--paid dd,
.fig--over dd {
  color: var(--brand-strong);
}

.state__line {
  font-size: 12.5px;
  font-weight: 600;
  color: var(--ink-muted);
}

.state__line--none {
  color: var(--danger);
}

.state__line--partial {
  color: #8a5c00;
}

.state__line--paid,
.state__line--over {
  color: var(--brand-strong);
}

/* ── Платежі ───────────────────────────────────────────────────── */

.pays {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.pay {
  display: grid;
  grid-template-columns: 132px 132px minmax(0, 1fr) 116px;
  align-items: baseline;
  gap: 16px;
  padding: 12px;
  border-radius: var(--r-md);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.pay:nth-child(odd) {
  background: var(--paper);
}

.pay__day {
  font-weight: 600;
}

.pay__sum {
  font-size: 14px;
  font-weight: 600;
}

.pay__note {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink-muted);
}

.pay__state {
  text-align: right;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--brand-strong);
}

/* Очікуване ще не гроші — рядок тримається тихіше за отримане. */
.pay--wait {
  color: var(--ink-muted);
}

.pay--wait .pay__state {
  color: var(--ink-faint);
}

/* ── Низ ───────────────────────────────────────────────────────── */

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 8px 4px 0;
}

.foot__text {
  max-width: 60ch;
  font-size: 12px;
  color: var(--ink-faint);
}

.foot__brand {
  font-family: var(--font-display);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: -0.02em;
  color: var(--ink-faint);
}

/* Вузько — рядки таблиць розгортаються в картки: підписи беруться з
   data-label, бо шапки там немає. */
@container (width < 720px) {
  .table__head {
    display: none;
  }

  .table__rows {
    gap: 8px;
  }

  .table__row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px 16px;
    padding: 14px;
    border: 1px solid var(--line);
  }

  .table__row > .cell:first-child {
    grid-column: 1 / -1;
  }

  .cell--num {
    text-align: left;
  }

  .cell::before {
    content: attr(data-label);
    display: block;
    margin-bottom: 2px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-faint);
  }

  .cell:first-child::before,
  .cell__name::before {
    content: none;
  }
}

@media (width <= 620px) {
  .pay {
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 4px 12px;
  }

  .pay__note {
    grid-column: 1 / -1;
    white-space: normal;
  }
}
</style>
