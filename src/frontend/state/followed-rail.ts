import type { CatalogCharacter } from '../../shared/character'
import type { FollowedCreator } from '../../shared/followed-creators'
import { appendUniqueById } from '../../shared/list'
import type { DatacatClient } from '../api/datacat-client'
import { fetchCreatorBootstrap } from '../api/catalog'

type CacheEntry = {
  at: number
  characters: CatalogCharacter[]
}

const TTL_MS = 5 * 60_000
export const FOLLOWED_RAIL_DEFAULT_CREATORS = 6
export const FOLLOWED_RAIL_CREATOR_STEP = 4
const PER_CREATOR = 8
const CONCURRENCY = 2

export function createFollowedRailLoader(client: DatacatClient) {
  const cache = new Map<string, CacheEntry>()

  async function mapPool<T, R>(
    items: T[],
    limit: number,
    worker: (item: T) => Promise<R>,
  ): Promise<R[]> {
    const results: R[] = []
    let cursor = 0
    async function run(): Promise<void> {
      while (cursor < items.length) {
        const index = cursor
        cursor += 1
        results[index] = await worker(items[index]!)
      }
    }
    const workers = Array.from(
      { length: Math.min(limit, items.length) },
      () => run(),
    )
    await Promise.all(workers)
    return results
  }

  async function load(
    follows: FollowedCreator[],
    signal?: AbortSignal,
    opts: { creatorCount?: number } = {},
  ): Promise<CatalogCharacter[]> {
    const now = Date.now()
    const creatorCount = Math.max(
      FOLLOWED_RAIL_DEFAULT_CREATORS,
      opts.creatorCount ?? FOLLOWED_RAIL_DEFAULT_CREATORS,
    )
    const selected = follows.slice(0, creatorCount)
    const batches = await mapPool(selected, CONCURRENCY, async (creator) => {
      const hit = cache.get(creator.ref)
      if (hit && now - hit.at < TTL_MS) return hit.characters
      try {
        const page = await fetchCreatorBootstrap(client, creator.ref, signal)
        const characters = page.characters.slice(0, PER_CREATOR)
        cache.set(creator.ref, { at: Date.now(), characters })
        return characters
      } catch {
        return [] as CatalogCharacter[]
      }
    })
    return appendUniqueById([], batches.flat())
  }

  function invalidate(): void {
    cache.clear()
  }

  return { load, invalidate }
}

export type FollowedRailLoader = ReturnType<typeof createFollowedRailLoader>
