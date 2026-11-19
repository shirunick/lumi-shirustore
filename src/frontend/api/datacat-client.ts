import type { RpcClient } from '../rpc-client'
import { isRecord } from '../../shared/protocol'
import type { DatacatResponseType, HttpMethod } from '../../shared/types'

export class DatacatApiError extends Error {
  readonly code: string
  readonly status: number
  readonly verificationRequired: boolean

  constructor(
    message: string,
    opts: {
      code?: string
      status?: number
      verificationRequired?: boolean
    } = {},
  ) {
    super(message)
    this.name = 'DatacatApiError'
    this.code = opts.code || 'DATACAT_REQUEST_FAILED'
    this.status = opts.status ?? 0
    this.verificationRequired = opts.verificationRequired === true
  }
}

function errorMessageFromData(
  status: number,
  data: Record<string, unknown>,
): string {
  const message = String(data.message || data.error || '').trim()
  if (status === 429) {
    const retry = Number(data.retryAfter)
    if (Number.isFinite(retry) && retry > 0) {
      return `Datacat rate limited. Retry in ${Math.ceil(retry)}s.`
    }
    return 'Datacat rate limited. Slow down a bit.'
  }
  if (status === 401 || status === 403) {
    return message || 'Datacat auth required. Try import verify again.'
  }
  if (status === 404) return message || 'Datacat character not found.'
  if (
    message &&
    message !== 'DATACAT_REQUEST_FAILED' &&
    message !== 'CLIENT_API_SCHEMA_REQUIRED'
  ) {
    return message
  }
  if (status > 0) return `Datacat request failed (${status})`
  return 'Datacat request failed'
}

export class DatacatClient {
  constructor(private readonly rpc: RpcClient) {}

  async requestJson(
    path: string,
    options: {
      method?: HttpMethod
      body?: unknown
      signal?: AbortSignal
    } = {},
  ): Promise<unknown> {
    const message = {
      type: 'datacat_request' as const,
      path,
      ...(options.method !== undefined ? { method: options.method } : {}),
      ...('body' in options ? { body: options.body } : {}),
    }
    const result = await this.rpc.request(message, options.signal)
    if (result.type !== 'datacat_request_result') {
      throw new DatacatApiError('Unexpected ShiruStore RPC response')
    }
    if (result.status < 200 || result.status >= 300) {
      const data = isRecord(result.data) ? result.data : {}
      throw new DatacatApiError(errorMessageFromData(result.status, data), {
        code: String(data.error || 'DATACAT_REQUEST_FAILED'),
        status: result.status,
        verificationRequired:
          data.verificationRequired === true ||
          data.securityCheckRequired === true,
      })
    }
    return result.data
  }

  async requestBinary(
    path: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<{ data: unknown; encoding: string | null }> {
    const result = await this.rpc.request(
      {
        type: 'datacat_request',
        path,
        method: 'GET',
        responseType: 'arraybuffer' satisfies DatacatResponseType,
      },
      options.signal,
    )
    if (result.type !== 'datacat_request_result') {
      throw new DatacatApiError('Unexpected ShiruStore RPC response')
    }
    if (result.status < 200 || result.status >= 300) {
      const data = isRecord(result.data) ? result.data : {}
      throw new DatacatApiError(
        errorMessageFromData(result.status, data) ||
          'Datacat binary request failed',
        {
          code: String(data.error || 'DATACAT_REQUEST_FAILED'),
          status: result.status,
          verificationRequired:
            data.verificationRequired === true ||
            data.securityCheckRequired === true,
        },
      )
    }
    return { data: result.data, encoding: result.encoding }
  }
}
