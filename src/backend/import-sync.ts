import {
  normalizeImportList,
  removeImportsByLumiverseId,
} from '../shared/import-index'
import type { BackendToFrontend } from '../shared/protocol'
import { readUserStore, writeUserStore, type UserStoreApi } from './user-store'

export type ImportSyncApi = UserStoreApi & {
  on?: (
    event: string,
    handler: (payload: unknown, userId?: string) => void,
  ) => () => void
  sendToFrontend: (payload: BackendToFrontend, userId?: string) => void
  log: { info: (message: string) => void; warn?: (message: string) => void }
}

function deletedCharacterId(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return ''
  const id = (payload as { id?: unknown }).id
  return typeof id === 'string' ? id.trim() : ''
}

async function pruneImportsForDeletedCharacter(
  api: ImportSyncApi,
  lumiverseId: string,
  userId: string | undefined,
): Promise<void> {
  const current = normalizeImportList(await readUserStore(api, 'imports', userId))
  const next = removeImportsByLumiverseId(current, lumiverseId)
  if (next.length === current.length) return
  await writeUserStore(api, 'imports', next, userId)
  api.sendToFrontend({ type: 'imports_changed', value: next }, userId)
  api.log.info(
    `ShiruStore: pruned import index after CHARACTER_DELETED id=${lumiverseId}`,
  )
}

export function startImportSync(api: ImportSyncApi): () => void {
  if (typeof api.on !== 'function') {
    api.log.warn?.(
      'ShiruStore: spindle.on missing, import sync on delete is disabled',
    )
    return () => {}
  }
  return api.on('CHARACTER_DELETED', (payload, userId) => {
    const id = deletedCharacterId(payload)
    if (!id) return
    void pruneImportsForDeletedCharacter(api, id, userId).catch((error) => {
      const message =
        error instanceof Error ? error.message : 'import sync failed'
      api.log.warn?.(`ShiruStore: CHARACTER_DELETED prune failed: ${message}`)
    })
  })
}
