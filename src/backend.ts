declare const spindle: import('lumiverse-spindle-types').SpindleAPI

import {
  startImportSync,
  type ImportSyncApi,
} from './backend/import-sync'
import { startRpc, type SpindleBackend } from './backend/rpc'

startRpc(spindle as unknown as SpindleBackend)
startImportSync(spindle as unknown as ImportSyncApi)
spindle.log.info('ShiruStore backend loaded.')
