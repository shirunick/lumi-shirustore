import {
  EXTENSION_NAME,
  EXTENSION_VERSION,
} from '../shared/constants'
import {
  parseFrontendMessage,
  requestIdFromPayload,
  type BackendToFrontend,
  type FrontendToBackend,
} from '../shared/protocol'
import { assertNever } from '../shared/assert-never'
import {
  runDatacatRequest,
  type DatacatCorsApi,
} from './datacat-request'
import { readUserStore, writeUserStore } from './user-store'

export type SpindleBackend = DatacatCorsApi & {
  onFrontendMessage: (
    handler: (payload: unknown, userId?: string) => void | Promise<void>,
  ) => void
  sendToFrontend: (payload: BackendToFrontend, userId?: string) => void
  log: { info: (message: string) => void; error: (message: string) => void }
  userStorage: {
    getJson: <T>(
      path: string,
      options?: { fallback?: T; userId?: string },
    ) => Promise<T>
    setJson: (
      path: string,
      value: unknown,
      options?: { indent?: number; userId?: string },
    ) => Promise<void>
  }
}

export function startRpc(api: SpindleBackend): void {
  api.onFrontendMessage(async (payload, userId) => {
    const message = parseFrontendMessage(payload)
    if (!message) {
      const requestId = requestIdFromPayload(payload)
      if (requestId) {
        api.sendToFrontend(
          {
            type: 'error_result',
            requestId,
            message: 'INVALID_REQUEST',
          },
          userId,
        )
      }
      return
    }
    try {
      const result = await handleMessage(api, message, userId)
      api.sendToFrontend(result, userId)
    } catch (error) {
      const errMsg =
        error instanceof Error ? error.message : 'ShiruStore backend error'
      api.sendToFrontend(
        {
          type: 'error_result',
          requestId: message.requestId,
          message: errMsg,
        },
        userId,
      )
    }
  })
}

async function handleMessage(
  api: SpindleBackend,
  message: FrontendToBackend,
  userId: string | undefined,
): Promise<BackendToFrontend> {
  switch (message.type) {
    case 'health':
      return {
        type: 'health_result',
        requestId: message.requestId,
        health: {
          extension: EXTENSION_NAME,
          version: EXTENSION_VERSION,
          ok: true,
        },
      }
    case 'datacat_request': {
      const result = await runDatacatRequest(
        api,
        {
          path: message.path,
          ...(message.method !== undefined ? { method: message.method } : {}),
          ...('body' in message ? { body: message.body } : {}),
          ...(message.responseType !== undefined
            ? { responseType: message.responseType }
            : {}),
        },
        userId,
      )
      return {
        type: 'datacat_request_result',
        requestId: message.requestId,
        status: result.status,
        data: result.data,
        encoding: result.encoding,
      }
    }
    case 'user_store_get': {
      const value = await readUserStore(api, message.key, userId)
      return {
        type: 'user_store_result',
        requestId: message.requestId,
        key: message.key,
        value,
      }
    }
    case 'user_store_put': {
      await writeUserStore(api, message.key, message.value, userId)
      return {
        type: 'user_store_put_result',
        requestId: message.requestId,
        key: message.key,
        ok: true,
      }
    }
    default:
      return assertNever(message)
  }
}
