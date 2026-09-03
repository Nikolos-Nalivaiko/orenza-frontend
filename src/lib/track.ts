/**
 * Публічна сторінка обʼєкта — те, що бачить замовник за посиланням.
 *
 * Це єдине місце, де вирішується, що саме виходить із контори назовні, тож
 * воно навмисно зроблене окремим шаром: не «сховати колонку в шаблоні», а
 * зібрати новий об'єкт, у якому чутливих полів немає взагалі. Собівартість,
 * закупівельні ціни, виконавці, їхні ставки й внутрішні коментарі до
 * публічного типу просто не входять — їх не можна показати випадково.
 */

import { dueState, objectFinance, type DueState } from '@/lib/finance'
import type { MaterialStatus } from '@/lib/materials'
import type { ConstructionObject } from '@/lib/objects'
import { readiness, servicesDone } from '@/lib/objectList'
import { serviceRevenueTotal, type ServiceStatus } from '@/lib/services'

export interface TrackMaterial {
  id: number
  name: string
  quantity: number
  unit: string
  status: { value: MaterialStatus; label: string }
}

export interface TrackService {
  id: number
  name: string
  description: string | null
  unit: string
  plannedVolume: number
  /** null — факт ще не вносили: для замовника це «ще не остаточно». */
  actualVolume: number | null
  status: { value: ServiceStatus; label: string }
  /** Сума роботи для замовника — без розкладки на ЗП і профіт. */
  total: number
}

export interface TrackPayment {
  id: number
  /** Дата надходження або дата, на яку його чекають. */
  date: string | null
  amount: number
  received: boolean
  /** Коментар, який власник дозволив показати; інакше — нічого. */
  note: string | null
}

export interface TrackMoney {
  /** Сума за договором: матеріали + роботи − знижка. */
  client: number
  paid: number
  /** Залишок; відʼємний — переплата. */
  due: number
  progress: number
  state: DueState
}

export interface TrackObject {
  name: string
  address: string
  description: string | null
  status: ConstructionObject['status']
  cover: string | null
  /** Готовність за обсягами робіт, 0…1. null — рахувати ще нема з чого. */
  readiness: number | null
  works: { done: number; total: number }
  plannedStart: string | null
  plannedFinish: string | null
  /**
   * Фактичні дати показуємо лише на завершеному обʼєкті: на півдорозі вони
   * ще не остаточні й лише збивають.
   */
  actualStart: string | null
  actualFinish: string | null
  finished: boolean
  materials: TrackMaterial[]
  services: TrackService[]
  money: TrackMoney
  payments: TrackPayment[]
}

export function trackObject(object: ConstructionObject, today: string): TrackObject {
  const finance = objectFinance(object, today)
  const finished = object.status.value === 'done' || object.actual_finished_at !== null

  return {
    name: object.name,
    address: object.address,
    description: object.description,
    status: object.status,
    cover: object.cover,
    readiness: readiness(object),
    works: servicesDone(object),
    plannedStart: object.started_at,
    plannedFinish: object.finished_at,
    actualStart: finished ? object.actual_started_at : null,
    actualFinish: finished ? object.actual_finished_at : null,
    finished,

    // Ані ціни закупівлі, ані того, хто платив за матеріал: замовнику важливо,
    // що саме вже на майданчику.
    materials: object.materials.map((material) => ({
      id: material.id,
      name: material.name,
      quantity: material.quantity,
      unit: material.unit,
      status: material.status,
    })),

    // Ціну роботи показуємо: без неї замовник не зрозуміє, з чого склалась
    // сума за договором, а прозорість — весь сенс цієї сторінки. Виконавці
    // та їхні ставки лишаються всередині.
    services: object.services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      unit: service.unit,
      plannedVolume: service.planned_volume,
      actualVolume: service.actual_volume,
      status: service.status,
      total: serviceRevenueTotal(service),
    })),

    money: {
      client: finance.client,
      paid: finance.paid,
      due: finance.due,
      progress: finance.progress,
      state: dueState(finance.client, finance.paid),
    },

    payments: object.payments.flatMap((payment) =>
      payment.status.value === 'cancelled'
        ? []
        : [
            {
              id: payment.id,
              date: payment.paid_at,
              amount: payment.amount,
              received: payment.status.value === 'paid',
              note: payment.client_visible ? payment.name : null,
            },
          ],
    ),
  }
}
