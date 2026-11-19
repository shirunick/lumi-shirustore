import {
  normalizeCharacter,
  normalizeCharacterList,
  normalizePaging,
  type CatalogCharacter,
  type Paging,
} from '../../shared/character'
import { withSignal } from '../../shared/options'
import { isRecord } from '../../shared/protocol'
import { normalizeTagList, type CatalogTag } from '../../shared/tags'
import type { DatacatClient } from './datacat-client'

const PAGE_SIZE = 24

export type FreshWindows = {
  last24h: CatalogCharacter[]
  thisWeek: CatalogCharacter[]
}

export type FreshPaging = {
  last24h: Paging
  thisWeek: Paging
}

export async function fetchCatalogPage(
  client: DatacatClient,
  opts: {
    offset: number
    search?: string
    sort?: string
    tagIds?: number[]
    signal?: AbortSignal
  },
): Promise<{ characters: CatalogCharacter[]; paging: Paging }> {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(opts.offset),
    sort: opts.sort || 'first_published',
  })
  if (opts.search) params.set('search', opts.search)
  if (opts.tagIds?.length) {
    params.set('tagIds', opts.tagIds.join(','))
  }
  const data = await client.requestJson(
    `/characters?${params}`,
    withSignal({}, opts.signal),
  )
  const record = isRecord(data) ? data : {}
  const characters = normalizeCharacterList(record.characters)
  return {
    characters,
    paging: normalizePaging(record.paging, opts.offset, characters.length),
  }
}

export async function fetchTagsPage(
  client: DatacatClient,
  opts: {
    offset?: number
    search?: string
    signal?: AbortSignal
  } = {},
): Promise<{ tags: CatalogTag[]; hasMore: boolean }> {
  const params = new URLSearchParams({
    limit: '80',
    offset: String(opts.offset ?? 0),
    sort: 'count',
  })
  if (opts.search) params.set('search', opts.search)
  const data = await client.requestJson(
    `/tags?${params}`,
    withSignal({}, opts.signal),
  )
  const record = isRecord(data) ? data : {}
  const tags = normalizeTagList(record.tags)
  const paging = isRecord(record.paging) ? record.paging : {}
  return {
    tags,
    hasMore: paging.hasMore === true,
  }
}

export async function fetchFreshPage(
  client: DatacatClient,
  opts: {
    offset24: number
    offsetWeek: number
    signal?: AbortSignal
  },
): Promise<{ windows: FreshWindows; paging: FreshPaging }> {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset24: String(opts.offset24),
    offsetWeek: String(opts.offsetWeek),
    sort: 'fresh',
  })
  const data = await client.requestJson(
    `/fresh?${params}`,
    withSignal({}, opts.signal),
  )
  const record = isRecord(data) ? data : {}
  const windows = isRecord(record.windows) ? record.windows : {}
  const last24hRaw = isRecord(windows.last24h) ? windows.last24h : {}
  const thisWeekRaw = isRecord(windows.thisWeek) ? windows.thisWeek : {}
  const last24h = normalizeCharacterList(last24hRaw.characters)
  const thisWeek = normalizeCharacterList(thisWeekRaw.characters)
  return {
    windows: { last24h, thisWeek },
    paging: {
      last24h: normalizePaging(last24hRaw.paging, opts.offset24, last24h.length),
      thisWeek: normalizePaging(
        thisWeekRaw.paging,
        opts.offsetWeek,
        thisWeek.length,
      ),
    },
  }
}

export async function fetchCharacterDetail(
  client: DatacatClient,
  id: string,
  signal?: AbortSignal,
): Promise<CatalogCharacter> {
  const data = await client.requestJson(
    `/characters/${encodeURIComponent(id)}`,
    withSignal({}, signal),
  )
  const record = isRecord(data) ? data : {}
  const character = normalizeCharacter(record.character ?? data)
  if (!character) throw new Error('Character detail was invalid')
  return character
}

export type CommunitySummary = {
  kudos: number
  comments: number
}

export async function fetchCommunitySummary(
  client: DatacatClient,
  id: string,
  signal?: AbortSignal,
): Promise<CommunitySummary | null> {
  try {
    const data = await client.requestJson(
      `/characters/${encodeURIComponent(id)}/community?limit=1`,
      withSignal({}, signal),
    )
    const record = isRecord(data) ? data : {}
    const community = isRecord(record.community) ? record.community : record
    const kudos = isRecord(community.kudos) ? community.kudos : {}
    const comments = isRecord(community.comments) ? community.comments : {}
    const kudosTotal = Number(kudos.total ?? 0)
    const commentsTotal = Number(comments.total ?? 0)
    return {
      kudos: Number.isFinite(kudosTotal) ? kudosTotal : 0,
      comments: Number.isFinite(commentsTotal) ? commentsTotal : 0,
    }
  } catch {
    return null
  }
}

export type CreatorProfile = {
  ref: string
  name: string
}

export async function fetchCreatorBootstrap(
  client: DatacatClient,
  creatorRef: string,
  signal?: AbortSignal,
): Promise<{ creator: CreatorProfile; characters: CatalogCharacter[]; paging: Paging }> {
  const ref = creatorRef.trim().toLowerCase()
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: '0',
    sort: 'creation_date',
    sortDir: 'desc',
  })
  const data = await client.requestJson(
    `/creators/${encodeURIComponent(ref)}/bootstrap?${params}`,
    withSignal({}, signal),
  )
  const record = isRecord(data) ? data : {}
  const rawCreator = isRecord(record.creator) ? record.creator : {}
  const name =
    String(rawCreator.name || rawCreator.displayName || ref).trim() || ref
  const characters = normalizeCharacterList(record.characters)
  return {
    creator: { ref, name },
    characters,
    paging: normalizePaging(record.paging, 0, characters.length),
  }
}

export async function fetchCreatorCharacters(
  client: DatacatClient,
  opts: {
    creatorRef: string
    offset: number
    signal?: AbortSignal
  },
): Promise<{ characters: CatalogCharacter[]; paging: Paging }> {
  const ref = opts.creatorRef.trim().toLowerCase()
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(opts.offset),
    sort: 'creation_date',
    sortDir: 'desc',
  })
  const data = await client.requestJson(
    `/creators/${encodeURIComponent(ref)}/characters?${params}`,
    withSignal({}, opts.signal),
  )
  const record = isRecord(data) ? data : {}
  const characters = normalizeCharacterList(record.characters)
  return {
    characters,
    paging: normalizePaging(record.paging, opts.offset, characters.length),
  }
}

export type CreatorSearchHit = CreatorProfile & {
  sampleCount: number
}

function normalizeCreatorQuery(value: string): string {
  return value.trim().replace(/^@+/, '').toLowerCase()
}

function rememberCreatorHit(
  byRef: Map<string, CreatorSearchHit>,
  ref: string,
  name: string,
  sampleCount = 0,
): boolean {
  const key = ref.trim().toLowerCase()
  if (!key) return false
  const existing = byRef.get(key)
  if (!existing) {
    byRef.set(key, {
      ref: key,
      name: name.trim() || key,
      sampleCount,
    })
    return true
  }
  if (name.trim() && existing.name === existing.ref) {
    existing.name = name.trim()
  }
  existing.sampleCount = Math.max(existing.sampleCount, sampleCount)
  return false
}

/** Datacat has no /creators index — discover by paging popular catalog cards. */
export async function fetchCreatorDirectoryPage(
  client: DatacatClient,
  opts: {
    offset: number
    sort?: string
    knownRefs?: Set<string>
    signal?: AbortSignal
  },
): Promise<{ creators: CreatorSearchHit[]; paging: Paging }> {
  const page = await fetchCatalogPage(
    client,
    withSignal(
      {
        offset: opts.offset,
        sort: opts.sort || 'chat_count',
      },
      opts.signal,
    ),
  )
  const byRef = new Map<string, CreatorSearchHit>()
  const known = opts.knownRefs || new Set<string>()
  for (const row of page.characters) {
    const ref = row.creatorRef.trim().toLowerCase()
    if (!ref || known.has(ref)) continue
    rememberCreatorHit(byRef, ref, row.creatorName || ref, 1)
  }
  return {
    creators: [...byRef.values()],
    paging: page.paging,
  }
}

export async function searchCreators(
  client: DatacatClient,
  query: string,
  signal?: AbortSignal,
): Promise<CreatorSearchHit[]> {
  const q = normalizeCreatorQuery(query)
  if (!q) return []

  const byRef = new Map<string, CreatorSearchHit>()
  const slug = q.replace(/[^a-z0-9:_-]+/g, '').slice(0, 64)
  const lookups = [...new Set([q, slug].filter((value) => value.length >= 2))]

  await Promise.all(
    lookups.map(async (ref) => {
      try {
        const page = await fetchCreatorBootstrap(client, ref, signal)
        rememberCreatorHit(
          byRef,
          page.creator.ref,
          page.creator.name,
          page.characters.length,
        )
      } catch {
      }
    }),
  )

  try {
    const page = await fetchCatalogPage(
      client,
      withSignal({ offset: 0, search: q }, signal),
    )
    for (const row of page.characters) {
      const ref = row.creatorRef.trim().toLowerCase()
      if (!ref) continue
      const name = row.creatorName.trim() || ref
      const hay = `${ref} ${name}`.toLowerCase()
      if (!hay.includes(q) && ref !== slug) continue
      rememberCreatorHit(byRef, ref, name, 1)
    }
  } catch {
  }

  return [...byRef.values()].sort((a, b) => {
    if (a.ref === q || a.ref === slug) return -1
    if (b.ref === q || b.ref === slug) return 1
    return a.name.localeCompare(b.name)
  })
}
