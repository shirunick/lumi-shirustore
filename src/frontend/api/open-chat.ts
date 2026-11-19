import { withSignal } from '../../shared/options'
import {
  createLumiverseChat,
  listCharacterChats,
  navigateLumiverseChat,
  type LumiverseChatSummary,
} from './lumiverse-chat'

function formatChatDate(value: number | null): string {
  if (!value) return ''
  const ms = value < 10_000_000_000 ? value * 1000 : value
  const date = new Date(ms)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString()
}

export function chatPickerOptions(
  chats: LumiverseChatSummary[],
): Array<{ id: string; label: string; meta?: string }> {
  const options: Array<{ id: string; label: string; meta?: string }> = [
    { id: 'new', label: '＋ New chat' },
  ]
  chats.forEach((chat, index) => {
    const stamp = formatChatDate(chat.updatedAt || chat.createdAt)
    const count =
      chat.messageCount != null
        ? `${chat.messageCount} message${chat.messageCount === 1 ? '' : 's'}`
        : ''
    const meta = [count, stamp].filter(Boolean).join(' · ')
    const label =
      chat.name || (stamp ? `Chat from ${stamp}` : `Chat ${index + 1}`)
    options.push({
      id: chat.id,
      label: index === 0 ? `${label} · Most recent` : label,
      ...(meta ? { meta } : {}),
    })
  })
  return options
}

export async function resolveAndOpenChat(opts: {
  lumiverseId: string
  characterName: string
  signal?: AbortSignal
  pickChat: (
    characterName: string,
    chats: LumiverseChatSummary[],
  ) => Promise<'new' | string | null>
  setBusy?: (busy: boolean, message?: string) => void
}): Promise<boolean> {
  opts.setBusy?.(true, 'Opening…')
  const chats = await listCharacterChats(opts.lumiverseId, opts.signal)
  if (opts.signal?.aborted) return false
  if (chats.length > 1) {
    opts.setBusy?.(false)
    const choice = await opts.pickChat(opts.characterName, chats)
    if (!choice) return false
    if (choice === 'new') {
      opts.setBusy?.(true, 'Creating…')
      const chatId = await createLumiverseChat(
        opts.lumiverseId,
        withSignal({}, opts.signal),
      )
      navigateLumiverseChat(chatId)
    } else {
      navigateLumiverseChat(choice)
    }
    return true
  }
  if (chats.length === 1 && chats[0]) {
    navigateLumiverseChat(chats[0].id)
    return true
  }
  const chatId = await createLumiverseChat(
    opts.lumiverseId,
    withSignal({}, opts.signal),
  )
  navigateLumiverseChat(chatId)
  return true
}
