import { isRecord } from './protocol'
import { isUuid } from './uuid'

export type ImportRecord = {
  datacatId: string
  lumiverseId: string
  name: string
  importedAt: string
  imageUrl: string
  score: number | null
}

const STORAGE_KEY = 'shirustore:import-index'

export function normalizeImportRecord(value: unknown): ImportRecord | null {
  if (!isRecord(value)) return null
  const datacatId = String(value.datacatId || '').trim().toLowerCase()
  const lumiverseId = String(value.lumiverseId || '').trim()
  if (!isUuid(datacatId) || !lumiverseId) return null
  const importedAt = String(value.importedAt || '').trim()
  const scoreRaw = value.score
  const score =
    typeof scoreRaw === 'number' && Number.isFinite(scoreRaw) ? scoreRaw : null
  return {
    datacatId,
    lumiverseId,
    name: String(value.name || 'Character').trim() || 'Character',
    importedAt: importedAt || new Date(0).toISOString(),
    imageUrl: String(value.imageUrl || '').trim(),
    score,
  }
}

export function loadImportIndex(
  storage: Pick<Storage, 'getItem'> = localStorage,
): ImportRecord[] {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const byId = new Map<string, ImportRecord>()
    for (const row of parsed) {
      const record = normalizeImportRecord(row)
      if (!record) continue
      byId.set(record.datacatId, record)
    }
    return [...byId.values()].sort((a, b) =>
      b.importedAt.localeCompare(a.importedAt),
    )
  } catch {
    return []
  }
}

export function saveImportIndex(
  records: ImportRecord[],
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  const clean = records
    .map(normalizeImportRecord)
    .filter((row): row is ImportRecord => row !== null)
  storage.setItem(STORAGE_KEY, JSON.stringify(clean))
}

export function upsertImportRecord(
  records: ImportRecord[],
  next: ImportRecord,
): ImportRecord[] {
  const normalized = normalizeImportRecord(next)
  if (!normalized) return records
  const without = records.filter(
    (row) => row.datacatId !== normalized.datacatId,
  )
  return [normalized, ...without]
}

export function removeImportRecord(
  records: ImportRecord[],
  datacatId: string,
): ImportRecord[] {
  const id = String(datacatId || '').trim().toLowerCase()
  if (!id) return records
  return records.filter((row) => row.datacatId !== id)
}

export function importedIdSet(records: ImportRecord[]): Set<string> {
  return new Set(records.map((row) => row.datacatId))
}

export function filterOutImported<T extends { id: string }>(
  rows: T[],
  importedIds: Set<string>,
): T[] {
  if (!importedIds.size) return rows
  return rows.filter((row) => !importedIds.has(row.id))
}

export function mergeImportRecords(
  primary: ImportRecord[],
  secondary: ImportRecord[],
): ImportRecord[] {
  const byId = new Map<string, ImportRecord>()
  for (const row of [...primary, ...secondary]) {
    const normalized = normalizeImportRecord(row)
    if (!normalized) continue
    const existing = byId.get(normalized.datacatId)
    if (!existing || normalized.importedAt > existing.importedAt) {
      byId.set(normalized.datacatId, normalized)
    }
  }
  return [...byId.values()].sort((a, b) =>
    b.importedAt.localeCompare(a.importedAt),
  )
}

export function normalizeImportList(value: unknown): ImportRecord[] {
  if (!Array.isArray(value)) return []
  return mergeImportRecords(value as ImportRecord[], [])
}
