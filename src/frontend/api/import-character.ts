import {
  DATACAT_API_ORIGIN,
  EXTENSION_VERSION,
} from '../../shared/constants'
import { findCharacterBook, toImportCard } from '../../shared/lorebook'
import { withSignal } from '../../shared/options'
import { isRecord } from '../../shared/protocol'
import { isUuid } from '../../shared/uuid'
import type { DatacatClient } from './datacat-client'
import { DatacatApiError } from './datacat-client'

function clientPath(
  character: Record<string, unknown>,
  action: 'card' | 'avatar',
): string {
  const id = String(character.id || '').trim().toLowerCase()
  if (!isUuid(id)) return ''
  const paths = isRecord(character.clientPaths) ? character.clientPaths : {}
  const advertised = String(paths[action] || '').trim()
  if (
    advertised === `/characters/${id}/${action}` ||
    advertised.startsWith(`/characters/${id}/${action}?`)
  ) {
    return advertised
  }
  return action === 'card'
    ? `/characters/${id}/card`
    : `/characters/${id}/avatar`
}

function unwrapCard(payload: unknown): Record<string, unknown> {
  if (!isRecord(payload)) return {}
  if (isRecord(payload.data) && (payload.spec || payload.data.name)) {
    return payload
  }
  if (isRecord(payload.card)) return unwrapCard(payload.card)
  if (typeof payload.name === 'string') return payload
  return payload
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('Import aborted'))
      return
    }
    const timer = setTimeout(() => resolve(), ms)
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer)
        reject(new Error('Import aborted'))
      },
      { once: true },
    )
  })
}

function verificationWaitingUrl(): string {
  const url = new URL('/client-verify', DATACAT_API_ORIGIN)
  url.searchParams.set('waiting', '1')
  url.searchParams.set('client', 'ShiruStore')
  return url.toString()
}

function normalizeVerificationUrl(value: unknown): string {
  const raw = String(value || '').trim()
  if (!raw) return ''
  try {
    const url = new URL(raw, DATACAT_API_ORIGIN)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''
    return url.toString()
  } catch {
    return ''
  }
}

async function ensureVerification(
  client: DatacatClient,
  popup: Window | null,
  signal?: AbortSignal,
  onStatus?: (message: string) => void,
): Promise<void> {
  onStatus?.('Starting Datacat security check…')
  const started = await client.requestJson(
    '/verifications',
    withSignal(
      {
        method: 'POST' as const,
        body: {
          action: 'character-import',
          clientName: 'ShiruStore',
          clientVersion: EXTENSION_VERSION,
        },
      },
      signal,
    ),
  )
  if (!isRecord(started)) throw new Error('Verification start failed')
  const verificationId = String(started.verificationId || '')
  const verificationUrl = normalizeVerificationUrl(
    started.verificationUriComplete,
  )
  if (!verificationId || !verificationUrl) {
    throw new Error('Verification payload incomplete')
  }

  let bridge = popup && !popup.closed ? popup : null
  if (!bridge) {
    bridge = window.open(
      verificationUrl,
      'shirustore-verify',
      'popup=yes,width=560,height=720',
    )
  } else {
    try {
      bridge.location.replace(verificationUrl)
      bridge.focus()
    } catch {
      bridge = window.open(
        verificationUrl,
        'shirustore-verify',
        'popup=yes,width=560,height=720',
      )
    }
  }
  if (!bridge) {
    throw new Error(
      'Allow pop-ups for Lumiverse to complete the Datacat security check.',
    )
  }

  onStatus?.('Complete the Cloudflare check in the popup…')
  const intervalSec = Math.max(1, Number(started.interval || 3))
  const deadline =
    Date.now() + Math.max(60, Number(started.expiresIn || 300)) * 1000
  let closedAt: number | null = null

  while (Date.now() < deadline) {
    if (signal?.aborted) throw new Error('Import aborted')
    await sleep(intervalSec * 1000, signal)

    const popupClosed = (() => {
      try {
        return bridge.closed
      } catch {
        return true
      }
    })()
    if (popupClosed && closedAt === null) {
      closedAt = Date.now()
      onStatus?.('Popup closed — confirming Datacat check…')
    }

    let statusPayload: unknown
    try {
      statusPayload = await client.requestJson(
        `/verifications/${encodeURIComponent(verificationId)}`,
        withSignal({}, signal),
      )
    } catch (error) {
      if (error instanceof DatacatApiError && error.status === 429) {
        onStatus?.('Rate limited — waiting to re-check…')
        await sleep(Math.max(intervalSec, 5) * 1000, signal)
        continue
      }
      if (
        error instanceof DatacatApiError &&
        (error.code === 'VERIFICATION_PENDING' || error.status === 404)
      ) {
        if (
          closedAt !== null &&
          Date.now() - closedAt > Math.max(20, intervalSec * 6) * 1000
        ) {
          throw new Error(
            'Datacat verification window closed before the check finished. Try import again.',
          )
        }
        continue
      }
      throw error
    }

    if (!isRecord(statusPayload)) continue
    const verification = isRecord(statusPayload.verification)
      ? statusPayload.verification
      : statusPayload
    const state = String(verification.status || '').toLowerCase()

    if (state === 'pending' || state === '' || state === 'waiting') {
      if (
        closedAt !== null &&
        Date.now() - closedAt > Math.max(20, intervalSec * 6) * 1000
      ) {
        throw new Error(
          'Datacat verification window closed before the check finished. Try import again.',
        )
      }
      continue
    }
    if (state === 'verified' || state === 'complete') {
      onStatus?.('Saving security lease…')
      const token = await client.requestJson(
        `/verifications/${encodeURIComponent(verificationId)}/token`,
        withSignal({ method: 'POST' as const, body: {} }, signal),
      )
      if (!isRecord(token) || token.leaseAvailable !== true) {
        throw new Error('Datacat returned no usable security-check lease.')
      }
      try {
        if (!bridge.closed) bridge.close()
      } catch {
      }
      return
    }
    if (
      state === 'exchanged' ||
      state === 'denied' ||
      state === 'expired' ||
      state === 'failed'
    ) {
      throw new Error(
        state === 'exchanged'
          ? 'This Datacat security check was already used. Try import again.'
          : 'Datacat security check failed. Try import again.',
      )
    }
  }
  throw new Error('Datacat security check timed out. Try import again.')
}

function sniffImageMeta(bytes: Uint8Array): { mime: string; ext: string } {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { mime: 'image/jpeg', ext: 'jpg' }
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { mime: 'image/webp', ext: 'webp' }
  }
  if (
    bytes.length >= 6 &&
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46
  ) {
    return { mime: 'image/gif', ext: 'gif' }
  }
  if (
    bytes.length >= 12 &&
    bytes[4] === 0x66 &&
    bytes[5] === 0x74 &&
    bytes[6] === 0x79 &&
    bytes[7] === 0x70 &&
    bytes[8] === 0x61 &&
    bytes[9] === 0x76 &&
    bytes[10] === 0x69
  ) {
    return { mime: 'image/avif', ext: 'avif' }
  }
  return { mime: 'image/png', ext: 'png' }
}

export function openImportVerifyPopup(): Window | null {
  return window.open(
    verificationWaitingUrl(),
    'shirustore-verify',
    'popup=yes,width=560,height=720',
  )
}

export async function importDatacatCharacter(
  client: DatacatClient,
  characterId: string,
  signal?: AbortSignal,
  popup: Window | null = null,
  onStatus?: (message: string) => void,
): Promise<{ lumiverseCharacterId: string; name: string; lorebookEntries: number }> {
  onStatus?.('Loading character…')
  const detail = await client.requestJson(
    `/characters/${encodeURIComponent(characterId)}`,
    withSignal({}, signal),
  )
  const wrapper = isRecord(detail) ? detail : {}
  const character = isRecord(wrapper.character)
    ? wrapper.character
    : wrapper
  const id = String(character.id || characterId).trim().toLowerCase()
  const cardPath = clientPath(character, 'card')
  const avatarPath = clientPath(character, 'avatar')
  if (!cardPath || !avatarPath) {
    throw new Error('Datacat did not advertise card/avatar paths.')
  }

  const fetchCard = async () => {
    onStatus?.('Downloading card…')
    return client.requestJson(cardPath, withSignal({}, signal))
  }

  let cardPayload: unknown
  try {
    cardPayload = await fetchCard()
  } catch (error) {
    if (
      error instanceof DatacatApiError &&
      (error.verificationRequired ||
        error.code === 'CLIENT_VERIFICATION_REQUIRED')
    ) {
      await ensureVerification(client, popup, signal, onStatus)
      cardPayload = await fetchCard()
    } else {
      throw error
    }
  }

  const { payload: cardRecord, lorebookEntries } = toImportCard(
    unwrapCard(cardPayload),
    {
      includeLorebook: true,
      fallbackBook: findCharacterBook(character, wrapper),
    },
  )
  const data = cardRecord.data as Record<string, unknown>
  const extensions = data.extensions as Record<string, unknown>
  const datacatExt = isRecord(extensions.datacat)
    ? { ...extensions.datacat }
    : {}
  datacatExt.datacatCharacterId = id
  datacatExt.importedAt = new Date().toISOString()
  extensions.datacat = datacatExt
  if (!String(data.name || '').trim()) {
    data.name = String(character.name || 'Imported character')
  }

  onStatus?.('Importing into Lumiverse…')
  const importInit: RequestInit = {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cardRecord),
  }
  if (signal) importInit.signal = signal
  const importRes = await fetch('/api/v1/characters/import', importInit)
  const imported = (await importRes.json().catch(() => ({}))) as unknown
  const importedRecord = isRecord(imported) ? imported : {}
  if (!importRes.ok) {
    const message = String(
      importedRecord.error || `Lumiverse import failed (${importRes.status})`,
    )
    throw new Error(message)
  }
  const characterOut = isRecord(importedRecord.character)
    ? importedRecord.character
    : importedRecord
  const lumiverseCharacterId = String(characterOut.id || '')
  if (!lumiverseCharacterId) {
    throw new Error('Lumiverse import returned no character id')
  }
  const name = String(characterOut.name || character.name || 'Character')

  try {
    onStatus?.('Mirroring avatar…')
    const avatar = await client.requestBinary(
      avatarPath,
      withSignal({}, signal),
    )
    if (typeof avatar.data === 'string' && avatar.data) {
      const bytes =
        avatar.encoding === 'base64'
          ? Uint8Array.from(atob(avatar.data), (c) => c.charCodeAt(0))
          : new TextEncoder().encode(avatar.data)
      const meta = sniffImageMeta(bytes)
      const blob = new Blob([bytes], { type: meta.mime })
      const form = new FormData()
      form.append('avatar', blob, `avatar.${meta.ext}`)
      const avatarInit: RequestInit = {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
        body: form,
      }
      if (signal) avatarInit.signal = signal
      const avatarRes = await fetch(
        `/api/v1/characters/${encodeURIComponent(lumiverseCharacterId)}/avatar`,
        avatarInit,
      )
      if (!avatarRes.ok) {
        console.warn(`ShiruStore avatar upload failed (${avatarRes.status})`)
      }
    }
  } catch (err) {
    if (signal?.aborted) throw err
    console.warn('ShiruStore avatar mirror failed:', err)
  }

  if (popup && !popup.closed) {
    try {
      popup.close()
    } catch {
    }
  }

  return { lumiverseCharacterId, name, lorebookEntries }
}

export async function deleteLumiverseCharacter(
  lumiverseId: string,
  signal?: AbortSignal,
): Promise<void> {
  const id = String(lumiverseId || '').trim()
  if (!id) throw new Error('Missing Lumiverse character id')
  const init: RequestInit = {
    method: 'DELETE',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  }
  if (signal) init.signal = signal
  const res = await fetch(
    `/api/v1/characters/${encodeURIComponent(id)}`,
    init,
  )
  if (res.ok || res.status === 404) return
  const payload = (await res.json().catch(() => null)) as unknown
  const record = isRecord(payload) ? payload : {}
  throw new Error(
    String(record.error || `Could not delete character (${res.status})`),
  )
}

export async function lumiverseCharacterExists(
  lumiverseId: string,
  signal?: AbortSignal,
): Promise<boolean> {
  const id = String(lumiverseId || '').trim()
  if (!id) return false
  const init: RequestInit = {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  }
  if (signal) init.signal = signal
  const res = await fetch(
    `/api/v1/characters/${encodeURIComponent(id)}`,
    init,
  )
  if (res.status === 404) return false
  return res.ok
}
