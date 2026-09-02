<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import AppIcon from '@/components/ui/AppIcon.vue'
import { findNavItem } from '@/lib/navigation'

/**
 * Заглушка для розділів, яких ще немає на бекенді. Меню має бути повним із
 * першого дня — інакше незрозуміло, що взагалі вміє простір; тож пункт веде
 * не в нікуди, а на опис того, що тут зʼявиться.
 */
const PLANS: Record<string, string[]> = {
  estimates: [
    'Позиції матеріалів і робіт з одиницями та цінами',
    'Версії кошторису та історія змін по кожному рядку',
    'Акти виконаних робіт КБ-2в і довідки КБ-3',
  ],
  schedule: [
    'Календар робіт по обʼєктах і бригадах',
    'Залежності між етапами й критичний шлях',
    'Нагадування про наближення дедлайну',
  ],
  materials: [
    'Заявки на закупівлю та їх узгодження',
    'Прихід і списання по обʼєктах',
    'Залишки на складі й на майданчику',
  ],
  team: [
    'Запрошення в простір за посиланням або поштою',
    'Ролі: власник, виконроб, бригадир, бухгалтер',
    'Табелі робочого часу по бригадах',
  ],
  finance: [
    'Надходження від замовників і платежі підрядникам',
    'Каса й рух коштів по обʼєктах',
    'Прибутковість обʼєкта: кошторис проти факту',
  ],
  documents: [
    'Договори, додаткові угоди й специфікації',
    'Дозвільні документи та листування',
    'Спільний доступ до файлів усередині простору',
  ],
  settings: [
    'Назва простору, реквізити компанії, логотип',
    'Валюта, податки та шаблони документів',
    'Доступи, журнал дій і видалення простору',
  ],
}

const route = useRoute()

const item = computed(() => findNavItem(String(route.name)))
const plans = computed(() => PLANS[String(route.name)] ?? [])
</script>

<template>
  <div class="soon">
    <div class="soon__card">
      <span class="soon__icon" aria-hidden="true">
        <AppIcon v-if="item" :name="item.icon" />
      </span>

      <p class="soon__tag">У розробці</p>
      <h1 class="display soon__title">{{ item?.label }}</h1>
      <p class="soon__text">
        Розділ уже є в плані простору — зараз ми доводимо його до робочого стану. Ось що тут
        зʼявиться:
      </p>

      <ul class="soon__list">
        <li v-for="(plan, index) in plans" :key="plan" :style="{ '--i': index }">
          <span class="soon__bullet" aria-hidden="true" />
          {{ plan }}
        </li>
      </ul>

      <div class="soon__actions">
        <RouterLink class="btn btn--ghost btn--sm soon__back" :to="{ name: 'dashboard' }">
          Повернутись на дашборд
        </RouterLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.soon {
  display: grid;
  place-items: start center;
  padding-top: clamp(12px, 6vh, 60px);
}

.soon__card {
  display: grid;
  justify-items: start;
  gap: 10px;
  width: 100%;
  max-width: 560px;
  padding: 32px;
  border: 1px dashed var(--line-strong);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}

.soon__icon {
  display: grid;
  place-items: center;
  width: 46px;
  height: 46px;
  margin-bottom: 4px;
  border-radius: 15px;
  background: var(--brand-tint);
  color: var(--brand-strong);
}

.soon__icon :deep(.icon) {
  width: 23px;
  height: 23px;
}

.soon__tag {
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--ink-faint);
}

.soon__title {
  font-size: clamp(24px, 3vw, 32px);
}

.soon__text {
  max-width: 48ch;
  font-size: 14px;
  line-height: 1.55;
  color: var(--ink-muted);
}

.soon__list {
  display: grid;
  gap: 8px;
  margin: 8px 0 4px;
  padding: 0;
  list-style: none;
}

.soon__list li {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: start;
  gap: 10px;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--ink-muted);
  animation: rise 0.4s var(--ease) backwards;
  animation-delay: calc(var(--i, 0) * 70ms);
}

@keyframes rise {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}

.soon__bullet {
  width: 6px;
  height: 6px;
  margin-top: 8px;
  border-radius: 50%;
  background: var(--brand);
}

.soon__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 10px;
}

.soon__cta,
.soon__back {
  text-decoration: none;
}
</style>
