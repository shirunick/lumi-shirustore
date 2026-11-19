import type { CatalogCharacter } from './character'

export type AffinityProfile = {
  tags: Map<string, number>
  creators: Map<string, number>
}

export type AffinitySeed = {
  tags?: string[]
  creatorName?: string
  creatorRef?: string
}

function norm(value: string): string {
  return value.trim().toLowerCase()
}

export function buildAffinityProfile(seeds: AffinitySeed[]): AffinityProfile {
  const tags = new Map<string, number>()
  const creators = new Map<string, number>()
  for (const seed of seeds) {
    for (const tag of seed.tags || []) {
      const key = norm(tag)
      if (!key) continue
      tags.set(key, (tags.get(key) || 0) + 1)
    }
    const creator = norm(seed.creatorRef || seed.creatorName || '')
    if (creator) {
      creators.set(creator, (creators.get(creator) || 0) + 2)
    }
  }
  return { tags, creators }
}

export function affinityScore(
  character: CatalogCharacter,
  profile: AffinityProfile,
): number {
  if (!profile.tags.size && !profile.creators.size) return 0
  let score = 0
  for (const tag of character.tags) {
    score += profile.tags.get(norm(tag)) || 0
  }
  const creatorKey = norm(character.creatorRef || character.creatorName)
  if (creatorKey) score += (profile.creators.get(creatorKey) || 0) * 2
  if (character.score !== null) score += character.score / 50
  return score
}

export function rankByAffinity(
  characters: CatalogCharacter[],
  profile: AffinityProfile,
  opts: { excludeIds?: Set<string>; limit?: number } = {},
): CatalogCharacter[] {
  const exclude = opts.excludeIds || new Set<string>()
  const limit = opts.limit ?? 12
  return [...characters]
    .filter((character) => !exclude.has(character.id))
    .map((character) => ({
      character,
      score: affinityScore(character, profile),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.character)
}
