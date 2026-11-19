import {
  loadFollowedCreators,
  mergeFollowedCreators,
  normalizeFollowedCreator,
  saveFollowedCreators,
  type FollowedCreator,
} from '../../shared/followed-creators'
import {
  loadImportIndex,
  mergeImportRecords,
  normalizeImportList,
  saveImportIndex,
  type ImportRecord,
} from '../../shared/import-index'
import {
  loadPlaylists,
  mergePlaylistLists,
  normalizePlaylist,
  savePlaylists,
  type Playlist,
} from '../../shared/playlists'
import type { RpcClient } from '../rpc-client'

function asPlaylistList(value: unknown): Playlist[] {
  if (!Array.isArray(value)) return []
  return value
    .map(normalizePlaylist)
    .filter((row): row is Playlist => row !== null)
}

function asFollowList(value: unknown): FollowedCreator[] {
  if (!Array.isArray(value)) return []
  const byRef = new Map<string, FollowedCreator>()
  for (const row of value) {
    const creator = normalizeFollowedCreator(row)
    if (!creator) continue
    byRef.set(creator.ref, creator)
  }
  return [...byRef.values()].sort((a, b) =>
    b.followedAt.localeCompare(a.followedAt),
  )
}

function playlistCardCount(list: Playlist[]): number {
  return list.reduce((sum, row) => sum + row.characterIds.length, 0)
}

function playlistFingerprint(list: Playlist[]): string {
  return JSON.stringify(
    list.map((row) => ({
      id: row.id,
      name: row.name,
      characterIds: [...row.characterIds].sort(),
    })),
  )
}

export class UserStoreClient {
  constructor(private readonly rpc: RpcClient) {}

  async loadPlaylists(signal?: AbortSignal): Promise<Playlist[]> {
    const local = loadPlaylists()
    try {
      const result = await this.rpc.request(
        { type: 'user_store_get', key: 'playlists' },
        signal,
      )
      if (result.type !== 'user_store_result') return local
      const remote = asPlaylistList(result.value)
      const merged = mergePlaylistLists(remote, local)
      savePlaylists(merged)

      const remoteCount = playlistCardCount(remote)
      const mergedCount = playlistCardCount(merged)
      const needsUpload =
        mergedCount > remoteCount ||
        (remoteCount === 0 &&
          playlistFingerprint(merged) !== playlistFingerprint(remote))

      if (needsUpload) {
        await this.savePlaylists(merged, signal)
      }
      return merged
    } catch {
      return local
    }
  }

  async savePlaylists(
    playlists: Playlist[],
    signal?: AbortSignal,
  ): Promise<void> {
    const clean = asPlaylistList(playlists)
    savePlaylists(clean)
    await this.rpc.request(
      { type: 'user_store_put', key: 'playlists', value: clean },
      signal,
    )
  }

  async loadImports(signal?: AbortSignal): Promise<ImportRecord[]> {
    const local = loadImportIndex()
    try {
      const result = await this.rpc.request(
        { type: 'user_store_get', key: 'imports' },
        signal,
      )
      if (result.type !== 'user_store_result') return local
      const remote = normalizeImportList(result.value)
      const merged = mergeImportRecords(remote, local)
      saveImportIndex(merged)
      if (merged.length > remote.length) {
        await this.saveImports(merged, signal)
      }
      return merged
    } catch {
      return local
    }
  }

  async saveImports(
    records: ImportRecord[],
    signal?: AbortSignal,
  ): Promise<void> {
    const clean = normalizeImportList(records)
    saveImportIndex(clean)
    await this.rpc.request(
      { type: 'user_store_put', key: 'imports', value: clean },
      signal,
    )
  }

  async loadFollows(signal?: AbortSignal): Promise<FollowedCreator[]> {
    const local = loadFollowedCreators()
    try {
      const result = await this.rpc.request(
        { type: 'user_store_get', key: 'follows' },
        signal,
      )
      if (result.type !== 'user_store_result') return local
      const remote = asFollowList(result.value)
      const merged = mergeFollowedCreators(remote, local)
      saveFollowedCreators(merged)
      if (merged.length > remote.length) {
        await this.saveFollows(merged, signal)
      }
      return merged
    } catch {
      return local
    }
  }

  async saveFollows(
    creators: FollowedCreator[],
    signal?: AbortSignal,
  ): Promise<void> {
    const clean = asFollowList(creators)
    saveFollowedCreators(clean)
    await this.rpc.request(
      { type: 'user_store_put', key: 'follows', value: clean },
      signal,
    )
  }
}
