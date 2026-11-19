import { isRecord } from '../../shared/protocol'

export type LumiverseChatSummary = {
  id: string
  name: string
  messageCount: number | null
  updatedAt: number | null
  createdAt: number | null
}

function asId(value: unknown): string {
  return String(value || '').trim()
}

function asEpoch(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function normalizeChatSummary(value: unknown): LumiverseChatSummary | null {
  if (!isRecord(value)) return null
  const id = asId(value.id)
  if (!id) return null
  const messageCount = Number(value.message_count)
  return {
    id,
    name: String(value.name || '').trim(),
    messageCount: Number.isFinite(messageCount) ? messageCount : null,
    updatedAt: asEpoch(value.updated_at),
    createdAt: asEpoch(value.created_at),
  }
}

export async function listCharacterChats(
  lumiverseId: string,
  signal?: AbortSignal,
): Promise<LumiverseChatSummary[]> {
  const id = asId(lumiverseId)
  if (!id) return []
  const init: RequestInit = {
    credentials: 'include',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  }
  if (signal) init.signal = signal
  const res = await fetch(
    `/api/v1/chats/character-chats/${encodeURIComponent(id)}`,
    init,
  )
  const payload = (await res.json().catch(() => null)) as unknown
  if (!res.ok) {
    const record = isRecord(payload) ? payload : {}
    throw new Error(
      String(record.error || `Could not load chats (${res.status})`),
    )
  }
  if (!Array.isArray(payload)) return []
  return payload
    .map(normalizeChatSummary)
    .filter((row): row is LumiverseChatSummary => row !== null)
}

export async function createLumiverseChat(
  lumiverseId: string,
  opts: { greetingIndex?: number; signal?: AbortSignal } = {},
): Promise<string> {
  const id = asId(lumiverseId)
  if (!id) throw new Error('Missing Lumiverse character id')
  const body: Record<string, unknown> = { character_id: id }
  if (
    typeof opts.greetingIndex === 'number' &&
    Number.isInteger(opts.greetingIndex)
  ) {
    body.greeting_index = opts.greetingIndex
  }
  const init: RequestInit = {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  }
  if (opts.signal) init.signal = opts.signal
  const res = await fetch('/api/v1/chats', init)
  const payload = (await res.json().catch(() => null)) as unknown
  const record = isRecord(payload) ? payload : {}
  if (!res.ok) {
    throw new Error(
      String(record.error || `Could not create chat (${res.status})`),
    )
  }
  const chatId = asId(record.id)
  if (!chatId) throw new Error('Lumiverse returned no usable chat.')
  return chatId
}

export function navigateLumiverseChat(chatId: string): void {
  const id = asId(chatId)
  if (!id) throw new Error('Lumiverse returned no usable chat.')
  const target = `/chat/${encodeURIComponent(id)}`
  if (window.location.pathname === target) return
  const currentState =
    window.history.state && typeof window.history.state === 'object'
      ? (window.history.state as Record<string, unknown>)
      : {}
  const currentIndex = Number(currentState.idx)
  window.history.pushState(
    {
      ...currentState,
      usr: null,
      key: Math.random().toString(36).slice(2, 10),
      idx: Number.isFinite(currentIndex) ? currentIndex + 1 : 1,
    },
    '',
    target,
  )
  window.dispatchEvent(
    new PopStateEvent('popstate', { state: window.history.state }),
  )
}
