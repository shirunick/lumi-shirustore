import { lorebookHint, type LorebookHint } from './lorebook'
import { isRecord } from './protocol'
import { parseScore } from './score'
import { isUuid } from './uuid'

export type CatalogCharacter = {
  id: string
  name: string
  description: string
  firstMessage: string
  creatorName: string
  creatorRef: string
  imageUrl: string
  tags: string[]
  score: number | null
  lorebook?: LorebookHint
}

export type Paging = {
  hasMore: boolean
  nextOffset: number
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function tagName(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (!isRecord(value)) return ''
  return asString(value.name || value.label).trim()
}

function safeImageUrl(value: unknown): string {
  const raw = asString(value).trim()
  if (!raw) return ''
  if (raw.startsWith('/') && !raw.startsWith('//')) return raw
  try {
    const parsed = new URL(raw)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
      ? parsed.toString()
      : ''
  } catch {
    return ''
  }
}

export function normalizeCharacter(value: unknown): CatalogCharacter | null {
  if (!isRecord(value)) return null
  const id = asString(value.id).trim().toLowerCase()
  if (!isUuid(id)) return null
  const creator = isRecord(value.creator) ? value.creator : null
  const image = isRecord(value.image) ? value.image : null
  const stats = isRecord(value.stats) ? value.stats : null
  const tags = [
    ...(Array.isArray(value.tags) ? value.tags : []),
    ...(Array.isArray(value.customTags) ? value.customTags : []),
  ]
    .map(tagName)
    .filter(Boolean)

  let imageUrl = ''
  const status = asString(image?.status).trim().toLowerCase()
  if (!status || status === 'ready') {
    imageUrl = safeImageUrl(image?.url || value.avatarUrl)
  }

  const creatorRef = (
    asString(creator?.ref || creator?.id || value.creatorId).trim() || ''
  ).toLowerCase()

  const lorebook = lorebookHint(value)
  return {
    ...(lorebook ? { lorebook } : {}),
    id,
    name: asString(value.name).trim() || 'Untitled character',
    description: asString(value.description || value.personality).trim(),
    firstMessage: asString(
      value.firstMes || value.first_mes || value.firstMessage,
    ).trim(),
    creatorName:
      asString(creator?.name || value.creatorName).trim() || 'Unknown creator',
    creatorRef,
    imageUrl,
    tags,
    score: parseScore(
      value.score ??
        stats?.score ??
        stats?.rating ??
        stats?.completeness ??
        value.ratingScore ??
        value.qualityScore,
    ),
  }
}

export function normalizeCharacterList(value: unknown): CatalogCharacter[] {
  if (!Array.isArray(value)) return []
  const out: CatalogCharacter[] = []
  for (const row of value) {
    const character = normalizeCharacter(row)
    if (character) out.push(character)
  }
  return out
}

export function normalizePaging(
  value: unknown,
  fallbackOffset: number,
  rowCount: number,
): Paging {
  const paging = isRecord(value) ? value : {}
  const nextOffset = Number(paging.nextOffset ?? fallbackOffset + rowCount)
  return {
    hasMore: paging.hasMore === true,
    nextOffset:
      Number.isFinite(nextOffset) && nextOffset >= 0
        ? nextOffset
        : fallbackOffset + rowCount,
  }
}
