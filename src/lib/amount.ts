/**
 * Числа, які людина вводить руками. Поле може бути порожнім, недописаним або
 * з комою замість крапки — тож розбір і форматування живуть окремо від
 * доменів, які ними користуються (матеріали, послуги, далі — кошторис).
 */

/** «1 200,5» → 1200.5. Порожнє або нечислове значення дає null. */
export function parseAmount(value: string): number | null {
  const normalised = value.replace(/\s/g, '').replace(',', '.')

  if (normalised === '') {
    return null
  }

  const parsed = Number(normalised)

  return Number.isFinite(parsed) ? parsed : null
}

const amount = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 2 })

export function formatAmount(value: number): string {
  return amount.format(value)
}

/** Добуток двох введених вручну чисел; null, якщо бракує хоч одного. */
export function multiply(left: string, right: string): number | null {
  const first = parseAmount(left)
  const second = parseAmount(right)

  return first === null || second === null ? null : first * second
}
