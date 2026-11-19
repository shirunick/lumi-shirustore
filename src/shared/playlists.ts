import type { CatalogCharacter } from './character'
import { isRecord } from './protocol'
import { parseScore } from './score'
import { isUuid } from './uuid'

export type PlaylistCard = {
  id: string
  name: string
  creatorName: string
  creatorRef: string
  imageUrl: string
  tags: string[]
  score: number | null
}

export type Playlist = {
  id: string
  name: string
  characterIds: string[]
  cards: PlaylistCard[]
  createdAt: string
}

const STORAGE_KEY = 'shirustore:playlists'

function newId(): string {
  return `pl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function playlistCardFromCharacter(
  character: CatalogCharacter,
): PlaylistCard {
  return {
    id: character.id,
    name: character.name,
    creatorName: character.creatorName,
    creatorRef: character.creatorRef,
    imageUrl: character.imageUrl,
    tags: [...character.tags],
    score: character.score,
  }
}

export function characterFromPlaylistCard(
  card: PlaylistCard,
): CatalogCharacter {
  return {
    id: card.id,
    name: card.name,
    description: '',
    firstMessage: '',
    creatorName: card.creatorName,
    creatorRef: card.creatorRef || '',
    imageUrl: card.imageUrl,
    tags: [...card.tags],
    score: card.score,
  }
}

function normalizePlaylistCard(value: unknown): PlaylistCard | null {
  if (!isRecord(value)) return null
  const id = String(value.id || '').trim().toLowerCase()
  if (!isUuid(id)) return null
  const tags = Array.isArray(value.tags)
    ? value.tags.map((tag) => String(tag || '').trim()).filter(Boolean)
    : []
  return {
    id,
    name: String(value.name || 'Character').trim() || 'Character',
    creatorName: String(value.creatorName || '').trim() || 'Unknown creator',
    creatorRef: String(value.creatorRef || '').trim().toLowerCase(),
    imageUrl: String(value.imageUrl || '').trim(),
    tags,
    score: parseScore(value.score),
  }
}

export function normalizePlaylist(value: unknown): Playlist | null {
  if (!isRecord(value)) return null
  const id = String(value.id || '').trim()
  const name = String(value.name || '').trim()
  if (!id || !name) return null
  const cardsRaw = Array.isArray(value.cards) ? value.cards : []
  const cards = cardsRaw
    .map(normalizePlaylistCard)
    .filter((row): row is PlaylistCard => row !== null)
  const byId = new Map(cards.map((card) => [card.id, card]))
  const fromIds = Array.isArray(value.characterIds)
    ? value.characterIds
        .map((row) => String(row || '').trim().toLowerCase())
        .filter(isUuid)
    : []
  for (const characterId of fromIds) {
    if (byId.has(characterId)) continue
    byId.set(characterId, {
      id: characterId,
      name: 'Saved character',
      creatorName: '',
      creatorRef: '',
      imageUrl: '',
      tags: [],
      score: null,
    })
  }
  const characterIds = [...byId.keys()]
  return {
    id,
    name,
    characterIds,
    cards: characterIds
      .map((characterId) => byId.get(characterId))
      .filter((row): row is PlaylistCard => row !== undefined),
    createdAt: String(value.createdAt || new Date().toISOString()),
  }
}

export function loadPlaylists(
  storage: Pick<Storage, 'getItem'> = localStorage,
): Playlist[] {
  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return defaultPlaylists()
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return defaultPlaylists()
    const list = parsed
      .map(normalizePlaylist)
      .filter((row): row is Playlist => row !== null)
    return list.length ? list : defaultPlaylists()
  } catch {
    return defaultPlaylists()
  }
}

export function savePlaylists(
  playlists: Playlist[],
  storage: Pick<Storage, 'setItem'> = localStorage,
): void {
  const clean = playlists
    .map(normalizePlaylist)
    .filter((row): row is Playlist => row !== null)
  storage.setItem(STORAGE_KEY, JSON.stringify(clean))
}

export function createPlaylist(name: string): Playlist {
  return {
    id: newId(),
    name: name.trim() || 'Collection',
    characterIds: [],
    cards: [],
    createdAt: new Date().toISOString(),
  }
}

export function addToPlaylist(
  playlists: Playlist[],
  playlistId: string,
  character: CatalogCharacter | string,
): Playlist[] {
  const card =
    typeof character === 'string'
      ? normalizePlaylistCard({ id: character, name: 'Saved character' })
      : playlistCardFromCharacter(character)
  if (!card) return playlists
  return playlists.map((playlist) => {
    if (playlist.id !== playlistId) return playlist
    if (playlist.characterIds.includes(card.id)) {
      return {
        ...playlist,
        cards: playlist.cards.map((existing) =>
          existing.id === card.id ? card : existing,
        ),
      }
    }
    return {
      ...playlist,
      characterIds: [...playlist.characterIds, card.id],
      cards: [...playlist.cards, card],
    }
  })
}

export function removeFromPlaylist(
  playlists: Playlist[],
  playlistId: string,
  characterId: string,
): Playlist[] {
  const id = characterId.trim().toLowerCase()
  if (!isUuid(id)) return playlists
  return playlists.map((playlist) => {
    if (playlist.id !== playlistId) return playlist
    return {
      ...playlist,
      characterIds: playlist.characterIds.filter((row) => row !== id),
      cards: playlist.cards.filter((card) => card.id !== id),
    }
  })
}

export function deletePlaylist(
  playlists: Playlist[],
  playlistId: string,
): Playlist[] {
  if (playlistId === 'starter_saved') {
    return playlists.map((playlist) =>
      playlist.id === 'starter_saved'
        ? {
            ...playlist,
            characterIds: [],
            cards: [],
          }
        : playlist,
    )
  }
  const next = playlists.filter((playlist) => playlist.id !== playlistId)
  return next.length ? next : defaultPlaylists()
}

export function mergePlaylistLists(
  primary: Playlist[],
  secondary: Playlist[],
): Playlist[] {
  const byId = new Map<string, Playlist>()
  for (const list of [...primary, ...secondary]) {
    const normalized = normalizePlaylist(list)
    if (!normalized) continue
    const existing = byId.get(normalized.id)
    if (!existing) {
      byId.set(normalized.id, normalized)
      continue
    }
    let merged: Playlist = {
      ...existing,
      name: existing.name || normalized.name,
      createdAt:
        existing.createdAt <= normalized.createdAt
          ? existing.createdAt
          : normalized.createdAt,
    }
    for (const card of normalized.cards) {
      merged = addToPlaylist([merged], merged.id, characterFromPlaylistCard(card))[0]!
    }
    byId.set(normalized.id, merged)
  }
  if (!byId.has('starter_saved')) {
    byId.set('starter_saved', defaultPlaylists()[0]!)
  }
  return [...byId.values()].sort((a, b) => {
    if (a.id === 'starter_saved') return -1
    if (b.id === 'starter_saved') return 1
    return b.createdAt.localeCompare(a.createdAt)
  })
}

export function defaultPlaylists(): Playlist[] {
  return [
    {
      id: 'starter_saved',
      name: 'Saved from Hunt',
      characterIds: [],
      cards: [],
      createdAt: new Date(0).toISOString(),
    },
  ]
}
