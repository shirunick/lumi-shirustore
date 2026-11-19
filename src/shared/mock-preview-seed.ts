import type { FollowedCreator } from './followed-creators'
import type { ImportRecord } from './import-index'
import { MOCK_CHARACTERS, MOCK_CREATORS } from './mock-catalog-data'
import type { Playlist } from './playlists'

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
}

export function mockPreviewImports(): ImportRecord[] {
  return MOCK_CHARACTERS.slice(0, 10).map((row, index) => ({
    datacatId: row.id,
    lumiverseId: `mock-lumi-${index + 1}`,
    name: row.name,
    importedAt: daysAgo(index % 4),
    imageUrl: row.image.url,
    score: row.score,
  }))
}

export function mockPreviewFollows(): FollowedCreator[] {
  return MOCK_CREATORS.map((creator, index) => ({
    ref: creator.ref,
    name: creator.name,
    followedAt: daysAgo(index + 1),
  }))
}

export function mockPreviewPlaylists(): Playlist[] {
  const savedCards = MOCK_CHARACTERS.slice(10, 16).map((row) => ({
    id: row.id,
    name: row.name,
    creatorName: row.creator.name,
    creatorRef: row.creator.ref,
    imageUrl: row.image.url,
    tags: [...row.tags],
    score: row.score,
  }))
  const laterCards = MOCK_CHARACTERS.slice(16, 20).map((row) => ({
    id: row.id,
    name: row.name,
    creatorName: row.creator.name,
    creatorRef: row.creator.ref,
    imageUrl: row.image.url,
    tags: [...row.tags],
    score: row.score,
  }))
  return [
    {
      id: 'starter_saved',
      name: 'Saved from Hunt',
      characterIds: savedCards.map((card) => card.id),
      cards: savedCards,
      createdAt: daysAgo(8),
    },
    {
      id: 'mock_favorites',
      name: 'Screenshot favorites',
      characterIds: laterCards.map((card) => card.id),
      cards: laterCards,
      createdAt: daysAgo(3),
    },
  ]
}
