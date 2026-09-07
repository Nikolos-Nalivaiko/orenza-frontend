<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import TextField from '@/components/ui/TextField.vue'
import { formatPhoneLocal, parsePhone, PHONE_CODE, phoneDigits, toPhoneValue } from '@/lib/phone'

withDefaults(
  defineProps<{
    label?: string
    error?: string
    hint?: string
    optional?: boolean
    autofocus?: boolean
  }>(),
  { label: 'Телефон' },
)

const model = defineModel<string>({ required: true })

const display = ref(formatPhoneLocal(phoneDigits(model.value)))

watch(model, (value) => {
  const digits = phoneDigits(value)

  if (digits !== phoneDigits(display.value)) {
    display.value = formatPhoneLocal(digits)
  }
})

function digitsBefore(value: string, caret: number): number {
  return value.slice(0, caret).replace(/\D/g, '').length
}

function caretAfter(value: string, digits: number): number {
  if (digits === 0) {
    return 0
  }

  let seen = 0

  for (let index = 0; index < value.length; index += 1) {
    if (/\d/.test(value[index] ?? '')) {
      seen += 1

      if (seen === digits) {
        return index + 1
      }
    }
  }

  return value.length
}

function onInput(event: Event): void {
  const input = event.target

  if (!(input instanceof HTMLInputElement)) {
    return
  }

  const raw = input.value
  const caret = input.selectionStart ?? raw.length
  const { digits, front } = parsePhone(raw)
  const formatted = formatPhoneLocal(digits)
  const kept = Math.min(Math.max(digitsBefore(raw, caret) - front, 0), digits.length)

  display.value = formatted
  model.value = toPhoneValue(digits)

  void nextTick(() => {
    input.value = formatted

    const position = caretAfter(formatted, kept)

    input.setSelectionRange(position, position)
  })
}
</script>

<template>
  <TextField
    v-model="display"
    :label="label"
    type="tel"
    inputmode="tel"
    autocomplete="tel"
    placeholder="67 123 45 67"
    :error="error"
    :hint="hint"
    :optional="optional"
    :autofocus="autofocus"
    @input="onInput"
  >
    <template #prefix>{{ PHONE_CODE }}</template>
  </TextField>
</template>
