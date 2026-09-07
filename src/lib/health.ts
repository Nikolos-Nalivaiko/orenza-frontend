import { api } from '@/lib/http'

export interface ApiInfo {
  name: string
  env: string
  api_version: string
  time: string
}

export function ping(signal?: AbortSignal): Promise<ApiInfo> {
  return api.get<ApiInfo>('/ping', { signal })
}
