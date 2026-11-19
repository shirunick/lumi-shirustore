import type { HttpMethod } from '../shared/types'
import { UUID_PATTERN } from '../shared/uuid'

const GET_PATTERNS: RegExp[] = [
  /^\/characters(?:\?.*)?$/,
  /^\/fresh(?:\?.*)?$/,
  /^\/tags(?:\?.*)?$/,
  /^\/creators\/[A-Za-z0-9:%_-]+\/(?:bootstrap|characters)(?:\?.*)?$/,
  new RegExp(`^\\/characters\\/${UUID_PATTERN}(?:\\?.*)?$`, 'i'),
  new RegExp(
    `^\\/characters\\/${UUID_PATTERN}\\/(?:card|avatar)(?:\\?.*)?$`,
    'i',
  ),
  new RegExp(`^\\/characters\\/${UUID_PATTERN}\\/community(?:\\?.*)?$`, 'i'),
  /^\/verifications\/[A-Za-z0-9_-]{8,128}$/,
]

const POST_PATTERNS: RegExp[] = [
  /^\/verifications$/,
  /^\/verifications\/[A-Za-z0-9_-]{8,128}\/token$/,
]

export function isAllowedDatacatPath(
  path: string,
  method: HttpMethod | string,
): boolean {
  const safePath = String(path || '')
  const verb = String(method || 'GET').toUpperCase()
  if (!safePath.startsWith('/') || safePath.includes('\\')) return false
  if (verb === 'GET') return GET_PATTERNS.some((pattern) => pattern.test(safePath))
  if (verb === 'POST')
    return POST_PATTERNS.some((pattern) => pattern.test(safePath))
  return false
}
