import { isRecord } from './protocol'

export type FollowedCreator = {
  ref: string
  name: string
  followedAt: string
}

const STORAGE_KEY = 'shirustore:followed-creators'

export function normalizeFollowedCreator(
  value: unknown,
): FollowedCreator | null {
  if (!isRecord(value)) return null
  const ref = String(value.ref || value.id || '')
    .trim()
    .toLowerCase()
  if (!ref) return null
  const followedAt = String(value.followedAt || '').trim()
  return {
    ref,
    name: String(value.name || ref).trim() || ref,
    followedAt: followedAt || new Date(0).toISOString(),
  }
}

export function loadFollowedCreators(
  storage: Pick<Storage, 'getItem'> = localStorage,
): FollowedCreator[] {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const byRef = new Map<string, FollowedCreator>()
    for (const row of parsed) {
      const creator = normalizeFollowedCreator(row)
      if (!creator) continue
      byRef.set(creator.ref, creator)
    }
    return [...byRef.values()].sort((a, b) =>
      b.followedAt.localeCompare(a.followedAt),
    )
  } catch {
    return []
  }
}

export function saveFollowedCreators(
  creators: FollowedCreator[],
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  const clean = creators
    .map(normalizeFollowedCreator)
    .filter((row): row is FollowedCreator => row !== null)
  storage.setItem(STORAGE_KEY, JSON.stringify(clean))
}

export function isFollowing(
  creators: FollowedCreator[],
  ref: string,
): boolean {
  const cleaned = ref.trim().toLowerCase()
  return creators.some((row) => row.ref === cleaned)
}

export function followCreator(
  creators: FollowedCreator[],
  input: { ref: string; name: string },
): FollowedCreator[] {
  const ref = input.ref.trim().toLowerCase()
  if (!ref) return creators
  const next: FollowedCreator = {
    ref,
    name: input.name.trim() || ref,
    followedAt: new Date().toISOString(),
  }
  return [next, ...creators.filter((row) => row.ref !== ref)]
}

export function unfollowCreator(
  creators: FollowedCreator[],
  ref: string,
): FollowedCreator[] {
  const cleaned = ref.trim().toLowerCase()
  return creators.filter((row) => row.ref !== cleaned)
}

export function mergeFollowedCreators(
  remote: FollowedCreator[],
  local: FollowedCreator[],
): FollowedCreator[] {
  const byRef = new Map<string, FollowedCreator>()
  for (const row of [...remote, ...local]) {
    const existing = byRef.get(row.ref)
    if (!existing || row.followedAt > existing.followedAt) {
      byRef.set(row.ref, row)
    }
  }
  return [...byRef.values()].sort((a, b) =>
    b.followedAt.localeCompare(a.followedAt),
  )
}
