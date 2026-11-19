import { isRecord } from '../shared/protocol'
import {
  userStoreEnclaveKey,
  type UserStoreKey,
} from './enclave-keys'

const PATHS: Record<UserStoreKey, string> = {
  playlists: 'playlists.json',
  imports: 'imports.json',
  follows: 'follows.json',
}

export type UserStoreApi = {
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
  enclave: {
    put: (key: string, value: string, userId?: string) => Promise<void>
    get: (key: string, userId?: string) => Promise<string | null>
    delete?: (key: string, userId?: string) => Promise<boolean>
  }
}

async function readEnclaveFallback(
  api: UserStoreApi,
  key: UserStoreKey,
  userId: string | undefined,
): Promise<unknown> {
  try {
    const raw = await api.enclave.get(userStoreEnclaveKey(key), userId)
    if (!raw || raw === 'null') return null
    return JSON.parse(raw) as unknown
  } catch {
    return null
  }
}

export async function readUserStore(
  api: UserStoreApi,
  key: UserStoreKey,
  userId: string | undefined,
): Promise<unknown> {
  try {
    const fromStorage = await api.userStorage.getJson<unknown>(PATHS[key], {
      fallback: null,
      ...(userId !== undefined ? { userId } : {}),
    })
    if (fromStorage !== null && fromStorage !== undefined) {
      return fromStorage
    }
  } catch {
  }

  const legacy = await readEnclaveFallback(api, key, userId)
  if (legacy === null || legacy === undefined) return null

  try {
    await writeUserStore(api, key, legacy, userId)
    await api.enclave.delete?.(userStoreEnclaveKey(key), userId)
  } catch {
  }
  return legacy
}

export async function writeUserStore(
  api: UserStoreApi,
  key: UserStoreKey,
  value: unknown,
  userId: string | undefined,
): Promise<void> {
  if (value === null || value === undefined) {
    await api.userStorage.setJson(PATHS[key], null, {
      ...(userId !== undefined ? { userId } : {}),
    })
    return
  }
  if (!Array.isArray(value) && !isRecord(value)) {
    throw new Error('User store value must be JSON object or array')
  }
  const encoded = JSON.stringify(value)
  if (encoded.length > 1_500_000) {
    throw new Error('User store payload too large')
  }
  await api.userStorage.setJson(PATHS[key], value, {
    ...(userId !== undefined ? { userId } : {}),
  })
}
