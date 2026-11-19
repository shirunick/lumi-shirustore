declare const spindle: import('lumiverse-spindle-types').SpindleAPI

import { startRpc, type SpindleBackend } from './backend/rpc'

startRpc(spindle as unknown as SpindleBackend)
spindle.log.info('ShiruStore backend loaded.')
