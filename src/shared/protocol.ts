import type {
  DatacatResponseType,
  HealthInfo,
  HttpMethod,
} from './types'

export type RequestBase = {
  requestId: string
}

export type UserStoreKey = 'playlists' | 'imports' | 'follows'

export type FrontendToBackend =
  | (RequestBase & { type: 'health' })
  | (RequestBase & {
      type: 'datacat_request'
      path: string
      method?: HttpMethod
      body?: unknown
      responseType?: DatacatResponseType
    })
  | (RequestBase & {
      type: 'user_store_get'
      key: UserStoreKey
    })
  | (RequestBase & {
      type: 'user_store_put'
      key: UserStoreKey
      value: unknown
    })

export type BackendToFrontend =
  | {
      type: 'health_result'
      requestId: string
      health: HealthInfo
    }
  | {
      type: 'datacat_request_result'
      requestId: string
      status: number
      data: unknown
      encoding: string | null
    }
  | {
      type: 'user_store_result'
      requestId: string
      key: UserStoreKey
      value: unknown
    }
  | {
      type: 'user_store_put_result'
      requestId: string
      key: UserStoreKey
      ok: true
    }
  | {
      type: 'error_result'
      requestId: string
      message: string
    }

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isUserStoreKey(value: unknown): value is UserStoreKey {
  return value === 'playlists' || value === 'imports' || value === 'follows'
}

export function requestIdFromPayload(value: unknown): string | null {
  if (!isRecord(value)) return null
  const requestId = value.requestId
  if (typeof requestId !== 'string' || requestId.length === 0) return null
  return requestId
}

export function parseFrontendMessage(
  value: unknown,
): FrontendToBackend | null {
  if (!isRecord(value)) return null
  const requestId = value.requestId
  const type = value.type
  if (typeof requestId !== 'string' || requestId.length === 0) return null
  if (typeof type !== 'string') return null

  switch (type) {
    case 'health':
      return { type, requestId }
    case 'user_store_get': {
      if (!isUserStoreKey(value.key)) return null
      return { type, requestId, key: value.key }
    }
    case 'user_store_put': {
      if (!isUserStoreKey(value.key)) return null
      if (!('value' in value)) return null
      return { type, requestId, key: value.key, value: value.value }
    }
    case 'datacat_request': {
      const path = value.path
      if (typeof path !== 'string' || !path.startsWith('/')) return null
      const methodRaw = value.method
      const method =
        methodRaw === undefined
          ? undefined
          : methodRaw === 'GET' || methodRaw === 'POST'
            ? methodRaw
            : null
      if (method === null) return null
      const responseTypeRaw = value.responseType
      const responseType =
        responseTypeRaw === undefined
          ? undefined
          : responseTypeRaw === 'json' || responseTypeRaw === 'arraybuffer'
            ? responseTypeRaw
            : null
      if (responseType === null) return null
      const msg: FrontendToBackend = {
        type,
        requestId,
        path,
        ...(method !== undefined ? { method } : {}),
        ...(responseType !== undefined ? { responseType } : {}),
        ...('body' in value ? { body: value.body } : {}),
      }
      return msg
    }
    default:
      return null
  }
}
