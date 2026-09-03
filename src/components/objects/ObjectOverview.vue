<script setup lang="ts">
import { computed } from 'vue'
import ObjectActivity from '@/components/objects/ObjectActivity.vue'
import ObjectFacts from '@/components/objects/ObjectFacts.vue'
import ObjectGallery from '@/components/objects/ObjectGallery.vue'
import ObjectMoney from '@/components/objects/ObjectMoney.vue'
import { objectActivity } from '@/lib/activity'
import type { ConstructionObject, ObjectDateField } from '@/lib/objects'
import type { ObjectSummary } from '@/lib/objectList'
import { useObjectsStore } from '@/stores/objects'

/**
 * Вкладка «Огляд»: те, чого немає в шапці, стрічка подій і фото з майданчика.
 * Порядок блоків — порядок питань до обʼєкта: що це → що з ним відбувалось →
 * як воно виглядає.
 */

const props = defineProps<{
  object: ConstructionObject
  summary: ObjectSummary
  /** День фіксує екран картки — дати в стрічці не мають мигати опівночі. */
  today: string
}>()

const emit = defineEmits<{ finance: [] }>()

const objects = useObjectsStore()

const photos = computed(() => objects.objectPhotos(props.object.id))

const entries = computed(() =>
  objectActivity(props.object, objects.activityOf(props.object.id), photos.value),
)

function setDescription(value: string): void {
  objects.setDescription(props.object.id, value)
}

function setDate(field: ObjectDateField, value: string): void {
  objects.setDate(props.object.id, field, value)
}

function setDiscount(percent: number | null, amount: number | null): void {
  objects.setDiscount(props.object.id, percent, amount)
}

function addNote(text: string): void {
  objects.addNote(props.object.id, text)
}

function addPhoto(src: string, name: string): void {
  objects.addPhoto(props.object.id, src, name)
}
</script>

<template>
  <div class="ov">
    <!-- Основне й ключові гроші — одна карта: цифри тут дублюють «Фінанси»
         рівно настільки, щоб не клацати на вкладку заради одного погляду. -->
    <section class="card">
      <ObjectFacts
        :object="object"
        @description="setDescription"
        @date="setDate"
        @discount="setDiscount"
      />

      <ObjectMoney :summary="summary" @open="emit('finance')" />
    </section>

    <section class="card">
      <ObjectActivity
        :entries="entries"
        :today="today"
        @note="addNote"
        @remove="objects.removeRecord"
      />
    </section>

    <section class="card">
      <ObjectGallery
        :photos="photos"
        :today="today"
        :volatile="objects.photosVolatile"
        @add="addPhoto"
        @remove="objects.removePhoto"
      />
    </section>
  </div>
</template>

<style scoped>
.ov {
  display: grid;
  gap: 12px;
}

.card {
  display: grid;
  gap: 14px;
  padding: 18px 20px;
  border: 1px solid var(--line);
  border-radius: var(--r-lg);
  background: var(--paper-raised);
}
</style>
