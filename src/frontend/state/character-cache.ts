import type { CatalogCharacter } from '../../shared/character'
import type { DatacatClient } from '../api/datacat-client'
import { fetchCharacterDetail } from '../api/catalog'

const FEED_CAP = 200
const MAX_CACHE = 300

export function capById<T extends { id: string }>(
  rows: T[],
  cap = FEED_CAP,
): T[] {
  if (rows.length <= cap) return rows
  return rows.slice(rows.length - cap)
}

function preferLonger(a: string, b: string): string {
  return b.length > a.length ? b : a
}

export function mergeCharacter(
  prev: CatalogCharacter | undefined,
  next: CatalogCharacter,
): CatalogCharacter {
  if (!prev) return next
  const lorebook = next.lorebook ?? prev.lorebook
  return {
    ...prev,
    ...next,
    description: preferLonger(prev.description, next.description),
    firstMessage: preferLonger(prev.firstMessage, next.firstMessage),
    tags: next.tags.length >= prev.tags.length ? next.tags : prev.tags,
    imageUrl: next.imageUrl || prev.imageUrl,
    creatorRef: next.creatorRef || prev.creatorRef,
    creatorName:
      next.creatorName && next.creatorName !== 'Unknown creator'
        ? next.creatorName
        : prev.creatorName,
    score: next.score ?? prev.score,
    ...(lorebook ? { lorebook } : {}),
  }
}

function raceAbort<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return promise
  if (signal.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'))
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () =>
      reject(new DOMException('Aborted', 'AbortError'))
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (err) => {
        signal.removeEventListener('abort', onAbort)
        reject(err)
      },
    )
  })
}

export function createCharacterCache(client: DatacatClient) {
  const cache = new Map<string, CatalogCharacter>()
  const detailed = new Set<string>()
  const inflight = new Map<string, Promise<CatalogCharacter>>()

  function remember(character: CatalogCharacter): CatalogCharacter {
    const merged = mergeCharacter(cache.get(character.id), character)
    cache.delete(character.id)
    cache.set(character.id, merged)
    while (cache.size > MAX_CACHE) {
      const oldest = cache.keys().next().value
      if (!oldest) break
      cache.delete(oldest)
      detailed.delete(oldest)
    }
    return merged
  }

  function rememberMany(rows: CatalogCharacter[]): void {
    for (const row of rows) remember(row)
  }

  function get(id: string): CatalogCharacter | undefined {
    return cache.get(id)
  }

  async function getOrFetch(
    id: string,
    signal?: AbortSignal,
  ): Promise<CatalogCharacter> {
    const hit = cache.get(id)
    if (hit && detailed.has(id)) return hit
    const pending = inflight.get(id)
    if (pending) return raceAbort(pending, signal)
    const request = fetchCharacterDetail(client, id)
      .then((full) => {
        const merged = remember(full)
        detailed.add(id)
        return merged
      })
      .finally(() => {
        inflight.delete(id)
      })
    inflight.set(id, request)
    return raceAbort(request, signal)
  }

  return { remember, rememberMany, get, getOrFetch }
}

export type CharacterCache = ReturnType<typeof createCharacterCache>
