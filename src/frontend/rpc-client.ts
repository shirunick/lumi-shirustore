import type { SpindleFrontendContext } from 'lumiverse-spindle-types'
import {
  parseBackendPush,
  type BackendToFrontend,
  type FrontendToBackend,
} from '../shared/protocol'

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never

type RpcRequest = DistributiveOmit<FrontendToBackend, 'requestId'>

type Pending = {
  resolve: (value: BackendToFrontend) => void
  reject: (reason: Error) => void
}

type PushHandler = (
  message: Extract<BackendToFrontend, { type: 'imports_changed' }>,
) => void

const REQUEST_TIMEOUT_MS = 30_000

export class RpcClient {
  private readonly pending = new Map<string, Pending>()
  private readonly pushHandlers = new Set<PushHandler>()
  private readonly unsubscribe: () => void
  private seq = 0
  private destroyed = false

  constructor(private readonly ctx: SpindleFrontendContext) {
    this.unsubscribe = ctx.onBackendMessage((payload: unknown) => {
      this.onMessage(payload)
    })
  }

  destroy(): void {
    if (this.destroyed) return
    this.destroyed = true
    this.unsubscribe()
    this.pushHandlers.clear()
    for (const [, entry] of this.pending) {
      entry.reject(new Error('ShiruStore RPC client destroyed'))
    }
    this.pending.clear()
  }

  onPush(handler: PushHandler): () => void {
    this.pushHandlers.add(handler)
    return () => {
      this.pushHandlers.delete(handler)
    }
  }

  request(
    message: RpcRequest,
    signal?: AbortSignal,
    timeoutMs = REQUEST_TIMEOUT_MS,
  ): Promise<BackendToFrontend> {
    if (this.destroyed) {
      return Promise.reject(new Error('ShiruStore RPC client destroyed'))
    }
    const requestId = `ss-${Date.now()}-${++this.seq}`
    const full = { ...message, requestId } as FrontendToBackend

    return new Promise((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | null = null
      const cleanup = () => {
        if (timer !== null) {
          clearTimeout(timer)
          timer = null
        }
        signal?.removeEventListener('abort', onAbort)
      }
      const onAbort = () => {
        this.pending.delete(requestId)
        cleanup()
        reject(new DOMException('ShiruStore RPC aborted', 'AbortError'))
      }
      if (signal?.aborted) {
        onAbort()
        return
      }
      signal?.addEventListener('abort', onAbort, { once: true })
      if (timeoutMs > 0) {
        timer = setTimeout(() => {
          if (!this.pending.delete(requestId)) return
          cleanup()
          reject(new Error('ShiruStore backend request timed out'))
        }, timeoutMs)
      }
      this.pending.set(requestId, {
        resolve: (value) => {
          cleanup()
          resolve(value)
        },
        reject: (reason) => {
          cleanup()
          reject(reason)
        },
      })
      this.ctx.sendToBackend(full)
    })
  }

  private onMessage(payload: unknown): void {
    const push = parseBackendPush(payload)
    if (push) {
      for (const handler of this.pushHandlers) {
        try {
          handler(push)
        } catch {
        }
      }
      return
    }
    if (!payload || typeof payload !== 'object') return
    const record = payload as BackendToFrontend
    if (!('requestId' in record) || typeof record.requestId !== 'string') return
    const pending = this.pending.get(record.requestId)
    if (!pending) return
    this.pending.delete(record.requestId)
    if (record.type === 'error_result') {
      pending.reject(new Error(record.message))
      return
    }
    pending.resolve(record)
  }
}
