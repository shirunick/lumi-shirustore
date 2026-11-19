import { isUuid } from '../shared/uuid'

export const INSTALLATION_KEY = 'shirustore.installation_id'
export const ACCESS_TOKEN_KEY = 'shirustore.access_token'
export const VERIFICATION_LEASE_KEY = 'shirustore.verification_lease'
export const PLAYLISTS_KEY = 'shirustore.playlists'
export const IMPORT_INDEX_KEY = 'shirustore.import_index'
export const FOLLOWS_KEY = 'shirustore.followed_creators'

export type UserStoreKey = 'playlists' | 'imports' | 'follows'

export function userStoreEnclaveKey(key: UserStoreKey): string {
  if (key === 'playlists') return PLAYLISTS_KEY
  if (key === 'imports') return IMPORT_INDEX_KEY
  return FOLLOWS_KEY
}

export function verificationTransientKey(id: string): string | null {
  const safeId = String(id || '').trim().toLowerCase()
  if (!isUuid(safeId)) return null
  return `shirustore.verification.${safeId}`
}
