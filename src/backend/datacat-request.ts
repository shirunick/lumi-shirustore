import {
  DATACAT_API_ORIGIN,
  DATACAT_API_PREFIX,
  DATACAT_CLIENT_ID,
  EXTENSION_VERSION,
  MOCK_PREVIEW,
} from '../shared/constants'
import type { DatacatResponseType, HttpMethod } from '../shared/types'
import { UUID_PATTERN } from '../shared/uuid'
import { isAllowedDatacatPath } from './allowlist'
import {
  ACCESS_TOKEN_KEY,
  INSTALLATION_KEY,
  VERIFICATION_LEASE_KEY,
  verificationTransientKey,
} from './enclave-keys'
import { mockDatacatRequest } from './mock-catalog'
import { uuidv7 } from './uuidv7'

export type DatacatCorsApi = {
  cors: (
    url: string,
    options?: {
      method?: string
      headers?: Record<string, string>
      body?: string
      responseType?: 'arraybuffer' | 'text'
      mediaType?: string
    },
  ) => Promise<unknown>
  enclave: {
    put: (key: string, value: string, userId?: string) => Promise<void>
    get: (key: string, userId?: string) => Promise<string | null>
    delete: (key: string, userId?: string) => Promise<boolean>
    has: (key: string, userId?: string) => Promise<boolean>
  }
}

export type DatacatRequestInput = {
  path: string
  method?: HttpMethod
  body?: unknown
  responseType?: DatacatResponseType
}

export type DatacatProxyResult = {
  status: number
  data: unknown
  encoding: string | null
}

function parseJson(value: unknown): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  try {
    const parsed = JSON.parse(String(value || '{}')) as unknown
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {}
  } catch {
    return {}
  }
}

async function getInstallationId(
  api: DatacatCorsApi,
  userId: string | undefined,
): Promise<string> {
  let value = String((await api.enclave.get(INSTALLATION_KEY, userId)) || '')
  if (!/^[A-Za-z0-9._:-]{16,160}$/.test(value)) {
    value = `lumiverse-${uuidv7()}`
    await api.enclave.put(INSTALLATION_KEY, value, userId)
  }
  return value
}

async function readVerificationLease(
  api: DatacatCorsApi,
  userId: string | undefined,
): Promise<{ token: string; expiresAt: string } | null> {
  const record = parseJson(await api.enclave.get(VERIFICATION_LEASE_KEY, userId))
  const token = String(record.token || '')
  const expiresAt = Date.parse(String(record.expiresAt || ''))
  if (
    !token.startsWith('dcv1v_') ||
    !Number.isFinite(expiresAt) ||
    expiresAt <= Date.now() + 5000
  ) {
    await api.enclave.delete(VERIFICATION_LEASE_KEY, userId)
    return null
  }
  return { token, expiresAt: new Date(expiresAt).toISOString() }
}

const CARD_OR_AVATAR_RE = new RegExp(
  `^\\/characters\\/${UUID_PATTERN}\\/(?:card|avatar)(?:\\?.*)?$`,
  'i',
)
const VERIFICATION_TOKEN_RE = new RegExp(
  `^\\/verifications\\/(${UUID_PATTERN})\\/token$`,
  'i',
)

async function buildDatacatHeaders(
  api: DatacatCorsApi,
  path: string,
  responseType: DatacatResponseType | undefined,
  userId: string | undefined,
): Promise<{ headers: Record<string, string>; accessToken: string }> {
  const installationId = await getInstallationId(api, userId)
  const accessToken = String(
    (await api.enclave.get(ACCESS_TOKEN_KEY, userId)) || '',
  ).trim()
  const headers: Record<string, string> = {
    Accept:
      responseType === 'arraybuffer'
        ? 'image/avif,image/webp,image/png,image/jpeg,image/gif'
        : 'application/json',
    'X-Datacat-Client': `ShiruStore/${EXTENSION_VERSION}`,
    'X-Datacat-Client-Id': DATACAT_CLIENT_ID,
    'X-Datacat-Installation-Id': installationId,
  }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  if (CARD_OR_AVATAR_RE.test(path)) {
    const lease = await readVerificationLease(api, userId)
    if (lease) headers['X-Datacat-Verification-Lease'] = lease.token
  }
  return { headers, accessToken }
}

async function injectClientBody(
  api: DatacatCorsApi,
  path: string,
  method: HttpMethod,
  payloadBody: unknown,
  userId: string | undefined,
): Promise<Record<string, unknown> | null> {
  if (method === 'GET') return null
  const installationId = await getInstallationId(api, userId)
  let body = parseJson(payloadBody)
  const verificationExchange = path.match(VERIFICATION_TOKEN_RE)
  if (path === '/verifications') {
    body = {
      ...body,
      installationId,
      clientId: DATACAT_CLIENT_ID,
      clientName: 'ShiruStore',
      clientVersion: EXTENSION_VERSION,
    }
  }
  if (verificationExchange) {
    const key = verificationTransientKey(verificationExchange[1]!)
    const deviceCode = key ? await api.enclave.get(key, userId) : null
    if (!deviceCode) throw new Error('The Datacat security-check request expired.')
    body = { ...body, deviceCode, installationId, clientId: DATACAT_CLIENT_ID }
  }
  return body
}

async function persistSecretsFromResponse(
  api: DatacatCorsApi,
  path: string,
  responseBody: Record<string, unknown>,
  userId: string | undefined,
): Promise<Record<string, unknown>> {
  const next = { ...responseBody }
  if (path === '/verifications' && next.verificationId && next.deviceCode) {
    const key = verificationTransientKey(String(next.verificationId))
    if (key) await api.enclave.put(key, String(next.deviceCode), userId)
    delete next.deviceCode
  }
  const verificationExchange = path.match(VERIFICATION_TOKEN_RE)
  if (
    verificationExchange &&
    next.leaseToken &&
    next.expiresAt
  ) {
    await api.enclave.put(
      VERIFICATION_LEASE_KEY,
      JSON.stringify({
        token: String(next.leaseToken),
        expiresAt: String(next.expiresAt),
      }),
      userId,
    )
    const key = verificationTransientKey(verificationExchange[1]!)
    if (key) await api.enclave.delete(key, userId)
    delete next.leaseToken
    next.leaseAvailable = true
  }
  return next
}

function normalizeDatacatError(
  status: number,
  responseBody: Record<string, unknown>,
): Record<string, unknown> {
  const errorCode = String(responseBody.error || '')
  const known = [
    'CLIENT_VERIFICATION_REQUIRED',
    'VERIFICATION_PENDING',
    'LINK_PENDING',
    'CLIENT_API_SCHEMA_REQUIRED',
    'RATE_LIMITED',
    'NOT_FOUND',
  ].includes(errorCode)
  const message = String(
    responseBody.message || responseBody.error_description || '',
  ).trim()
  const retryAfter = Number(
    responseBody.retryAfter ?? responseBody.retry_after,
  )
  return {
    success: false,
    error: known ? errorCode : errorCode || 'DATACAT_REQUEST_FAILED',
    message:
      message ||
      (status === 429
        ? 'Rate limited'
        : status === 404
          ? 'Not found'
          : 'Datacat request failed'),
    verificationRequired:
      responseBody.verificationRequired === true ||
      responseBody.securityCheckRequired === true,
    securityCheckRequired: responseBody.securityCheckRequired === true,
    ...(Number.isFinite(retryAfter) && retryAfter > 0
      ? { retryAfter }
      : {}),
  }
}

export async function runDatacatRequest(
  api: DatacatCorsApi,
  payload: DatacatRequestInput,
  userId: string | undefined,
): Promise<DatacatProxyResult> {
  const path = String(payload.path || '').trim()
  const method = (payload.method || 'GET').toUpperCase() as HttpMethod
  if (!isAllowedDatacatPath(path, method)) {
    throw new Error('This Datacat request is not available to the extension.')
  }

  if (MOCK_PREVIEW) {
    const mocked = mockDatacatRequest(path, method, payload.responseType)
    if (mocked) return mocked
    throw new Error(`Mock preview has no response for ${method} ${path}`)
  }

  const { headers, accessToken } = await buildDatacatHeaders(
    api,
    path,
    payload.responseType,
    userId,
  )
  const body = await injectClientBody(
    api,
    path,
    method,
    payload.body,
    userId,
  )
  if (body) headers['Content-Type'] = 'application/json'

  const response = await api.cors(
    `${DATACAT_API_ORIGIN}${DATACAT_API_PREFIX}${path}`,
    {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
      ...(payload.responseType === 'arraybuffer'
        ? { responseType: 'arraybuffer', mediaType: 'image' }
        : {}),
    },
  )

  const raw = parseJson(response)
  const status = Number(raw.status || 500)
  const encoding =
    typeof raw.encoding === 'string' ? raw.encoding : null

  if (status < 200 || status >= 300) {
    if (status === 401 && accessToken) {
      await api.enclave.delete(ACCESS_TOKEN_KEY, userId)
      await api.enclave.delete(VERIFICATION_LEASE_KEY, userId)
    }
    const errorBody =
      payload.responseType === 'arraybuffer'
        ? normalizeDatacatError(status, {})
        : normalizeDatacatError(status, parseJson(raw.body))
    return {
      status,
      data: errorBody,
      encoding: payload.responseType === 'arraybuffer' ? encoding : null,
    }
  }

  if (payload.responseType === 'arraybuffer') {
    return {
      status,
      data: raw.body ?? null,
      encoding,
    }
  }

  let responseBody = parseJson(raw.body)
  responseBody = await persistSecretsFromResponse(
    api,
    path,
    responseBody,
    userId,
  )

  return {
    status,
    data: responseBody,
    encoding: null,
  }
}
