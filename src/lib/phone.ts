export const PHONE_CODE = '+380'
export const PHONE_LOCAL_DIGITS = 9

const GROUPS = [2, 3, 2, 2]

export interface ParsedPhone {
  digits: string
  front: number
}

export function parsePhone(value: string): ParsedPhone {
  let rest = value.replace(/\D/g, '')
  let front = 0

  if (rest.startsWith('380')) {
    rest = rest.slice(3)
    front += 3
  } else if (rest.startsWith('80')) {
    rest = rest.slice(2)
    front += 2
  }

  if (rest.startsWith('0')) {
    rest = rest.slice(1)
    front += 1
  }

  return { digits: rest.slice(0, PHONE_LOCAL_DIGITS), front }
}

export function phoneDigits(value: string): string {
  return parsePhone(value).digits
}

export function formatPhoneLocal(digits: string): string {
  const parts: string[] = []
  let rest = digits

  for (const size of GROUPS) {
    if (rest === '') {
      break
    }

    parts.push(rest.slice(0, size))
    rest = rest.slice(size)
  }

  return parts.join(' ')
}

export function toPhoneValue(digits: string): string {
  return digits === '' ? '' : `${PHONE_CODE}${digits}`
}

export function formatPhone(value: string): string {
  const digits = phoneDigits(value)

  return digits === '' ? '' : `${PHONE_CODE} ${formatPhoneLocal(digits)}`
}

export function isCompletePhone(value: string): boolean {
  return phoneDigits(value).length === PHONE_LOCAL_DIGITS
}

export function isBlankPhone(value: string): boolean {
  return phoneDigits(value) === ''
}
