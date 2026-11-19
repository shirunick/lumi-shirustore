import { isRecord } from './protocol'

export type CatalogTag = {
  id: number
  name: string
  count: number
  group: string
}

export function normalizeTag(value: unknown): CatalogTag | null {
  if (!isRecord(value)) return null
  const id = Number(value.id)
  if (!Number.isFinite(id) || id <= 0) return null
  const name = String(value.name || value.label || '').trim()
  if (!name) return null
  const count = Number(value.count ?? value.usageCount ?? 0)
  const group = String(value.group || value.category || '').trim()
  return {
    id,
    name,
    count: Number.isFinite(count) && count > 0 ? count : 0,
    group,
  }
}

export function normalizeTagList(value: unknown): CatalogTag[] {
  if (!Array.isArray(value)) return []
  const byId = new Map<number, CatalogTag>()
  for (const row of value) {
    const tag = normalizeTag(row)
    if (!tag) continue
    byId.set(tag.id, tag)
  }
  return [...byId.values()]
}
