<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import BrandMark from '@/components/ui/BrandMark.vue'
import WorkspaceCard from '@/components/workspaces/WorkspaceCard.vue'
import WorkspaceCardSkeleton from '@/components/workspaces/WorkspaceCardSkeleton.vue'
import WorkspaceCreateDialog from '@/components/workspaces/WorkspaceCreateDialog.vue'
import { useAuthStore } from '@/stores/auth'
import { useWorkspacesStore } from '@/stores/workspaces'
import type { WorkspaceForm } from '@/lib/workspaces'

const auth = useAuthStore()
const workspaces = useWorkspacesStore()
const router = useRouter()

const creating = ref(false)

const ownerName = computed(() => auth.user?.full_name ?? '')

/** 1 простір, 2–4 простори, 5+ просторів. */
const countLabel = computed(() => {
  const count = workspaces.items.length
  const tail = count % 100 >= 11 && count % 100 <= 14 ? 0 : count % 10

  if (tail === 1) {
    return `${count} простір`
  }

  return tail >= 2 && tail <= 4 ? `${count} простори` : `${count} просторів`
})

const initials = computed(() => {
  const first = auth.user?.first_name?.[0] ?? ''
  const last = auth.user?.last_name?.[0] ?? ''

  return `${first}${last}`.toUpperCase() || 'O'
})

/** Поки список їде, заголовок нейтральний — щоб текст не стрибав. */
const state = computed(() => {
  if (workspaces.isLoading) {
    return 'loading'
  }

  return workspaces.isEmpty ? 'empty' : 'list'
})

const heading = computed(() =>
  state.value === 'list' ? 'Оберіть робочий простір' : 'Робочі простори',
)

const subheading = computed(() => {
  if (state.value === 'loading') {
    return 'Збираємо простори, у яких ви працюєте…'
  }

  return state.value === 'empty'
    ? 'Простір — це рамка для обʼєктів, кошторисів і команди.'
    : 'Обʼєкти, кошториси та доступи живуть усередині простору. Оберіть, з яким працюєте зараз.'
})

onMounted(() => workspaces.fetchAll())

function openCreate(): void {
  workspaces.reset()
  creating.value = true
}

function closeCreate(): void {
  workspaces.reset()
  creating.value = false
}

async function submit(form: WorkspaceForm): Promise<void> {
  const created = await workspaces.create(form)

  if (created === null) {
    return
  }

  creating.value = false
  workspaces.select(created.id)
  await router.push({ name: 'dashboard' })
}

async function open(id: number): Promise<void> {
  workspaces.select(id)
  await router.push({ name: 'dashboard' })
}

async function signOut(): Promise<void> {
  auth.logout()
  await router.push({ name: 'login' })
}
</script>

<template>
  <div class="picker">
    <header class="picker__bar">
      <BrandMark compact />

      <div class="picker__user">
        <span class="picker__avatar" aria-hidden="true">{{ initials }}</span>
        <span class="picker__email">{{ auth.user?.email }}</span>
        <button type="button" class="btn btn--ghost btn--sm" @click="signOut">Вийти</button>
      </div>
    </header>

    <main class="picker__main">
      <div class="picker__head">
        <div class="picker__head-text">
          <p class="eyebrow">Робочі простори</p>

          <div class="swap">
            <Transition name="text">
              <h1 :key="heading" class="display picker__title">{{ heading }}</h1>
            </Transition>
          </div>

          <div class="swap">
            <Transition name="text">
              <p :key="subheading" class="muted picker__sub">{{ subheading }}</p>
            </Transition>
          </div>
        </div>

        <button
          v-if="!workspaces.isLoading && !workspaces.isEmpty"
          type="button"
          class="btn btn--ink picker__new"
          @click="openCreate"
        >
          <svg viewBox="0 0 18 18" aria-hidden="true" class="picker__plus">
            <path
              d="M9 3.5v11M3.5 9h11"
              stroke="currentColor"
              stroke-width="1.8"
              stroke-linecap="round"
            />
          </svg>
          Створити простір
        </button>
      </div>

      <div v-if="workspaces.isLoading || !workspaces.isEmpty" class="toolbar">
        <span class="toolbar__count">
          <template v-if="workspaces.isLoading">
            <span class="sk-count" aria-hidden="true" />
            <span class="sr-only">Завантажуємо простори</span>
          </template>
          <template v-else>{{ countLabel }}</template>
        </span>
      </div>

      <div class="swap">
        <Transition name="content">
          <section v-if="workspaces.isLoading" key="loading" class="picker__grid">
            <WorkspaceCardSkeleton
              v-for="i in 3"
              :key="i"
              :style="{ '--i': i - 1 }"
              class="fade-in"
            />
          </section>

          <section v-else-if="workspaces.isEmpty" key="empty" class="empty fade-in">
            <span class="empty__icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M3 20V8.6L12 4l9 4.6V20" stroke="currentColor" stroke-width="1.6" />
                <path
                  d="M8.5 20v-6h7v6M2 20h20"
                  stroke="currentColor"
                  stroke-width="1.6"
                  stroke-linecap="round"
                />
              </svg>
            </span>

            <h2 class="empty__title">Активних просторів немає</h2>
            <p class="empty__text">
              Створіть перший: особистий — для власних обʼєктів, простір компанії — для бригад,
              кошторисів і спільних доступів.
            </p>

            <button type="button" class="btn btn--primary" @click="openCreate">
              <span>Створити простір</span>
              <svg class="btn__arrow" viewBox="0 0 18 18" aria-hidden="true">
                <path
                  d="M3.5 9h11M10 4.5 14.5 9 10 13.5"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </section>

          <TransitionGroup v-else key="list" tag="section" name="cards" class="picker__grid" appear>
            <WorkspaceCard
              v-for="(workspace, index) in workspaces.items"
              :key="workspace.id"
              :style="{ '--i': index }"
              :workspace="workspace"
              :current="workspace.id === workspaces.currentId"
              :owned="workspace.owner_id === auth.user?.id"
              @open="open(workspace.id)"
            />

            <button
              key="add"
              type="button"
              class="add"
              :style="{ '--i': workspaces.items.length }"
              @click="openCreate"
            >
              <span class="add__plus" aria-hidden="true">
                <svg viewBox="0 0 18 18">
                  <path
                    d="M9 3.5v11M3.5 9h11"
                    stroke="currentColor"
                    stroke-width="1.8"
                    stroke-linecap="round"
                  />
                </svg>
              </span>
              <span class="add__text">
                <strong>Новий простір</strong>
                <span class="muted">Ще одна компанія або особистий</span>
              </span>
            </button>
          </TransitionGroup>
        </Transition>
      </div>
    </main>

    <Teleport to="body">
      <Transition name="dialog">
        <WorkspaceCreateDialog
          v-if="creating"
          :personal-taken="workspaces.hasPersonal"
          :owner-name="ownerName"
          :saving="workspaces.isSaving"
          :server-error="workspaces.error"
          @submit="submit"
          @close="closeCreate"
        />
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.picker {
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 30px;
  min-height: 100dvh;
  padding: 22px clamp(18px, 5vw, 60px) 48px;
}

.picker__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.picker__user {
  display: flex;
  align-items: center;
  gap: 12px;
}

.picker__avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--ink);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}

.picker__email {
  font-size: 13px;
  color: var(--ink-muted);
}

.picker__main {
  display: grid;
  align-content: start;
  gap: 22px;
  width: 100%;
  max-width: 1180px;
  margin: 0 auto;
  padding-top: clamp(16px, 5vh, 56px);
}

.picker__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
}

.picker__head-text {
  display: grid;
  gap: 10px;
}

.picker__new {
  flex: none;
}

.picker__plus {
  width: 16px;
  height: 16px;
}

.toolbar {
  padding-bottom: 14px;
  border-bottom: 1px solid var(--line);
}

.toolbar__count {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.picker__title {
  font-size: clamp(30px, 4vw, 44px);
}

.picker__sub {
  max-width: 56ch;
  font-size: 14.5px;
}

/*
 * Старий і новий вміст лежать в одній клітинці ґрида, тож перетікають
 * один в одного на місці. З mode="out-in" елемент на час переходу зникав
 * зовсім — і все, що нижче, підстрибувало вгору.
 */
.swap {
  display: grid;
}

.swap > * {
  grid-area: 1 / 1;
}

/* Той, що йде, не має перехоплювати кліки по тому, що вже зʼявився. */
.text-leave-active,
.content-leave-active {
  pointer-events: none;
}

/* Заголовок і опис міняються перетіканням, а не стрибком. */
.text-enter-active,
.text-leave-active {
  transition:
    opacity 0.24s var(--ease),
    transform 0.24s var(--ease);
}

.text-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.text-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/*
 * Скелетони гаснуть, а вміст у цей же час заїжджає власною анімацією
 * (.cards-* або .fade-in) — тому enter-переходу тут навмисно немає.
 */
.content-leave-active {
  transition: opacity 0.3s var(--ease);
}

.content-leave-to {
  opacity: 0;
}

/* Каскад: кожна наступна картка вмикається трохи пізніше. */
.cards-enter-active {
  transition:
    opacity 0.42s var(--ease),
    transform 0.42s var(--ease);
  transition-delay: calc(var(--i, 0) * 70ms);
}

.cards-leave-active {
  position: absolute;
  transition:
    opacity 0.24s var(--ease),
    transform 0.24s var(--ease);
}

.cards-enter-from {
  opacity: 0;
  transform: translateY(14px) scale(0.985);
}

.cards-leave-to {
  opacity: 0;
  transform: scale(0.97);
}

.cards-move {
  transition: transform 0.42s var(--ease);
}

.fade-in {
  animation: fade-in 0.45s var(--ease) backwards;
  animation-delay: calc(var(--i, 0) * 80ms);
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
}

.sk-count {
  display: inline-block;
  width: 92px;
  height: 12px;
  border-radius: 999px;
  background: linear-gradient(
      90deg,
      var(--paper-sunk) 0%,
      rgb(255 255 255 / 90%) 45%,
      var(--paper-sunk) 90%
    )
    0 0 / 220% 100%;
  animation: shimmer 1.6s var(--ease) infinite;
}

@keyframes shimmer {
  from {
    background-position: 140% 0;
  }

  to {
    background-position: -40% 0;
  }
}

/* Без анімації градієнт застигає у випадковій фазі — краще рівна плашка. */
@media (prefers-reduced-motion: reduce) {
  .sk-count {
    animation: none;
    background: var(--paper-sunk);
  }
}

.empty {
  display: grid;
  justify-items: start;
  gap: 12px;
  max-width: 560px;
  padding: 34px 32px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

.empty__icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  border-radius: 15px;
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.empty__icon svg {
  width: 23px;
  height: 23px;
}

.empty__title {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.empty__text {
  max-width: 52ch;
  font-size: 14px;
  line-height: 1.55;
  color: var(--ink-muted);
}

.empty .btn {
  margin-top: 6px;
}

.picker__grid {
  /* Картка, що йде, стає absolute — якір відліку має бути тут, не на body. */
  position: relative;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
  align-content: start;
}

.add {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 14px;
  min-height: 160px;
  padding: 20px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-lg);
  background: transparent;
  text-align: left;
  transition:
    border-color 0.22s var(--ease),
    background-color 0.22s var(--ease),
    transform 0.22s var(--ease);
}

.add:hover {
  transform: translateY(-3px);
  border-color: var(--brand);
  background: var(--brand-tint);
}

.add__plus {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 13px;
  background: var(--paper-sunk);
  color: var(--ink);
  transition:
    background-color 0.22s var(--ease),
    color 0.22s var(--ease);
}

.add:hover .add__plus {
  background: var(--brand);
  color: #08210a;
}

.add__plus svg {
  width: 18px;
  height: 18px;
}

.add__text {
  display: grid;
  gap: 2px;
  font-size: 14.5px;
}

.add__text span {
  font-size: 12.5px;
  line-height: 1.4;
}

@media (width <= 780px) {
  .picker__head {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (width <= 520px) {
  .picker__email {
    display: none;
  }
}
</style>

<style>
/* Анімація діалогу живе поза scoped — компонент телепортується в body. */
.dialog-enter-active,
.dialog-leave-active {
  transition: opacity 0.22s var(--ease);
}

.dialog-enter-active .dialog,
.dialog-leave-active .dialog {
  transition:
    transform 0.26s var(--ease),
    opacity 0.26s var(--ease);
}

.dialog-enter-from,
.dialog-leave-to {
  opacity: 0;
}

.dialog-enter-from .dialog,
.dialog-leave-to .dialog {
  opacity: 0;
  transform: translateY(14px) scale(0.985);
}
</style>
