import { isRecord } from './protocol'

export type LorebookHint = {
  present: boolean
  entries: number | null
}

export function countBookEntries(book: unknown): number {
  if (!isRecord(book)) return 0
  const entries = book.entries
  if (Array.isArray(entries)) return entries.length
  if (isRecord(entries)) return Object.keys(entries).length
  return 0
}

function bookCandidates(source: Record<string, unknown>): unknown[] {
  const data = isRecord(source.data) ? source.data : {}
  const dataExt = isRecord(data.extensions) ? data.extensions : {}
  const ext = isRecord(source.extensions) ? source.extensions : {}
  return [
    data.character_book,
    dataExt.character_book,
    source.character_book,
    source.characterBook,
    source.lorebook,
    source.worldBook,
    ext.character_book,
  ]
}

export function findCharacterBook(
  ...sources: unknown[]
): Record<string, unknown> | null {
  for (const source of sources) {
    if (!isRecord(source)) continue
    for (const candidate of bookCandidates(source)) {
      if (countBookEntries(candidate) > 0) {
        return candidate as Record<string, unknown>
      }
    }
  }
  return null
}

function positiveCount(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null
}

export function lorebookHint(value: unknown): LorebookHint | null {
  if (!isRecord(value)) return null
  const book = findCharacterBook(value)
  if (book) return { present: true, entries: countBookEntries(book) }
  const stats = isRecord(value.stats) ? value.stats : {}
  const counted =
    positiveCount(value.lorebookEntryCount) ??
    positiveCount(value.lorebookEntries) ??
    positiveCount(value.characterBookEntries) ??
    positiveCount(stats.lorebookEntries) ??
    positiveCount(stats.lorebookEntryCount)
  if (counted) return { present: true, entries: counted }
  const flag =
    value.hasLorebook ?? value.hasCharacterBook ?? stats.hasLorebook
  if (typeof flag === 'boolean') return { present: flag, entries: null }
  return null
}

const WRAPPER_KEYS = new Set(['spec', 'spec_version', 'data'])

export function toImportCard(
  card: Record<string, unknown>,
  opts: { includeLorebook: boolean; fallbackBook?: Record<string, unknown> | null },
): { payload: Record<string, unknown>; lorebookEntries: number } {
  const wrapped = isRecord(card.data) && typeof card.spec === 'string'
  const data: Record<string, unknown> = wrapped
    ? { ...(card.data as Record<string, unknown>) }
    : Object.fromEntries(
        Object.entries(card).filter(([key]) => !WRAPPER_KEYS.has(key)),
      )
  const extensions = isRecord(data.extensions) ? { ...data.extensions } : {}
  if (!wrapped && isRecord(card.extensions)) Object.assign(extensions, card.extensions)

  const book = findCharacterBook(card, { data }) ?? opts.fallbackBook ?? null
  delete data.characterBook
  delete data.lorebook
  delete data.worldBook
  delete extensions.character_book
  let lorebookEntries = 0
  if (opts.includeLorebook && book) {
    data.character_book = book
    lorebookEntries = countBookEntries(book)
  } else {
    delete data.character_book
  }
  data.extensions = extensions

  return {
    payload: {
      spec: wrapped ? card.spec : 'chara_card_v2',
      spec_version: wrapped ? (card.spec_version ?? '2.0') : '2.0',
      data,
    },
    lorebookEntries,
  }
}
