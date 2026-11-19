import {
  cloneFilters,
  DEFAULT_FILTERS,
  isCatalogSort,
  normalizeMinScore,
  type CatalogFilters,
} from './catalog-filters'
import { isRecord } from './protocol'

export type FilterPreset = {
  id: string
  name: string
  filters: CatalogFilters
}

const STORAGE_KEY = 'shirustore:filter-presets'

function newId(): string {
  return `preset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function normalizeFilterPreset(value: unknown): FilterPreset | null {
  if (!isRecord(value)) return null
  const id = String(value.id || '').trim()
  const name = String(value.name || '').trim()
  if (!id || !name) return null
  const raw = isRecord(value.filters) ? value.filters : value
  const tagIds = Array.isArray(raw.tagIds)
    ? raw.tagIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
    : []
  const filters = cloneFilters({
    minScore: normalizeMinScore(raw.minScore),
    sort: isCatalogSort(raw.sort) ? raw.sort : DEFAULT_FILTERS.sort,
    tagIds,
    excludeTags: Array.isArray(raw.excludeTags)
      ? raw.excludeTags.filter((tag): tag is string => typeof tag === 'string')
      : [],
    followedCreatorsOnly: raw.followedCreatorsOnly === true,
  })
  return { id, name, filters }
}

export function loadFilterPresets(
  storage: Pick<Storage, 'getItem'> = localStorage,
): FilterPreset[] {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(normalizeFilterPreset)
      .filter((row): row is FilterPreset => row !== null)
  } catch {
    return []
  }
}

export function saveFilterPresets(
  presets: FilterPreset[],
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  const clean = presets
    .map(normalizeFilterPreset)
    .filter((row): row is FilterPreset => row !== null)
  storage.setItem(STORAGE_KEY, JSON.stringify(clean))
}

export function createFilterPreset(
  name: string,
  filters: CatalogFilters,
): FilterPreset {
  return {
    id: newId(),
    name: name.trim() || 'Saved filter',
    filters: cloneFilters(filters),
  }
}
