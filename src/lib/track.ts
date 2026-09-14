import type { ObjectCover } from '@/lib/cover'
import type { DueState } from '@/lib/finance'
import { api } from '@/lib/http'
import type { MaterialStatus } from '@/lib/materials'
import type { ObjectStatus } from '@/lib/objects'
import type { ViewerPhoto } from '@/lib/photos'
import type { ServiceStatus } from '@/lib/services'

interface Labeled<T extends string> {
  value: T
  label: string
}

export interface TrackMaterialResource {
  id: number
  name: string
  quantity: number
  unit: string
  status: Labeled<MaterialStatus>
}

export interface TrackServiceResource {
  id: number
  name: string
  description: string | null
  unit: string
  planned_volume: number
  actual_volume: number | null
  status: Labeled<ServiceStatus>
  total: number
}

export interface TrackPhotoResource {
  id: number
  thumb: string
  full: string
  width: number
  height: number
  color: string
  at: string | null
}

export interface TrackPaymentResource {
  id: number
  date: string | null
  amount: number
  received: boolean
  note: string | null
}

export interface TrackResource {
  name: string
  address: string
  description: string | null
  status: Labeled<ObjectStatus>
  cover: ObjectCover | null
  readiness: number | null
  works: { done: number; total: number }
  started_at: string | null
  finished_at: string | null
  actual_started_at: string | null
  actual_finished_at: string | null
  finished: boolean
  materials: TrackMaterialResource[]
  services: TrackServiceResource[]
  money: {
    client: number
    paid: number
    due: number
    progress: number
    state: Labeled<DueState>
  }
  photos?: TrackPhotoResource[]
  payments: TrackPaymentResource[]
}

export interface TrackMaterial {
  id: number
  name: string
  quantity: number
  unit: string
  status: Labeled<MaterialStatus>
}

export interface TrackService {
  id: number
  name: string
  description: string | null
  unit: string
  plannedVolume: number
  actualVolume: number | null
  status: Labeled<ServiceStatus>
  total: number
}

export interface TrackPayment {
  id: number
  date: string | null
  amount: number
  received: boolean
  note: string | null
}

export interface TrackMoney {
  client: number
  paid: number
  due: number
  progress: number
  state: DueState
}

export interface TrackObject {
  name: string
  address: string
  description: string | null
  status: Labeled<ObjectStatus>
  cover: ObjectCover | null
  readiness: number | null
  works: { done: number; total: number }
  plannedStart: string | null
  plannedFinish: string | null
  actualStart: string | null
  actualFinish: string | null
  finished: boolean
  materials: TrackMaterial[]
  services: TrackService[]
  money: TrackMoney
  photos: ViewerPhoto[]
  payments: TrackPayment[]
}

export function normalizeTrack(resource: TrackResource): TrackObject {
  return {
    name: resource.name,
    address: resource.address,
    description: resource.description,
    status: resource.status,
    cover: resource.cover,
    readiness: resource.readiness,
    works: resource.works,
    plannedStart: resource.started_at,
    plannedFinish: resource.finished_at,
    actualStart: resource.finished ? resource.actual_started_at : null,
    actualFinish: resource.finished ? resource.actual_finished_at : null,
    finished: resource.finished,
    materials: resource.materials.map((material) => ({
      id: material.id,
      name: material.name,
      quantity: material.quantity,
      unit: material.unit,
      status: material.status,
    })),
    services: resource.services.map((service) => ({
      id: service.id,
      name: service.name,
      description: service.description,
      unit: service.unit,
      plannedVolume: service.planned_volume,
      actualVolume: service.actual_volume,
      status: service.status,
      total: service.total,
    })),
    money: {
      client: resource.money.client,
      paid: resource.money.paid,
      due: resource.money.due,
      progress: resource.money.progress,
      state: resource.money.state.value,
    },
    photos: (resource.photos ?? []).map((photo) => ({
      id: photo.id,
      thumb: photo.thumb,
      full: photo.full,
      width: photo.width,
      height: photo.height,
      color: photo.color,
      at: photo.at,
    })),
    payments: resource.payments.map((payment) => ({
      id: payment.id,
      date: payment.date,
      amount: payment.amount,
      received: payment.received,
      note: payment.note,
    })),
  }
}

export async function fetchTrack(token: string, signal?: AbortSignal): Promise<TrackObject> {
  const resource = await api.get<TrackResource>(`/track/${encodeURIComponent(token)}`, { signal })

  return normalizeTrack(resource)
}
