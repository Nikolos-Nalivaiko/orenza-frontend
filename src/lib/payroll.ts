/**
 * Зарплата співробітника — облік, а не каса.
 *
 * Усе тут рахується з даних, які вже є: нарахування — це рядки бригад на
 * роботах обʼєктів, «людина × обсяг × ставка». Руками в зарплаті не вводять
 * нічого: ані сум, ані виплат. Картка людини лише збирає ці рядки з усіх
 * обʼєктів і показує з іншого боку — не «скільки коштує ця робота», а
 * «скільки на цій людині вже нараховано».
 *
 * Правити суму тут ніде: вона їде з обсягу й ставки, а їх правлять там, де
 * завели, — у роботі обʼєкта.
 */

import { formatMonth, type ConstructionObject, type ObjectStatus } from '@/lib/objects'
import { serviceUsedVolume, type ServiceStatus } from '@/lib/services'

/* ── Нарахування ───────────────────────────────────────────────── */

/**
 * Рядок нарахування — та сама «людина × обсяг × ставка», яку записали в
 * бригаді роботи. Тут вона лише прочитана з іншого боку, тож і правиться
 * там же, у картці обʼєкта.
 */
export interface PayrollCharge {
  /** Ключ рядка: обʼєкт, робота й місце людини в бригаді. */
  id: string
  objectId: number
  objectName: string
  objectAddress: string
  /** Статус самого обʼєкта — щоб картка не вигадувала свій. */
  objectStatus: { value: ObjectStatus; label: string }
  /** Обʼєкт в архіві — нарахування лишається, але воно вже з історії. */
  archived: boolean
  serviceId: number
  serviceName: string
  status: { value: ServiceStatus; label: string }
  unit: string
  volume: number
  /** Увесь обсяг роботи, на який ділиться бригада. */
  serviceVolume: number
  /** Частка людини в обсязі роботи, 0…1: скільки з неї взяв саме він. */
  share: number
  rate: number
  amount: number
  /** День, яким лягає нарахування; null — дат в обʼєкті немає взагалі. */
  at: string | null
}

/**
 * День нарахування. Власної дати в рядка бригади ще немає, тож беремо
 * найближчу за змістом: коли роботу закрили — день фактичного завершення
 * обʼєкта, поки вона в роботі — день, коли на обʼєкті фактично почали. Коли
 * фактів немає взагалі — день, коли обʼєкт завели.
 *
 * Це підказка «коли ця робота велась», а не дата руху грошей: гроші рухає
 * виплата, і день у неї свій, справжній.
 */
function chargeDay(object: ConstructionObject, status: ServiceStatus): string | null {
  const created = object.created_at === null ? null : object.created_at.slice(0, 10)

  if (status === 'done') {
    return object.actual_finished_at ?? object.actual_started_at ?? created
  }

  return object.actual_started_at ?? created
}

/** Усі нарахування людини — свіжі зверху. */
export function employeeCharges(
  objects: ConstructionObject[],
  employeeId: number,
): PayrollCharge[] {
  const charges: PayrollCharge[] = []

  for (const object of objects) {
    for (const service of object.services) {
      // Обсяг роботи береться так само, як у її картці: факт, щойно він
      // зʼявився, інакше план — інакше частка людини рахувалась би від нуля.
      const whole = serviceUsedVolume(service).value

      service.workers.forEach((worker, index) => {
        if (worker.employee_id !== employeeId) {
          return
        }

        charges.push({
          id: `${object.id}-${service.id}-${index}`,
          objectId: object.id,
          objectName: object.name,
          objectAddress: object.address,
          objectStatus: object.status,
          archived: object.archived_at !== null,
          serviceId: service.id,
          serviceName: service.name,
          status: service.status,
          unit: service.unit,
          volume: worker.volume,
          serviceVolume: whole,
          share: whole > 0 ? Math.min(1, worker.volume / whole) : 0,
          rate: worker.rate,
          amount: worker.volume * worker.rate,
          at: chargeDay(object, service.status.value),
        })
      })
    }
  }

  // Нарахування без дати не має витісняти ті, у яких вона є.
  return charges.sort((left, right) => (right.at ?? '').localeCompare(left.at ?? ''))
}

/* ── Зведення ──────────────────────────────────────────────────── */

export interface PayrollTotals {
  /** Нараховано за весь час — сума всіх рядків бригади з цією людиною. */
  accrued: number
  /** Нараховано за поточний місяць. */
  month: number
  /**
   * З нарахованого — по закритих роботах. Решта ще може змінитись разом із
   * обсягом, тож ці дві суми варто розрізняти.
   */
  done: number
  charges: number
  /** Обʼєктів, де людина зайнята зараз: робота не закрита й обʼєкт живий. */
  busy: number
  /** Обʼєктів за весь час, включно з архівом. */
  objects: number
}

export function payrollTotals(charges: PayrollCharge[], today: string): PayrollTotals {
  const month = today.slice(0, 7)

  const totals: PayrollTotals = {
    accrued: 0,
    month: 0,
    done: 0,
    charges: charges.length,
    busy: 0,
    objects: 0,
  }

  const objects = new Set<number>()
  const busy = new Set<number>()

  for (const charge of charges) {
    totals.accrued += charge.amount
    objects.add(charge.objectId)

    if (charge.at !== null && charge.at.slice(0, 7) === month) {
      totals.month += charge.amount
    }

    if (charge.status.value === 'done') {
      totals.done += charge.amount
    }

    // «Зайнятий зараз» — саме робота в роботі чи попереду.
    if (!charge.archived && charge.status.value !== 'done') {
      busy.add(charge.objectId)
    }
  }

  totals.objects = objects.size
  totals.busy = busy.size

  return totals
}

/** Підпис до цифри за місяць: «за вересень». */
export function payrollMonthLabel(today: string): string {
  return formatMonth(today)
}

/* ── Задіювання по обʼєктах ────────────────────────────────────── */

/**
 * Ті самі нарахування, згруповані по обʼєктах: «де людина працює й що саме
 * робить». Один обʼєкт — один блок, інакше три роботи на одній будові
 * читаються як три різні місця.
 */
export interface PayrollObjectGroup {
  objectId: number
  objectName: string
  address: string
  status: { value: ObjectStatus; label: string }
  archived: boolean
  rows: PayrollCharge[]
  amount: number
  /** Скільки з цих робіт уже закрито — підпис «2 з 3 закрито». */
  done: number
  /** Хоч одна незакрита робота — людина на обʼєкті ще зайнята. */
  busy: boolean
}

export function groupByObject(charges: PayrollCharge[]): PayrollObjectGroup[] {
  const groups = new Map<number, PayrollObjectGroup>()

  for (const charge of charges) {
    const group = groups.get(charge.objectId) ?? {
      objectId: charge.objectId,
      objectName: charge.objectName,
      address: charge.objectAddress,
      status: charge.objectStatus,
      archived: charge.archived,
      rows: [],
      amount: 0,
      done: 0,
      busy: false,
    }

    group.rows.push(charge)
    group.amount += charge.amount
    group.busy = group.busy || (!charge.archived && charge.status.value !== 'done')

    if (charge.status.value === 'done') {
      group.done += 1
    }

    groups.set(charge.objectId, group)
  }

  for (const group of groups.values()) {
    // Незакриті роботи зверху: саме вони відповідають на «що він робить зараз».
    group.rows.sort((left, right) => {
      const closed = Number(left.status.value === 'done') - Number(right.status.value === 'done')

      return closed === 0 ? right.amount - left.amount : closed
    })
  }

  // Живі обʼєкти зверху: архів — це вже історія, а не місце роботи.
  return [...groups.values()].sort((left, right) => {
    if (left.busy !== right.busy) {
      return left.busy ? -1 : 1
    }

    return left.archived === right.archived ? 0 : left.archived ? 1 : -1
  })
}
