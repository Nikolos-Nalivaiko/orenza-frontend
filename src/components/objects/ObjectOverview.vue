<script setup lang="ts">
import { computed } from 'vue'
import ObjectFacts from '@/components/objects/ObjectFacts.vue'
import ObjectGallery from '@/components/objects/ObjectGallery.vue'
import ObjectMoney from '@/components/objects/ObjectMoney.vue'
import type { ConstructionObject, ObjectDateField } from '@/lib/objects'
import type { ObjectSummary } from '@/lib/objectList'
import { useObjectsStore } from '@/stores/objects'

/**
 * Вкладка «Огляд»: те, чого немає в шапці, і фото з майданчика. Порядок
 * блоків — порядок питань до обʼєкта: що це → як воно виглядає.
 */

const props = defineProps<{
  object: ConstructionObject
  summary: ObjectSummary
  /** День фіксує екран картки — дати не мають мигати опівночі. */
  today: string
}>()

const emit = defineEmits<{ finance: [] }>()

const objects = useObjectsStore()

const photos = computed(() => objects.objectPhotos(props.object.id))

async function setDescription(value: string): Promise<void> {
  await objects.setDescription(props.object.id, value)
}

async function setDate(field: ObjectDateField, value: string): Promise<void> {
  await objects.setDate(props.object.id, field, value)
}

async function setDiscount(percent: number | null, amount: number | null): Promise<void> {
  await objects.setDiscount(props.object.id, percent, amount)
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
