<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  COVER_SRCSET_VARIANTS,
  coverPlaceholder,
  coverPosition,
  coverSrcset,
  type CoverFocus,
  type CoverVariant,
  type ObjectCover,
} from '@/lib/cover'

const props = withDefaults(
  defineProps<{
    cover: ObjectCover | null
    name: string
    variant: CoverVariant
    sizes?: string
    focus?: CoverFocus | null
    eager?: boolean
    monogram?: boolean
  }>(),
  { sizes: undefined, focus: null, eager: false, monogram: true },
)

const loaded = ref(false)

const placeholder = computed(() => coverPlaceholder(props.name))

const src = computed(() => props.cover?.[props.variant] ?? null)

const srcset = computed(() =>
  props.cover === null ? undefined : coverSrcset(props.cover, COVER_SRCSET_VARIANTS[props.variant]),
)

const position = computed(() => coverPosition(props.focus ?? props.cover?.focus))

watch(src, () => {
  loaded.value = false
})
</script>

<template>
  <span
    class="cimg"
    :class="{ 'cimg--empty': cover === null }"
    :style="{ background: cover === null ? placeholder.background : cover.color }"
  >
    <img
      v-if="src !== null"
      :key="src"
      class="cimg__img"
      :class="{ 'cimg__img--ready': loaded }"
      :src="src"
      :srcset="srcset"
      :sizes="sizes"
      :style="{ objectPosition: position }"
      :loading="eager ? 'eager' : 'lazy'"
      :fetchpriority="eager ? 'high' : undefined"
      decoding="async"
      alt=""
      @load="loaded = true"
    />

    <span
      v-else-if="monogram"
      class="cimg__mono"
      :style="{ color: placeholder.ink }"
      aria-hidden="true"
      >{{ placeholder.initials }}</span
    >

    <slot />
  </span>
</template>

<style scoped>
.cimg {
  position: relative;
  display: block;
  overflow: hidden;
  width: 100%;
  height: 100%;
  container-type: size;
}

.cimg__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transform: scale(1.015);
  transition:
    opacity 0.45s var(--ease),
    transform 0.6s var(--ease);
}

.cimg__img--ready {
  opacity: 1;
  transform: none;
}

.cimg__mono {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  font-family: var(--font-display);
  font-size: clamp(11px, 34cqmin, 72px);
  font-weight: 600;
  letter-spacing: -0.04em;
  opacity: 0.55;
  user-select: none;
}
</style>
