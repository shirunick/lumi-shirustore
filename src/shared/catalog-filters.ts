import type { CatalogCharacter } from './character'

export type CatalogSort =
  | 'fresh'
  | 'first_published'
  | 'score'
  | 'chat_count'
  | 'messages_per_chat'

export type CatalogFilters = {
  minScore: number
  sort: CatalogSort
  tagIds: number[]
  excludeTags: string[]
  followedCreatorsOnly: boolean
}

export type SortOption = {
  value: CatalogSort
  label: string
}

export const CATALOG_SORT_OPTIONS: readonly SortOption[] = [
  { value: 'first_published', label: 'First published' },
  { value: 'fresh', label: 'Freshest' },
  { value: 'score', label: 'Highly rated' },
  { value: 'chat_count', label: 'Chat count' },
  { value: 'messages_per_chat', label: 'Msg/chat' },
]

export const DEFAULT_FILTERS: CatalogFilters = {
  minScore: 0,
  sort: 'first_published',
  tagIds: [],
  excludeTags: [],
  followedCreatorsOnly: false,
}

export function isCatalogSort(value: unknown): value is CatalogSort {
  return (
    value === 'fresh' ||
    value === 'first_published' ||
    value === 'score' ||
    value === 'chat_count' ||
    value === 'messages_per_chat'
  )
}

export function normalizeMinScore(value: unknown): number {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return 0
  if (n >= 100) return 100
  return Math.min(100, Math.round(n / 5) * 5)
}

export function normalizeTagName(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export function passesMinScore(
  character: CatalogCharacter,
  minScore: number,
): boolean {
  const floor = normalizeMinScore(minScore)
  if (floor <= 0) return true
  if (character.score === null) return false
  return character.score >= floor
}

export function filterByMinScore(
  characters: CatalogCharacter[],
  minScore: number,
): CatalogCharacter[] {
  const floor = normalizeMinScore(minScore)
  if (floor <= 0) return characters
  return characters.filter((character) => passesMinScore(character, floor))
}

export function hasExcludedTag(
  character: CatalogCharacter,
  excludeTags: string[],
): boolean {
  if (!excludeTags.length) return false
  const blocked = new Set(excludeTags.map(normalizeTagName))
  return character.tags.some((tag) => blocked.has(normalizeTagName(tag)))
}

export function needsClientFilter(filters: CatalogFilters): boolean {
  return (
    normalizeMinScore(filters.minScore) > 0 ||
    filters.excludeTags.length > 0 ||
    filters.followedCreatorsOnly
  )
}

export type ClientFilterContext = {
  followedRefs?: Set<string>
  followedNames?: Set<string>
}

export function matchesFollowedCreator(
  character: CatalogCharacter,
  ctx: ClientFilterContext,
): boolean {
  const ref = character.creatorRef.trim().toLowerCase()
  if (ref && ctx.followedRefs?.has(ref)) return true
  const name = character.creatorName.trim().toLowerCase()
  if (name && ctx.followedNames?.has(name)) return true
  return false
}

export function applyClientFilters(
  characters: CatalogCharacter[],
  filters: CatalogFilters,
  ctx: ClientFilterContext = {},
): CatalogCharacter[] {
  let rows = filterByMinScore(characters, filters.minScore).filter(
    (character) => !hasExcludedTag(character, filters.excludeTags),
  )
  if (filters.followedCreatorsOnly) {
    if (!ctx.followedRefs?.size && !ctx.followedNames?.size) return []
    rows = rows.filter((character) => matchesFollowedCreator(character, ctx))
  }
  return rows
}

export function activeFilterCount(filters: CatalogFilters): number {
  let count = 0
  if (normalizeMinScore(filters.minScore) > 0) count += 1
  if (filters.tagIds.length > 0) count += 1
  if (filters.excludeTags.length > 0) count += 1
  if (filters.sort !== 'first_published') count += 1
  if (filters.followedCreatorsOnly) count += 1
  return count
}

export function cloneFilters(
  filters: Partial<CatalogFilters> &
    Pick<CatalogFilters, 'minScore' | 'sort' | 'tagIds'>,
): CatalogFilters {
  const excludeTags = Array.isArray(filters.excludeTags)
    ? filters.excludeTags.map(normalizeTagName).filter(Boolean)
    : []
  return {
    minScore: normalizeMinScore(filters.minScore),
    sort: isCatalogSort(filters.sort) ? filters.sort : 'first_published',
    tagIds: [...new Set(filters.tagIds.filter((id) => Number.isFinite(id)))],
    excludeTags: [...new Set(excludeTags)],
    followedCreatorsOnly: filters.followedCreatorsOnly === true,
  }
}
