import {
  MOCK_CHARACTERS,
  MOCK_CREATORS,
  MOCK_TAGS,
} from '../shared/mock-catalog-data'

type MockResult = {
  status: number
  data: unknown
  encoding: string | null
}

const ALL = MOCK_CHARACTERS

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function ok(data: unknown): MockResult {
  return { status: 200, data, encoding: null }
}

function parsePath(path: string): { pathname: string; search: URLSearchParams } {
  const url = new URL(path, 'https://mock.local')
  return { pathname: url.pathname, search: url.searchParams }
}

export function mockDatacatRequest(
  path: string,
  method: string,
  responseType?: string,
): MockResult | null {
  const verb = method.toUpperCase()
  const { pathname, search } = parsePath(path)

  if (verb === 'POST' && pathname === '/verifications') {
    return ok({
      verificationId: '00000000-0000-4000-8000-000000000099',
      verificationUriComplete: 'https://datacat.run/client-verify?waiting=1',
      interval: 1,
      expiresIn: 300,
    })
  }

  if (verb === 'GET' && /^\/verifications\/[A-Za-z0-9_-]+$/.test(pathname)) {
    return ok({ verification: { status: 'verified' } })
  }

  if (
    verb === 'POST' &&
    /^\/verifications\/[A-Za-z0-9_-]+\/token$/.test(pathname)
  ) {
    return ok({ leaseAvailable: true })
  }

  if (verb !== 'GET') return null

  if (pathname === '/fresh') {
    return ok({
      windows: {
        last24h: {
          characters: ALL.slice(0, 8),
          paging: { hasMore: false, nextOffset: 8 },
        },
        thisWeek: {
          characters: ALL.slice(8, 24),
          paging: { hasMore: false, nextOffset: 24 },
        },
      },
    })
  }

  if (pathname === '/tags') {
    const query = (search.get('search') || '').toLowerCase()
    const tags = MOCK_TAGS.map((name, i) => ({
      id: i + 1,
      name,
      count: 400 - i * 31,
    })).filter((tag) => !query || tag.name.includes(query))
    return ok({ tags, paging: { hasMore: false, nextOffset: tags.length } })
  }

  if (pathname === '/characters') {
    const offset = Math.max(0, Number(search.get('offset') || 0))
    const needle = (search.get('search') || '').toLowerCase()
    const rows = ALL.filter(
      (row) =>
        !needle ||
        String(row.name).toLowerCase().includes(needle) ||
        row.tags.some((tag) => tag.includes(needle)),
    )
    const slice = rows.slice(offset, offset + 24)
    return ok({
      characters: slice,
      paging: {
        hasMore: offset + 24 < rows.length,
        nextOffset: offset + 24,
      },
    })
  }

  const community = pathname.match(
    /^\/characters\/([0-9a-f-]{36})\/community$/i,
  )
  if (community) {
    return ok({
      community: { kudos: { total: 42 }, comments: { total: 7 } },
    })
  }

  const card = pathname.match(/^\/characters\/([0-9a-f-]{36})\/card$/i)
  if (card) {
    const row = ALL.find((item) => item.id === card[1]!.toLowerCase())
    if (!row) return { status: 404, data: { error: 'NOT_FOUND' }, encoding: null }
    return ok({
      spec: 'chara_card_v2',
      spec_version: '2.0',
      data: {
        name: row.name,
        description: row.description,
        first_mes: row.firstMes,
        tags: row.tags,
        creator: row.creator.name,
      },
    })
  }

  const avatar = pathname.match(/^\/characters\/([0-9a-f-]{36})\/avatar$/i)
  if (avatar) {
    if (responseType === 'arraybuffer') {
      return { status: 200, data: TINY_PNG_BASE64, encoding: 'base64' }
    }
    return ok({ ok: true })
  }

  const detail = pathname.match(/^\/characters\/([0-9a-f-]{36})$/i)
  if (detail) {
    const row = ALL.find((item) => item.id === detail[1]!.toLowerCase())
    if (!row) return { status: 404, data: { error: 'NOT_FOUND' }, encoding: null }
    return ok({ character: row })
  }

  const creator = pathname.match(
    /^\/creators\/([^/]+)\/(bootstrap|characters)$/,
  )
  if (creator) {
    const ref = decodeURIComponent(creator[1]!).toLowerCase()
    const profile =
      MOCK_CREATORS.find((item) => item.ref === ref) || { ref, name: ref }
    const offset = Math.max(0, Number(search.get('offset') || 0))
    const rows = ALL.filter((row) => row.creator.ref === ref)
    const slice = rows.slice(offset, offset + 24)
    return ok({
      creator: profile,
      characters: slice,
      paging: {
        hasMore: offset + 24 < rows.length,
        nextOffset: offset + 24,
      },
    })
  }

  return null
}
