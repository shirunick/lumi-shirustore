import {
  buildAffinityProfile,
  rankByAffinity,
  type AffinitySeed,
} from '../shared/affinity'
import type { CatalogCharacter, Paging } from '../shared/character'
import {
  DEFAULT_FILTERS,
  activeFilterCount,
  applyClientFilters,
  cloneFilters,
  needsClientFilter,
  type CatalogSort,
} from '../shared/catalog-filters'
import { EXTENSION_NAME, EXTENSION_VERSION, MOCK_PREVIEW } from '../shared/constants'
import {
  mockPreviewFollows,
  mockPreviewImports,
  mockPreviewPlaylists,
} from '../shared/mock-preview-seed'
import {
  filterOutImported,
  importedIdSet,
  normalizeImportList,
  removeImportRecord,
  upsertImportRecord,
  type ImportRecord,
} from '../shared/import-index'
import { appendUniqueById } from '../shared/list'
import {
  followCreator,
  isFollowing,
  loadFollowedCreators,
  unfollowCreator,
  type FollowedCreator,
} from '../shared/followed-creators'
import {
  addToPlaylist,
  characterFromPlaylistCard,
  createPlaylist,
  defaultPlaylists,
  deletePlaylist,
  removeFromPlaylist,
  type Playlist,
} from '../shared/playlists'
import type { CatalogTag } from '../shared/tags'
import { DatacatClient } from './api/datacat-client'
import {
  fetchCatalogPage,
  fetchCommunitySummary,
  fetchCreatorBootstrap,
  fetchCreatorCharacters,
  fetchFreshPage,
  fetchTagsPage,
  fetchCreatorDirectoryPage,
  searchCreators,
  type CreatorProfile,
  type CreatorSearchHit,
} from './api/catalog'
import {
  deleteLumiverseCharacter,
  importDatacatCharacter,
  lumiverseCharacterExists,
  openImportVerifyPopup,
} from './api/import-character'
import { chatPickerOptions, resolveAndOpenChat } from './api/open-chat'
import { UserStoreClient } from './api/user-store'
import {
  capById,
  createCharacterCache,
} from './state/character-cache'
import {
  createFollowedRailLoader,
  FOLLOWED_RAIL_CREATOR_STEP,
  FOLLOWED_RAIL_DEFAULT_CREATORS,
} from './state/followed-rail'
import { renderEmptyState } from './ui/empty-state'
import {
  openConfirmSheet,
  openOptionSheet,
  openPromptSheet,
} from './ui/pickers'
import {
  appendCards,
  renderCardGrid,
  renderSection,
  renderSkeletonGrid,
} from './components/card-grid'
import { createRail, type RailHandle } from './components/rail'
import { openDetailSheet, type DetailSheet } from './components/detail-sheet'
import { icon } from './icons'
import {
  filterSummary,
  openFilterSheet,
} from './components/filter-sheet'
import { mountHuntStack, type HuntStack } from './components/hunt-stack'
import { h } from './dom'
import { observeLoadMore } from './infinite-scroll'
import type { RpcClient } from './rpc-client'

export type ShellTabId = 'discover' | 'browse' | 'library' | 'collections'

export const SHELL_TABS: Array<{ id: ShellTabId; label: string }> = [
  { id: 'discover', label: 'Discover' },
  { id: 'browse', label: 'Browse' },
  { id: 'library', label: 'Library' },
  { id: 'collections', label: 'Shelf' },
]

type DiscoverMode = 'fresh' | 'popular' | 'top'
type FeedMode = Exclude<DiscoverMode, 'fresh'>
type BrowseScope = 'characters' | 'creators'
type BrowseView = 'grid' | 'hunt'

const DISCOVER_MODES: Array<{ id: DiscoverMode; label: string }> = [
  { id: 'fresh', label: 'Fresh' },
  { id: 'popular', label: 'Popular' },
  { id: 'top', label: 'Top rated' },
]

const FEED_SORT: Record<FeedMode, CatalogSort> = {
  popular: 'chat_count',
  top: 'score',
}

const EMPTY_PAGING: Paging = { hasMore: false, nextOffset: 0 }
const PAGE_TARGET = 24
const MAX_FILTER_PAGES = 4

export function mountShell(opts: {
  root: HTMLElement
  rpc: RpcClient
}): { destroy: () => void } {
  const { root, rpc } = opts
  const client = new DatacatClient(rpc)
  const userStore = new UserStoreClient(rpc)
  const characterCache = createCharacterCache(client)
  const followedRail = createFollowedRailLoader(client)
  let active: ShellTabId = 'discover'
  const abort = new AbortController()
  let searchTimer: ReturnType<typeof setTimeout> | null = null
  let detail: DetailSheet | null = null
  let openDetailCharacterId: string | null = null
  let filterUi: { destroy: () => void } | null = null
  let browseSerial = 0
  let freshSerial = 0
  let stopBrowseObserver: (() => void) | null = null
  let stopFreshObserver: (() => void) | null = null
  let filters = cloneFilters(DEFAULT_FILTERS)
  let knownTags: CatalogTag[] = []
  let imports: ImportRecord[] = []
  let playlists: Playlist[] = defaultPlaylists()
  let follows: FollowedCreator[] = loadFollowedCreators()
  let dirtyPlaylists = false
  let dirtyImports = false
  let dirtyFollows = false
  let browseAbort: AbortController | null = null
  let freshAbort: AbortController | null = null
  const feedAborts: Partial<Record<FeedMode, AbortController>> = {}
  let huntLoadCooldownUntil = 0
  let openPlaylistId: string | null = null
  let followedRailSerial = 0
  const RAIL_INITIAL = 10
  const RAIL_STEP = 8
  let affinityShown = 0
  let affinityRail: RailHandle | null = null
  let affinityLoadingMore = false
  let followedShown = 0
  let followedCreatorCount = FOLLOWED_RAIL_DEFAULT_CREATORS
  let followedRailHandle: RailHandle | null = null
  let followedLoadingMore = false
  let discoverMode: DiscoverMode = 'fresh'
  let browseScope: BrowseScope = 'characters'
  let browseView: BrowseView = 'grid'
  let browseHunt: HuntStack | null = null
  let creatorHits: CreatorSearchHit[] = []
  let creatorSearchSerial = 0
  let creatorDirectory: CreatorSearchHit[] = []
  let creatorDirectoryPaging: Paging = { ...EMPTY_PAGING }
  let creatorDirectoryLoading = false
  let creatorDirectoryLoadingMore = false
  let creatorDirectorySerial = 0
  let stopCreatorBrowseObserver: (() => void) | null = null
  const creatorBrowseSentinel = h('div', {
    class: 'ss-sentinel',
    'aria-hidden': 'true',
  })
  const creatorBrowseMoreStatus = h('div', { class: 'ss-load-more', hidden: true })
  const huntSeen = new Set<string>()
  const HUNT_SEEN_CAP = 500
  let storeReady = false
  let creatorSerial = 0
  let stopCreatorObserver: (() => void) | null = null
  const creatorState = {
    active: false,
    profile: null as CreatorProfile | null,
    characters: [] as CatalogCharacter[],
    paging: { ...EMPTY_PAGING },
    loading: false,
    loadingMore: false,
  }
  const creatorSentinel = h('div', { class: 'ss-sentinel', 'aria-hidden': 'true' })
  const creatorMoreStatus = h('div', { class: 'ss-load-more', hidden: true })
  let creatorGrid: HTMLElement | null = null

  function runTask(promise: Promise<unknown>): void {
    void promise.catch((error: unknown) => {
      if (abort.signal.aborted) return
      if (error instanceof DOMException && error.name === 'AbortError') return
      setStatus(error instanceof Error ? error.message : 'Action failed', true)
    })
  }

  function childSignal(parent: AbortSignal, current: AbortController | null): AbortController {
    current?.abort()
    const next = new AbortController()
    if (parent.aborted) {
      next.abort()
    } else {
      parent.addEventListener('abort', () => next.abort(), { once: true })
    }
    return next
  }

  async function persistPlaylists(next: Playlist[]): Promise<void> {
    dirtyPlaylists = true
    playlists = next
    try {
      await userStore.savePlaylists(next, abort.signal)
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Collection sync failed',
        true,
      )
      throw error
    }
  }

  async function persistImports(next: ImportRecord[]): Promise<void> {
    dirtyImports = true
    imports = next
    try {
      await userStore.saveImports(next, abort.signal)
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Import index sync failed',
        true,
      )
      throw error
    }
  }

  function refreshViewsAfterImportsChange(): void {
    if (active === 'library') renderLibrary()
    if (active === 'discover') {
      if (discoverMode === 'fresh') renderDiscover()
      else renderFeed(discoverMode)
    }
    if (active === 'browse') renderBrowse()
  }

  function applyImportsFromHost(next: ImportRecord[]): void {
    if (dirtyImports) return
    imports = next
    if (openDetailCharacterId && detail) {
      const still = imports.find((row) => row.datacatId === openDetailCharacterId)
      detail.setImported(still ? still.lumiverseId : null)
    }
    refreshViewsAfterImportsChange()
  }

  async function reconcileImportedState(
    datacatId: string,
    sheet: DetailSheet,
  ): Promise<void> {
    const imported = imports.find((row) => row.datacatId === datacatId)
    if (!imported) {
      sheet.setImported(null)
      return
    }
    let exists = false
    try {
      exists = await lumiverseCharacterExists(imported.lumiverseId, abort.signal)
    } catch {
      sheet.setImported(imported.lumiverseId)
      return
    }
    if (abort.signal.aborted || openDetailCharacterId !== datacatId) return
    if (exists) {
      sheet.setImported(imported.lumiverseId)
      return
    }
    await persistImports(removeImportRecord(imports, datacatId))
    if (abort.signal.aborted || openDetailCharacterId !== datacatId) return
    sheet.setImported(null)
    refreshViewsAfterImportsChange()
  }

  async function persistFollows(next: FollowedCreator[]): Promise<void> {
    dirtyFollows = true
    follows = next
    try {
      await userStore.saveFollows(next, abort.signal)
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Follow sync failed',
        true,
      )
      throw error
    }
    if (
      filters.followedCreatorsOnly &&
      active === 'browse' &&
      browseScope === 'characters' &&
      !creatorState.active
    ) {
      void loadBrowse(true)
    }
  }

  const browseState = {
    characters: [] as CatalogCharacter[],
    paging: { ...EMPTY_PAGING },
    loading: false,
    loadingMore: false,
  }
  type FollowedBrowseCursor = {
    ref: string
    offset: number
    hasMore: boolean
  }
  let followedBrowseCursors: FollowedBrowseCursor[] = []
  const freshState = {
    last24h: [] as CatalogCharacter[],
    thisWeek: [] as CatalogCharacter[],
    paging: {
      last24h: { ...EMPTY_PAGING },
      thisWeek: { ...EMPTY_PAGING },
    },
    loading: false,
    loadingMore: false,
  }
  const feedState = {} as Record<
    FeedMode,
    {
      characters: CatalogCharacter[]
      paging: Paging
      loading: boolean
      loadingMore: boolean
      serial: number
      grid: HTMLElement | null
    }
  >
  for (const mode of Object.keys(FEED_SORT) as FeedMode[]) {
    feedState[mode] = {
      characters: [],
      paging: { ...EMPTY_PAGING },
      loading: false,
      loadingMore: false,
      serial: 0,
      grid: null,
    }
  }

  let browseGrid: HTMLElement | null = null
  const browseSentinel = h('div', { class: 'ss-sentinel', 'aria-hidden': 'true' })
  const freshSentinel = h('div', { class: 'ss-sentinel', 'aria-hidden': 'true' })
  const browseMoreStatus = h('div', { class: 'ss-load-more', hidden: true })
  const freshMoreStatus = h('div', { class: 'ss-load-more', hidden: true })

  const filterBtn = h('button', {
    class: 'ss-filter-btn',
    type: 'button',
    title: 'Filters',
  })
  const filterCount = h('span', { class: 'ss-filter-count', hidden: true })
  filterBtn.append(
    icon('filter', 16),
    h('span', { text: 'Filters' }),
    filterCount,
  )
  const refreshBtn = h('button', {
    class: 'ss-icon-btn',
    type: 'button',
    title: 'Refresh',
    'aria-label': 'Refresh',
  })
  refreshBtn.append(icon('refresh'))
  refreshBtn.addEventListener('click', () => {
    void showActiveTab(true)
  })
  filterBtn.addEventListener('click', () => openFilters())

  const tabButtons = new Map<ShellTabId, HTMLButtonElement>()
  const tabsRow = h('div', { class: 'ss-tabs', role: 'tablist' })
  for (const tab of SHELL_TABS) {
    const button = h('button', {
      class: 'ss-tab',
      type: 'button',
      role: 'tab',
      'data-tab': tab.id,
      'data-active': tab.id === active ? 'true' : 'false',
      text: tab.label,
    })
    button.addEventListener('click', () => setTab(tab.id))
    tabButtons.set(tab.id, button)
    tabsRow.append(button)
  }
  const nav = h('div', { class: 'ss-nav' }, [tabsRow, refreshBtn])

  function modeRow<T extends string>(
    modes: Array<{ id: T; label: string }>,
    initial: T,
    onPick: (id: T) => void,
  ): HTMLElement {
    const row = h('div', { class: 'ss-mode-row', role: 'group' })
    const buttons = modes.map((mode) => {
      const button = h('button', {
        class: 'ss-mode-btn',
        type: 'button',
        text: mode.label,
        'data-active': mode.id === initial ? 'true' : 'false',
      })
      button.addEventListener('click', () => {
        buttons.forEach((other, i) => {
          other.dataset.active = modes[i]?.id === mode.id ? 'true' : 'false'
        })
        onPick(mode.id)
      })
      return button
    })
    row.append(...buttons)
    return row
  }

  const discoverModeRow = modeRow(DISCOVER_MODES, discoverMode, (mode) => {
    discoverMode = mode
    void showActiveTab(false)
  })
  const browseScopeRow = modeRow<BrowseScope>(
    [
      { id: 'characters', label: 'Characters' },
      { id: 'creators', label: 'Creators' },
    ],
    browseScope,
    (scope) => {
      browseScope = scope
      syncBrowseChrome()
      if (browseScope === 'creators') {
        browseHunt?.destroy()
        browseHunt = null
        void loadCreatorBrowse(true)
      } else {
        void loadBrowse(true)
      }
    },
  )
  const browseViewRow = modeRow<BrowseView>(
    [
      { id: 'grid', label: 'Grid' },
      { id: 'hunt', label: 'Hunt' },
    ],
    browseView,
    (view) => {
      browseView = view
      renderBrowse()
    },
  )
  const discoverAffinity = h('div', {
    class: 'ss-discover-affinity',
    hidden: true,
  })
  const discoverFollowed = h('div', {
    class: 'ss-discover-affinity',
    hidden: true,
  })
  const discoverBody = h('div', { class: 'ss-discover-body' })
  const discoverPanel = h('section', {
    class: 'ss-panel',
    role: 'tabpanel',
  }, [discoverAffinity, discoverFollowed, discoverModeRow, discoverBody])
  const browsePanel = h('section', {
    class: 'ss-panel',
    role: 'tabpanel',
    hidden: true,
  })
  const libraryPanel = h('section', {
    class: 'ss-panel',
    role: 'tabpanel',
    hidden: true,
  })
  const collectionsPanel = h('section', {
    class: 'ss-panel',
    role: 'tabpanel',
    hidden: true,
  })

  const search = h('input', {
    class: 'ss-search',
    type: 'search',
    placeholder: 'Search characters…',
    enterkeyhint: 'search',
  }) as HTMLInputElement
  const searchRow = h('div', { class: 'ss-search-row' }, [
    h('label', { class: 'ss-search-wrap' }, [icon('search', 16), search]),
    filterBtn,
  ])
  const filterBar = h('div', { class: 'ss-filter-bar', hidden: true })
  const browseBody = h('div', { class: 'ss-browse-body' })
  browsePanel.append(browseScopeRow, searchRow, browseViewRow, filterBar, browseBody)

  function syncBrowseChrome(): void {
    const creators = browseScope === 'creators'
    search.placeholder = creators
      ? 'Search creators, or browse popular ones below…'
      : 'Search characters…'
    filterBtn.hidden = creators
    browseViewRow.hidden = creators
    if (creators) filterBar.hidden = true
    else updateFilterBar()
  }
  syncBrowseChrome()

  const panels = new Map<ShellTabId, HTMLElement>([
    ['discover', discoverPanel],
    ['browse', browsePanel],
    ['library', libraryPanel],
    ['collections', collectionsPanel],
  ])
  const content = h('div', { class: 'ss-content' }, [
    discoverPanel,
    browsePanel,
    libraryPanel,
    collectionsPanel,
  ])

  const status = h('div', {
    class: 'ss-toast',
    role: 'status',
    hidden: true,
  })
  let statusTimer: ReturnType<typeof setTimeout> | null = null
  const version = h('div', {
    class: 'ss-version',
    text: `${EXTENSION_NAME} v${EXTENSION_VERSION}`,
  })

  root.replaceChildren(nav, content, status)

  search.addEventListener('input', () => {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      if (browseScope === 'creators') void loadCreatorBrowse(true)
      else void loadBrowse(true)
    }, 300)
  })

  function setStatus(message: string, error = false): void {
    if (statusTimer) clearTimeout(statusTimer)
    if (!message.trim()) {
      status.hidden = true
      return
    }
    status.dataset.tone = error ? 'error' : 'ok'
    status.textContent = message
    status.hidden = false
    statusTimer = setTimeout(() => {
      status.hidden = true
    }, error ? 6000 : 2600)
  }

  function setTab(id: ShellTabId): void {
    active = id
    for (const [key, button] of tabButtons) {
      button.dataset.active = key === id ? 'true' : 'false'
    }
    for (const [key, panel] of panels) {
      panel.hidden = key !== id
    }
    if (id !== 'browse') {
      creatorState.active = false
    }
    if (id !== 'discover') {
      for (const mode of Object.keys(feedState) as FeedMode[]) {
        if (mode === discoverMode) continue
        feedState[mode].characters = []
        feedState[mode].grid = null
      }
    }
    void showActiveTab(false)
  }

  function affinitySeeds(): AffinitySeed[] {
    const seeds: AffinitySeed[] = []
    for (const playlist of playlists) {
      for (const card of playlist.cards) {
        seeds.push({
          tags: card.tags,
          creatorName: card.creatorName,
          creatorRef: card.creatorRef,
        })
      }
    }
    return seeds
  }

  async function showActiveTab(forceReload: boolean): Promise<void> {
    if (active === 'discover' && discoverMode !== 'fresh') {
      renderAffinityRail()
      void renderFollowedRail()
      const feed = feedState[discoverMode]
      if (forceReload || !feed.characters.length) {
        await loadFeed(discoverMode, true)
      } else {
        renderDiscover()
      }
      return
    }
    if (active === 'discover') {
      const hasFresh =
        freshState.last24h.length + freshState.thisWeek.length > 0
      if (forceReload || !hasFresh) {
        await loadFresh(true)
      } else {
        renderAffinityRail()
        void renderFollowedRail()
        renderDiscover()
      }
      return
    }
    if (active === 'browse') {
      syncBrowseChrome()
      if (creatorState.active) {
        if (forceReload && creatorState.profile) {
          await openCreator(creatorState.profile.ref, creatorState.profile.name)
        } else {
          renderCreator()
        }
        return
      }
      if (browseScope === 'creators') {
        if (forceReload || search.value.trim() || !creatorDirectory.length) {
          await loadCreatorBrowse(true)
        } else {
          renderCreatorBrowse()
        }
        return
      }
      if (forceReload || browseState.characters.length === 0) {
        await loadBrowse(true)
      } else {
        renderBrowse()
      }
      return
    }
    if (active === 'library') renderLibrary()
    if (active === 'collections') renderCollections()
  }

  function updateFilterBar(): void {
    const count = activeFilterCount(filters)
    filterBtn.dataset.active = count > 0 ? 'true' : 'false'
    filterCount.hidden = count === 0
    filterCount.textContent = String(count)
    if (!count) {
      filterBar.hidden = true
      filterBar.replaceChildren()
      return
    }
    filterBar.hidden = false
    const clear = h('button', {
      class: 'ss-link-btn',
      type: 'button',
      text: 'Clear all',
    })
    clear.addEventListener('click', () => {
      filters = cloneFilters(DEFAULT_FILTERS)
      updateFilterBar()
      void loadBrowse(true)
    })
    filterBar.replaceChildren(
      h('span', {
        class: 'ss-filter-summary',
        text: filterSummary(filters),
      }),
      clear,
    )
  }

  function openFilters(): void {
    if (browseScope === 'creators') return
    filterUi?.destroy()
    filterUi = openFilterSheet({
      host: root,
      filters,
      tags: knownTags,
      onClose: () => {
        filterUi = null
      },
      onApply: (next) => {
        filters = cloneFilters(next)
        updateFilterBar()
        creatorState.active = false
        creatorState.profile = null
        creatorState.characters = []
        setTab('browse')
        void loadBrowse(true)
      },
      onLoadTags: async (query) => {
        const page = await fetchTagsPage(client, {
          search: query,
          signal: abort.signal,
        })
        knownTags = page.tags
        return knownTags
      },
    })
  }

  function wireFreshObserver(): void {
    stopFreshObserver?.()
    stopFreshObserver = null
    const mode = discoverMode
    const hasMore =
      mode === 'fresh'
        ? freshState.paging.last24h.hasMore || freshState.paging.thisWeek.hasMore
        : feedState[mode].paging.hasMore
    if (!hasMore) return
    stopFreshObserver = observeLoadMore({
      root: content,
      sentinel: freshSentinel,
      onLoadMore: () => {
        if (discoverMode !== mode) return
        void (mode === 'fresh' ? loadFresh(false) : loadFeed(mode, false))
      },
    })
  }

  function wireBrowseObserver(): void {
    stopBrowseObserver?.()
    stopBrowseObserver = null
    if (!browseState.paging.hasMore) return
    stopBrowseObserver = observeLoadMore({
      root: content,
      sentinel: browseSentinel,
      onLoadMore: () => {
        void loadBrowse(false)
      },
    })
  }

  function wireCreatorObserver(): void {
    stopCreatorObserver?.()
    stopCreatorObserver = null
    if (!creatorState.paging.hasMore) return
    stopCreatorObserver = observeLoadMore({
      root: content,
      sentinel: creatorSentinel,
      onLoadMore: () => {
        void loadCreatorMore()
      },
    })
  }

  function withoutImported(rows: CatalogCharacter[]): CatalogCharacter[] {
    return filterOutImported(rows, importedIdSet(imports))
  }

  function huntDeck(rows: CatalogCharacter[]): CatalogCharacter[] {
    const saved = new Set(playlists.flatMap((playlist) => playlist.characterIds))
    const imported = importedIdSet(imports)
    return rows.filter(
      (row) =>
        !huntSeen.has(row.id) && !saved.has(row.id) && !imported.has(row.id),
    )
  }

  function mountBrowseHunt(): HuntStack {
    return mountHuntStack({
      characters: huntDeck(browseState.characters),
      hasMore: browseState.paging.hasMore,
      emptyText: activeFilterCount(filters) || search.value.trim()
        ? 'You’ve seen every match. Loosen your filters for more.'
        : 'You’ve seen every card here.',
      enrich: async (id) => characterCache.getOrFetch(id, abort.signal),
      onNearEnd: () => {
        if (Date.now() < huntLoadCooldownUntil) return
        setTimeout(() => void loadBrowse(false), 0)
      },
      onAction: (action, character) => {
        if (action === 'preview') {
          openCharacter(character)
          return
        }
        huntSeen.add(character.id)
        if (huntSeen.size > HUNT_SEEN_CAP) {
          const oldest = huntSeen.values().next().value
          if (oldest) huntSeen.delete(oldest)
        }
        if (action !== 'save') return
        const target =
          playlists.find((row) => row.id === 'starter_saved') ?? playlists[0]
        if (!target) return
        runTask(
          persistPlaylists(
            addToPlaylist(playlists, target.id, character),
          ).then(() => {
            setStatus(`Saved to ${target.name} · ${character.name}`)
          }),
        )
      },
    })
  }

  function renderFeed(mode: FeedMode): void {
    const feed = feedState[mode]
    if (feed.loading) {
      discoverBody.replaceChildren(renderSkeletonGrid(6))
      return
    }
    if (!feed.characters.length) {
      feed.grid = null
      discoverBody.replaceChildren(
        emptyState('sparkle', 'Nothing here yet', 'Pull to refresh or check Browse.'),
      )
      return
    }
    const rows = withoutImported(feed.characters)
    if (!rows.length) {
      feed.grid = null
      discoverBody.replaceChildren(
        emptyState('sparkle', 'Nothing here yet', 'Pull to refresh or check Browse.'),
      )
      return
    }
    feed.grid = renderCardGrid(rows, openCharacter)
    discoverBody.replaceChildren(feed.grid, freshMoreStatus, freshSentinel)
    wireFreshObserver()
  }

  async function loadFeed(mode: FeedMode, reset: boolean): Promise<void> {
    const feed = feedState[mode]
    if (!reset && (feed.loading || feed.loadingMore || !feed.paging.hasMore)) return
    const serial = reset ? ++feed.serial : feed.serial
    const reqAbort = reset
      ? (feedAborts[mode] = childSignal(abort.signal, feedAborts[mode] ?? null))
      : feedAborts[mode] ?? childSignal(abort.signal, null)
    feedAborts[mode] = reqAbort
    if (reset) {
      feed.loading = true
      feed.loadingMore = false
      feed.characters = []
      feed.paging = { ...EMPTY_PAGING }
      feed.grid = null
      if (discoverMode === mode) discoverBody.replaceChildren(renderSkeletonGrid(6))
    } else {
      feed.loadingMore = true
      freshMoreStatus.hidden = false
      freshMoreStatus.textContent = 'Loading more…'
    }
    try {
      const page = await fetchCatalogPage(client, {
        offset: reset ? 0 : feed.paging.nextOffset,
        sort: FEED_SORT[mode],
        signal: reqAbort.signal,
      })
      if (serial !== feed.serial || reqAbort.signal.aborted) return
      const kept = withoutImported(page.characters)
      characterCache.rememberMany(kept)
      const next = capById(appendUniqueById(feed.characters, kept))
      const added = next.slice(Math.max(0, next.length - kept.length))
      feed.characters = next
      feed.paging = page.paging
      feed.loading = false
      if (discoverMode !== mode || active !== 'discover') return
      renderAffinityRail()
      if (reset || !feed.grid) {
        renderFeed(mode)
      } else if (added.length) {
        appendCards(feed.grid, added, openCharacter)
      }
      if (!feed.paging.hasMore) {
        stopFreshObserver?.()
        stopFreshObserver = null
      }
    } catch (error) {
      if (reqAbort.signal.aborted || serial !== feed.serial || discoverMode !== mode) return
      const message =
        error instanceof Error ? error.message : 'Could not load feed'
      if (!feed.characters.length) {
        discoverBody.replaceChildren(h('div', { class: 'ss-error', text: message }))
      } else {
        freshMoreStatus.hidden = false
        freshMoreStatus.textContent = message
      }
      setStatus(message, true)
    } finally {
      if (serial === feed.serial) {
        feed.loading = false
        feed.loadingMore = false
      }
      if (freshMoreStatus.textContent === 'Loading more…') {
        freshMoreStatus.hidden = true
        freshMoreStatus.textContent = ''
      }
    }
  }

  function freshCards(): CatalogCharacter[] {
    return withoutImported(
      appendUniqueById(freshState.last24h, freshState.thisWeek),
    )
  }

  function affinityPool(): CatalogCharacter[] {
    return withoutImported(
      appendUniqueById(
        appendUniqueById(freshCards(), feedState.popular.characters),
        feedState.top.characters,
      ),
    )
  }

  function affinityRows(limit: number): CatalogCharacter[] {
    const profile = buildAffinityProfile(affinitySeeds())
    const likedIds = new Set(
      playlists.flatMap((playlist) => playlist.characterIds),
    )
    return rankByAffinity(affinityPool(), profile, {
      excludeIds: new Set([...likedIds, ...importedIdSet(imports)]),
      limit,
    })
  }

  function destroyAffinityRail(): void {
    affinityRail?.destroy()
    affinityRail = null
  }

  function renderAffinityRail(): void {
    const limit = Math.max(affinityShown || RAIL_INITIAL, RAIL_INITIAL)
    const rows = affinityRows(limit)
    if (rows.length < 3) {
      destroyAffinityRail()
      affinityShown = 0
      discoverAffinity.hidden = true
      discoverAffinity.replaceChildren()
      return
    }
    const scrollLeft = affinityRail?.track.scrollLeft ?? 0
    destroyAffinityRail()
    affinityShown = rows.length
    affinityRail = createRail({
      onNearEnd: () => {
        void loadMoreAffinity()
      },
    })
    appendCards(affinityRail.track, rows, openCharacter)
    discoverAffinity.hidden = false
    discoverAffinity.replaceChildren(
      renderSection('More like your saves', affinityRail.root),
    )
    affinityRail.track.scrollLeft = scrollLeft
    affinityRail.refresh()
  }

  async function loadMoreAffinity(): Promise<void> {
    if (affinityLoadingMore || !affinityRail) return
    const next = affinityRows(affinityShown + RAIL_STEP)
    if (next.length > affinityShown) {
      const added = next.slice(affinityShown)
      affinityShown = next.length
      appendCards(affinityRail.track, added, openCharacter)
      affinityRail.refresh()
      return
    }
    affinityLoadingMore = true
    try {
      const before = affinityPool().length
      let grew = false
      for (const mode of ['popular', 'top'] as FeedMode[]) {
        const feed = feedState[mode]
        const virgin = feed.characters.length === 0 && feed.serial === 0
        if (virgin) await loadFeed(mode, true)
        else if (feed.paging.hasMore) await loadFeed(mode, false)
        else continue
        if (affinityPool().length > before) {
          grew = true
          break
        }
      }
      if (
        !grew &&
        (freshState.paging.last24h.hasMore ||
          freshState.paging.thisWeek.hasMore)
      ) {
        await loadFresh(false)
      }
      if (affinityPool().length <= before) return
      affinityShown += RAIL_STEP
      renderAffinityRail()
    } finally {
      affinityLoadingMore = false
    }
  }

  function destroyFollowedRailHandle(): void {
    followedRailHandle?.destroy()
    followedRailHandle = null
  }

  async function renderFollowedRail(): Promise<void> {
    const serial = ++followedRailSerial
    if (!follows.length) {
      destroyFollowedRailHandle()
      followedShown = 0
      followedCreatorCount = FOLLOWED_RAIL_DEFAULT_CREATORS
      discoverFollowed.hidden = true
      discoverFollowed.replaceChildren()
      return
    }
    const collected = await followedRail.load(follows, abort.signal, {
      creatorCount: followedCreatorCount,
    })
    if (serial !== followedRailSerial || abort.signal.aborted) return
    characterCache.rememberMany(collected)
    const available = withoutImported(collected)
    const limit = Math.max(followedShown || RAIL_INITIAL, RAIL_INITIAL)
    const rows = available.slice(0, limit)
    if (rows.length < 3) {
      destroyFollowedRailHandle()
      followedShown = 0
      discoverFollowed.hidden = true
      discoverFollowed.replaceChildren()
      return
    }
    const scrollLeft = followedRailHandle?.track.scrollLeft ?? 0
    destroyFollowedRailHandle()
    followedShown = rows.length
    followedRailHandle = createRail({
      onNearEnd: () => {
        void loadMoreFollowed(available)
      },
    })
    appendCards(followedRailHandle.track, rows, openCharacter)
    discoverFollowed.hidden = false
    discoverFollowed.replaceChildren(
      renderSection('More from your followed creators', followedRailHandle.root),
    )
    followedRailHandle.track.scrollLeft = scrollLeft
    followedRailHandle.refresh()
  }

  async function loadMoreFollowed(
    available: CatalogCharacter[],
  ): Promise<void> {
    if (followedLoadingMore || !followedRailHandle) return
    if (followedShown < available.length) {
      const next = available.slice(followedShown, followedShown + RAIL_STEP)
      if (!next.length) return
      followedShown += next.length
      appendCards(followedRailHandle.track, next, openCharacter)
      followedRailHandle.refresh()
      return
    }
    if (followedCreatorCount >= follows.length) return
    followedLoadingMore = true
    try {
      followedCreatorCount = Math.min(
        follows.length,
        followedCreatorCount + FOLLOWED_RAIL_CREATOR_STEP,
      )
      followedShown += RAIL_STEP
      await renderFollowedRail()
    } finally {
      followedLoadingMore = false
    }
  }

  function renderDiscover(): void {
    if (discoverMode !== 'fresh') {
      renderFeed(discoverMode)
      return
    }
    const cards = freshCards()
    if (!cards.length) {
      discoverBody.replaceChildren(
        emptyState(
          'sparkle',
          'Nothing fresh right now',
          'New Datacat uploads appear here. Pull to refresh or check Browse.',
        ),
      )
      return
    }
    discoverBody.replaceChildren(
      renderCardGrid(cards, openCharacter),
      freshMoreStatus,
      freshSentinel,
    )
    wireFreshObserver()
  }

  function creatorBrowseRows(): CreatorSearchHit[] {
    return search.value.trim() ? creatorHits : creatorDirectory
  }

  function wireCreatorBrowseObserver(): void {
    stopCreatorBrowseObserver?.()
    stopCreatorBrowseObserver = null
    if (search.value.trim() || !creatorDirectoryPaging.hasMore) return
    stopCreatorBrowseObserver = observeLoadMore({
      root: content,
      sentinel: creatorBrowseSentinel,
      onLoadMore: () => {
        if (browseScope !== 'creators' || search.value.trim()) return
        void loadCreatorDirectory(false)
      },
    })
  }

  function renderCreatorBrowse(): void {
    searchRow.hidden = false
    browseScopeRow.hidden = false
    browseViewRow.hidden = true
    filterBar.hidden = true
    browseHunt?.destroy()
    browseHunt = null
    browseGrid = null
    stopBrowseObserver?.()
    stopBrowseObserver = null
    const query = search.value.trim()
    const rows = creatorBrowseRows()
    if (!rows.length) {
      stopCreatorBrowseObserver?.()
      stopCreatorBrowseObserver = null
      browseBody.replaceChildren(
        emptyState(
          'search',
          query ? 'No creators found' : 'No creators yet',
          query
            ? 'Try another name or exact @handle.'
            : 'Pull to refresh, or search by name / @handle.',
        ),
      )
      setStatus(query ? 'No creators' : 'Creators')
      return
    }
    const list = h('div', { class: 'ss-list' })
    for (const creator of rows) {
      const following = isFollowing(follows, creator.ref)
      const sample =
        creator.sampleCount > 1 ? ` · ${creator.sampleCount}+ cards` : ''
      list.append(
        listRow({
          thumb: h('div', {
            class: 'ss-creator-avatar',
            text: creator.name.slice(0, 1).toUpperCase(),
          }),
          title: creator.name,
          sub: `@${creator.ref}${sample}`,
          onOpen: () => {
            void openCreator(creator.ref, creator.name)
          },
          actions: [
            rowAction(
              following ? 'heart' : 'plus',
              following ? `Unfollow ${creator.name}` : `Follow ${creator.name}`,
              () => {
                if (following) {
                  runTask(
                    persistFollows(unfollowCreator(follows, creator.ref)).then(
                      () => {
                        renderCreatorBrowse()
                        void renderFollowedRail()
                        setStatus(`Removed ${creator.name} from follows`)
                      },
                    ),
                  )
                  return
                }
                runTask(
                  persistFollows(
                    followCreator(follows, {
                      ref: creator.ref,
                      name: creator.name,
                    }),
                  ).then(() => {
                    renderCreatorBrowse()
                    void renderFollowedRail()
                    setStatus(`Saved follow · ${creator.name}`)
                  }),
                )
              },
            ),
          ],
        }),
      )
    }
    if (!query && creatorDirectoryPaging.hasMore) {
      browseBody.replaceChildren(
        list,
        creatorBrowseMoreStatus,
        creatorBrowseSentinel,
      )
      wireCreatorBrowseObserver()
    } else {
      stopCreatorBrowseObserver?.()
      stopCreatorBrowseObserver = null
      browseBody.replaceChildren(list)
    }
    setStatus(
      query
        ? `${rows.length} creators`
        : `Creators · ${rows.length}${creatorDirectoryPaging.hasMore ? '+' : ''}`,
    )
  }

  async function loadCreatorBrowse(reset: boolean): Promise<void> {
    const query = search.value.trim()
    if (query) {
      stopCreatorBrowseObserver?.()
      stopCreatorBrowseObserver = null
      await loadCreatorSearch()
      return
    }
    await loadCreatorDirectory(reset)
  }

  async function loadCreatorSearch(): Promise<void> {
    const query = search.value.trim()
    const serial = ++creatorSearchSerial
    if (!query) {
      creatorHits = []
      await loadCreatorDirectory(true)
      return
    }
    browseBody.replaceChildren(renderSkeletonGrid(4))
    try {
      const hits = await searchCreators(client, query, abort.signal)
      if (serial !== creatorSearchSerial || abort.signal.aborted) return
      creatorHits = hits
      renderCreatorBrowse()
    } catch (error) {
      if (serial !== creatorSearchSerial || abort.signal.aborted) return
      browseBody.replaceChildren(
        h('div', {
          class: 'ss-error',
          text:
            error instanceof Error
              ? error.message
              : 'Could not search creators',
        }),
      )
      setStatus('Creator search failed', true)
    }
  }

  async function loadCreatorDirectory(reset: boolean): Promise<void> {
    if (reset) {
      if (creatorDirectoryLoading) return
      creatorDirectoryLoading = true
      creatorDirectoryLoadingMore = false
      creatorDirectorySerial += 1
      creatorDirectory = []
      creatorDirectoryPaging = { ...EMPTY_PAGING }
      browseBody.replaceChildren(renderSkeletonGrid(4))
    } else {
      if (
        creatorDirectoryLoading ||
        creatorDirectoryLoadingMore ||
        !creatorDirectoryPaging.hasMore
      ) {
        return
      }
      creatorDirectoryLoadingMore = true
      creatorBrowseMoreStatus.hidden = false
      creatorBrowseMoreStatus.textContent = 'Loading more…'
    }
    const serial = creatorDirectorySerial
    try {
      const known = new Set(creatorDirectory.map((row) => row.ref))
      const collected: CreatorSearchHit[] = []
      let offset = reset ? 0 : creatorDirectoryPaging.nextOffset
      let paging = { ...creatorDirectoryPaging }
      let pages = 0
      while (pages < MAX_FILTER_PAGES) {
        const page = await fetchCreatorDirectoryPage(client, {
          offset,
          sort: 'chat_count',
          knownRefs: known,
          signal: abort.signal,
        })
        if (serial !== creatorDirectorySerial || abort.signal.aborted) return
        pages += 1
        for (const hit of page.creators) {
          if (known.has(hit.ref)) continue
          known.add(hit.ref)
          collected.push(hit)
        }
        paging = page.paging
        offset = page.paging.nextOffset
        if (!page.paging.hasMore) break
        if (collected.length >= 16) break
      }
      creatorDirectory = reset
        ? collected
        : [...creatorDirectory, ...collected]
      creatorDirectoryPaging = paging
      if (browseScope !== 'creators' || search.value.trim()) return
      renderCreatorBrowse()
      setStatus(
        `Creators · ${creatorDirectory.length}${paging.hasMore ? '+' : ''}`,
      )
    } catch (error) {
      if (serial !== creatorDirectorySerial || abort.signal.aborted) return
      if (!creatorDirectory.length) {
        browseBody.replaceChildren(
          h('div', {
            class: 'ss-error',
            text:
              error instanceof Error
                ? error.message
                : 'Could not load creators',
          }),
        )
      } else {
        creatorBrowseMoreStatus.hidden = false
        creatorBrowseMoreStatus.textContent =
          error instanceof Error ? error.message : 'Could not load more'
      }
      setStatus('Creator browse failed', true)
    } finally {
      creatorDirectoryLoading = false
      creatorDirectoryLoadingMore = false
      if (creatorBrowseMoreStatus.textContent === 'Loading more…') {
        creatorBrowseMoreStatus.hidden = true
        creatorBrowseMoreStatus.textContent = ''
      }
    }
  }

  function renderBrowse(): void {
    if (creatorState.active) {
      renderCreator()
      return
    }
    if (browseScope === 'creators') {
      renderCreatorBrowse()
      return
    }
    searchRow.hidden = false
    browseScopeRow.hidden = false
    browseViewRow.hidden = false
    const visible = filters.followedCreatorsOnly
      ? browseState.characters
      : withoutImported(browseState.characters)
    if (browseView === 'hunt' && visible.length) {
      browseGrid = null
      stopBrowseObserver?.()
      stopBrowseObserver = null
      const deck = huntDeck(browseState.characters)
      if (browseHunt) {
        browseHunt.sync(deck, browseState.paging.hasMore)
        if (browseHunt.el.parentElement !== browseBody) {
          browseBody.replaceChildren(browseHunt.el)
        }
      } else {
        browseHunt = mountBrowseHunt()
        browseBody.replaceChildren(browseHunt.el)
      }
      return
    }
    browseHunt?.destroy()
    browseHunt = null
    if (!visible.length) {
      browseGrid = null
      browseBody.replaceChildren(
        emptyState(
          'search',
          'No matches',
          filters.followedCreatorsOnly
            ? follows.length
              ? 'No cards from your followed creators match these filters.'
              : 'Follow creators in Shelf, then try again.'
            : activeFilterCount(filters)
              ? 'Try loosening your filters or a different search.'
              : 'Try a different search.',
        ),
      )
      return
    }
    browseGrid = renderCardGrid(visible, openCharacter)
    browseBody.replaceChildren(browseGrid, browseMoreStatus, browseSentinel)
    wireBrowseObserver()
  }

  function renderCreator(): void {
    if (!creatorState.profile) {
      creatorState.active = false
      renderBrowse()
      return
    }
    searchRow.hidden = true
    browseScopeRow.hidden = true
    browseViewRow.hidden = true
    filterBar.hidden = true
    browseHunt?.destroy()
    browseHunt = null
    const back = h('button', { class: 'ss-back-link', type: 'button' }, [
      icon('back', 16),
      'Browse',
    ])
    back.addEventListener('click', () => {
      creatorState.active = false
      creatorState.profile = null
      creatorState.characters = []
      stopCreatorObserver?.()
      stopCreatorObserver = null
      syncBrowseChrome()
      renderBrowse()
    })
    const name = creatorState.profile.name
    const ref = creatorState.profile.ref
    const following = isFollowing(follows, ref)
    const followBtn = h('button', {
      class: following ? 'ss-btn ss-btn-secondary' : 'ss-btn ss-btn-primary',
      type: 'button',
      text: following ? 'Following' : 'Follow',
    })
    followBtn.addEventListener('click', () => {
      runTask(
        (async () => {
          if (following) {
            await persistFollows(unfollowCreator(follows, ref))
            setStatus(`Removed ${name} from follows`)
          } else {
            await persistFollows(followCreator(follows, { ref, name }))
            setStatus(`Saved follow · ${name}`)
          }
          renderCreator()
          void renderFollowedRail()
          if (active === 'collections') renderCollections()
        })(),
      )
    })
    const banner = h('div', { class: 'ss-creator-banner' }, [
      back,
      h('div', { class: 'ss-detail-head' }, [
        h('div', { class: 'ss-creator-avatar', text: name.slice(0, 1).toUpperCase() }),
        h('div', { class: 'ss-detail-head-text' }, [
          h('h2', { class: 'ss-detail-head-title', text: name }),
          h('div', {
            class: 'ss-row-sub',
            text: creatorState.loading
              ? 'Loading characters…'
              : `${creatorState.characters.length}${creatorState.paging.hasMore ? '+' : ''} characters`,
          }),
        ]),
        followBtn,
      ]),
    ])
    if (creatorState.loading) {
      browseBody.replaceChildren(banner, renderSkeletonGrid(6))
      return
    }
    if (!creatorState.characters.length) {
      browseBody.replaceChildren(
        banner,
        emptyState(
          'search',
          'No characters yet',
          'This creator has no public characters on Datacat.',
        ),
      )
      return
    }
    creatorGrid = renderCardGrid(creatorState.characters, openCharacter)
    browseBody.replaceChildren(
      banner,
      creatorGrid,
      creatorMoreStatus,
      creatorSentinel,
    )
    wireCreatorObserver()
  }

  async function openCreator(ref: string, nameHint = ''): Promise<void> {
    const cleaned = ref.trim().toLowerCase()
    if (!cleaned) return
    closeDetail()
    creatorSerial += 1
    const serial = creatorSerial
    creatorState.active = true
    creatorState.loading = true
    creatorState.profile = { ref: cleaned, name: nameHint || cleaned }
    creatorState.characters = []
    creatorState.paging = { ...EMPTY_PAGING }
    active = 'browse'
    for (const [key, button] of tabButtons) {
      button.dataset.active = key === 'browse' ? 'true' : 'false'
    }
    for (const [key, panel] of panels) {
      panel.hidden = key !== 'browse'
    }
    renderCreator()
    try {
      const page = await fetchCreatorBootstrap(client, cleaned, abort.signal)
      if (serial !== creatorSerial || abort.signal.aborted) return
      creatorState.profile = page.creator
      creatorState.characters = page.characters
      creatorState.paging = page.paging
      creatorState.loading = false
      renderCreator()
      setStatus(
        `${page.creator.name} · ${creatorState.characters.length} cards`,
      )
    } catch (error) {
      if (abort.signal.aborted || serial !== creatorSerial) return
      creatorState.active = false
      creatorState.profile = null
      creatorState.characters = []
      syncBrowseChrome()
      browseBody.replaceChildren(
        h('div', {
          class: 'ss-error',
          text:
            error instanceof Error
              ? error.message
              : 'Could not load creator',
        }),
      )
      setStatus('Creator failed', true)
    } finally {
      if (serial === creatorSerial) creatorState.loading = false
    }
  }

  async function loadCreatorMore(): Promise<void> {
    if (
      !creatorState.active ||
      !creatorState.profile ||
      creatorState.loading ||
      creatorState.loadingMore ||
      !creatorState.paging.hasMore
    ) {
      return
    }
    creatorState.loadingMore = true
    creatorMoreStatus.hidden = false
    creatorMoreStatus.textContent = 'Loading more…'
    const serial = creatorSerial
    try {
      const page = await fetchCreatorCharacters(client, {
        creatorRef: creatorState.profile.ref,
        offset: creatorState.paging.nextOffset,
        signal: abort.signal,
      })
      if (serial !== creatorSerial || abort.signal.aborted) return
      const next = appendUniqueById(creatorState.characters, page.characters)
      const added = next.length - creatorState.characters.length
      creatorState.characters = next
      creatorState.paging = page.paging
      if (creatorGrid && added > 0) {
        appendCards(
          creatorGrid,
          next.slice(next.length - added),
          openCharacter,
        )
      } else {
        renderCreator()
      }
      if (!creatorState.paging.hasMore) {
        stopCreatorObserver?.()
        stopCreatorObserver = null
      }
      setStatus(
        `${creatorState.profile.name} · ${creatorState.characters.length} cards`,
      )
    } catch (error) {
      if (abort.signal.aborted) return
      creatorMoreStatus.hidden = false
      creatorMoreStatus.textContent =
        error instanceof Error ? error.message : 'Could not load more'
    } finally {
      creatorState.loadingMore = false
      if (
        !creatorMoreStatus.textContent ||
        creatorMoreStatus.textContent === 'Loading more…'
      ) {
        creatorMoreStatus.hidden = true
        creatorMoreStatus.textContent = ''
      }
    }
  }

  function emptyState(
    iconName: Parameters<typeof icon>[0],
    title: string,
    body: string,
    action?: HTMLElement,
  ): HTMLElement {
    return renderEmptyState(iconName, title, body, action)
  }

  function rowThumb(url: string, name: string): HTMLElement {
    return url
      ? h('img', { class: 'ss-row-thumb', src: url, alt: '', loading: 'lazy' })
      : h('div', {
          class: 'ss-row-thumb ss-card-art-empty',
          text: name.slice(0, 1).toUpperCase(),
        })
  }

  function rowAction(
    iconName: Parameters<typeof icon>[0],
    label: string,
    onClick: () => void,
    danger = false,
  ): HTMLButtonElement {
    const button = h('button', {
      class: danger ? 'ss-icon-btn ss-icon-btn-danger' : 'ss-icon-btn',
      type: 'button',
      title: label,
      'aria-label': label,
    })
    button.append(icon(iconName, 16))
    button.addEventListener('click', onClick)
    return button
  }

  function listRow(opts: {
    thumb: HTMLElement | null
    title: string
    sub: string
    onOpen: () => void
    actions: HTMLElement[]
  }): HTMLElement {
    const openBtn = h('button', { class: 'ss-row-open', type: 'button' })
    if (opts.thumb) openBtn.append(opts.thumb)
    openBtn.append(
      h('div', { class: 'ss-row-meta' }, [
        h('div', { class: 'ss-row-title', text: opts.title }),
        h('div', { class: 'ss-row-sub', text: opts.sub }),
      ]),
    )
    openBtn.addEventListener('click', opts.onOpen)
    return h('div', { class: 'ss-row' }, [openBtn, ...opts.actions])
  }

  function libraryDayKey(iso: string): string {
    const date = new Date(iso)
    if (Number.isNaN(date.getTime())) return 'Unknown'
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }

  function libraryDayLabel(key: string): string {
    if (key === 'Unknown') return key
    const date = new Date(`${key}T12:00:00`)
    if (Number.isNaN(date.getTime())) return key
    const today = new Date()
    const startToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    )
    const startThat = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    )
    const diffDays = Math.round(
      (startToday.getTime() - startThat.getTime()) / 86_400_000,
    )
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year:
        date.getFullYear() === today.getFullYear() ? undefined : 'numeric',
    })
  }

  function renderLibrary(): void {
    if (!imports.length) {
      libraryPanel.replaceChildren(
        emptyState(
          'library',
          'Nothing imported yet',
          'Characters you import from Discover or Browse show up here so you can open or remove them.',
        ),
        version,
      )
      return
    }
    const groups = new Map<string, ImportRecord[]>()
    for (const record of imports) {
      const key = libraryDayKey(record.importedAt)
      const bucket = groups.get(key) ?? []
      bucket.push(record)
      groups.set(key, bucket)
    }
    const nodes: HTMLElement[] = []
    for (const [key, rows] of groups) {
      const list = h('div', { class: 'ss-list' })
      for (const record of rows) {
        list.append(
          listRow({
            thumb: rowThumb(record.imageUrl, record.name),
            title: record.name,
            sub: new Date(record.importedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            onOpen: () => {
              void openImported(record)
            },
            actions: [
              rowAction('chat', `Chat with ${record.name}`, () => {
                void openLibraryChat(record)
              }),
              rowAction(
                'trash',
                `Remove ${record.name}`,
                () => {
                  void removeLibraryRecord(record)
                },
                true,
              ),
            ],
          }),
        )
      }
      const body = h('div', { class: 'ss-collapse-body', hidden: true }, [list])
      const chevron = h('span', {
        class: 'ss-collapse-chevron',
        'aria-hidden': 'true',
        text: '›',
      })
      const toggle = h('button', {
        class: 'ss-collapse-toggle',
        type: 'button',
        'aria-expanded': 'false',
      }, [
        h('span', { class: 'ss-section-title', text: libraryDayLabel(key) }),
        h('span', {
          class: 'ss-section-count',
          text: String(rows.length),
        }),
        chevron,
      ])
      const group = h('div', {
        class: 'ss-collapse ss-section',
        'data-open': 'false',
      }, [toggle, body])
      toggle.addEventListener('click', () => {
        const open = group.dataset.open !== 'true'
        group.dataset.open = open ? 'true' : 'false'
        body.hidden = !open
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false')
      })
      nodes.push(group)
    }
    libraryPanel.replaceChildren(...nodes, version)
  }

  async function openLibraryChat(record: ImportRecord): Promise<void> {
    try {
      await resolveAndOpenChat({
        lumiverseId: record.lumiverseId,
        characterName: record.name,
        signal: abort.signal,
        pickChat,
      })
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Could not open chat',
        true,
      )
    }
  }

  function renderCollections(): void {
    if (openPlaylistId) {
      const playlist =
        playlists.find((row) => row.id === openPlaylistId) ?? null
      if (!playlist) {
        openPlaylistId = null
      } else {
        renderPlaylistDetail(playlist)
        return
      }
    }
    const grid = h('div', { class: 'ss-collection-grid' })
    for (const playlist of playlists) {
      const covers = playlist.cards
        .map((card) => card.imageUrl)
        .filter(Boolean)
        .slice(0, 4)
      const mosaic = h('div', {
        class: 'ss-collection-mosaic',
        'data-count': String(covers.length),
      })
      if (covers.length) {
        for (const url of covers) {
          mosaic.append(h('img', { src: url, alt: '', loading: 'lazy' }))
        }
      } else {
        mosaic.append(h('div', { class: 'ss-collection-empty' }, [icon('folder', 24)]))
      }
      const tile = h('button', { class: 'ss-collection', type: 'button' }, [
        mosaic,
        h('div', { class: 'ss-collection-meta' }, [
          h('div', { class: 'ss-row-title', text: playlist.name }),
          h('div', {
            class: 'ss-row-sub',
            text: `${playlist.characterIds.length} ${playlist.characterIds.length === 1 ? 'card' : 'cards'}`,
          }),
        ]),
      ])
      tile.addEventListener('click', () => {
        openPlaylistId = playlist.id
        renderCollections()
      })
      grid.append(tile)
    }
    const addBtn = h('button', { class: 'ss-collection ss-collection-add', type: 'button' }, [
      h('div', { class: 'ss-collection-mosaic' }, [
        h('div', { class: 'ss-collection-empty' }, [icon('plus', 24)]),
      ]),
      h('div', { class: 'ss-collection-meta' }, [
        h('div', { class: 'ss-row-title', text: 'New collection' }),
        h('div', {
          class: 'ss-row-sub',
          text: storeReady ? 'Synced across devices' : 'Syncing…',
        }),
      ]),
    ])
    addBtn.addEventListener('click', () => {
      runTask(
        openPromptSheet({
          host: root,
          title: 'Collection name',
          placeholder: 'e.g. Cozy fantasy',
          confirmLabel: 'Create',
        }).then((name) => {
          if (!name) return
          return persistPlaylists([createPlaylist(name), ...playlists]).then(
            () => {
              renderCollections()
              setStatus(`Collection “${name}” created`)
            },
          )
        }),
      )
    })
    grid.append(addBtn)

    const followList = h('div', { class: 'ss-list' })
    if (!follows.length) {
      followList.append(
        emptyState(
          'heart',
          'No followed creators yet',
          'Open a creator page and tap Follow to keep them here.',
        ),
      )
    } else {
      for (const creator of follows) {
        followList.append(
          listRow({
            thumb: h('div', {
              class: 'ss-creator-avatar',
              text: creator.name.slice(0, 1).toUpperCase(),
            }),
            title: creator.name,
            sub: `@${creator.ref}`,
            onOpen: () => {
              void openCreator(creator.ref, creator.name)
            },
            actions: [
              rowAction(
                'close',
                `Unfollow ${creator.name}`,
                () => {
                  runTask(
                    persistFollows(unfollowCreator(follows, creator.ref)).then(
                      () => {
                        renderCollections()
                        void renderFollowedRail()
                        setStatus(`Removed ${creator.name} from follows`)
                      },
                    ),
                  )
                },
                true,
              ),
            ],
          }),
        )
      }
    }

    collectionsPanel.replaceChildren(
      renderSection('Collections', grid, playlists.length),
      renderSection('Followed creators', followList, follows.length),
    )
  }

  function renderPlaylistDetail(playlist: Playlist): void {
    const back = h('button', { class: 'ss-back-link', type: 'button' }, [
      icon('back', 16),
      'Shelf',
    ])
    back.addEventListener('click', () => {
      openPlaylistId = null
      renderCollections()
    })
    const isStarter = playlist.id === 'starter_saved'
    const deleteBtn = rowAction(
      'trash',
      isStarter ? 'Clear collection' : 'Delete collection',
      () => {
        const label = isStarter
          ? `Clear “${playlist.name}”?`
          : `Delete “${playlist.name}”?`
        runTask(
          openConfirmSheet({
            host: root,
            title: label,
            confirmLabel: isStarter ? 'Clear' : 'Delete',
          }).then((confirmed) => {
            if (!confirmed) return
            return persistPlaylists(deletePlaylist(playlists, playlist.id)).then(
              () => {
                openPlaylistId = null
                renderCollections()
                setStatus(isStarter ? 'Collection cleared' : 'Collection deleted')
              },
            )
          }),
        )
      },
      true,
    )
    const head = h('div', { class: 'ss-detail-head' }, [
      h('div', { class: 'ss-detail-head-text' }, [
        h('h2', { class: 'ss-detail-head-title', text: playlist.name }),
        h('div', {
          class: 'ss-row-sub',
          text: `${playlist.cards.length} ${playlist.cards.length === 1 ? 'card' : 'cards'}`,
        }),
      ]),
      deleteBtn,
    ])
    if (!playlist.cards.length) {
      collectionsPanel.replaceChildren(
        back,
        head,
        emptyState(
          'bookmark',
          'Empty collection',
          'Swipe right in Hunt or tap Save on a character to add it here.',
        ),
      )
      return
    }
    const list = h('div', { class: 'ss-list' })
    for (const card of playlist.cards) {
      const character = characterFromPlaylistCard(card)
      list.append(
        listRow({
          thumb: rowThumb(character.imageUrl, character.name),
          title: character.name,
          sub: character.creatorName || 'Saved card',
          onOpen: () => openCharacter(character),
          actions: [
            rowAction(
              'close',
              `Remove ${character.name}`,
              () => {
                runTask(
                  persistPlaylists(
                    removeFromPlaylist(playlists, playlist.id, character.id),
                  ).then(() => {
                    renderCollections()
                    setStatus(`Removed ${character.name}`)
                  }),
                )
              },
              true,
            ),
          ],
        }),
      )
    }
    collectionsPanel.replaceChildren(back, head, list)
  }

  async function openImported(record: ImportRecord): Promise<void> {
    try {
      const full = await characterCache.getOrFetch(
        record.datacatId,
        abort.signal,
      )
      openCharacter(full)
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Could not open import',
        true,
      )
    }
  }

  async function removeLibraryRecord(record: ImportRecord): Promise<void> {
    let deleted = true
    try {
      await deleteLumiverseCharacter(record.lumiverseId, abort.signal)
    } catch (error) {
      deleted = false
      setStatus(
        error instanceof Error
          ? error.message
          : 'Could not delete Lumiverse character',
        true,
      )
    }
    await persistImports(removeImportRecord(imports, record.datacatId))
    if (active === 'library') renderLibrary()
    if (discoverMode === 'fresh') renderDiscover()
    else renderFeed(discoverMode)
    if (active === 'browse') renderBrowse()
    setStatus(
      deleted
        ? `Removed ${record.name}`
        : `Removed ${record.name} from Library (Lumiverse delete failed)`,
      !deleted,
    )
  }

  async function loadFresh(reset: boolean): Promise<void> {
    if (reset) {
      freshState.loading = true
      freshState.loadingMore = false
      freshSerial += 1
    } else {
      if (
        freshState.loading ||
        freshState.loadingMore ||
        (!freshState.paging.last24h.hasMore &&
          !freshState.paging.thisWeek.hasMore)
      ) {
        return
      }
      freshState.loadingMore = true
      freshMoreStatus.hidden = false
      freshMoreStatus.textContent = 'Loading more…'
    }
    const serial = freshSerial
    const reqAbort = reset
      ? (freshAbort = childSignal(abort.signal, freshAbort))
      : freshAbort ?? (freshAbort = childSignal(abort.signal, null))
    if (reset) {
      if (discoverMode === 'fresh') discoverBody.replaceChildren(renderSkeletonGrid(6))
      freshState.last24h = []
      freshState.thisWeek = []
      freshState.paging = {
        last24h: { ...EMPTY_PAGING },
        thisWeek: { ...EMPTY_PAGING },
      }
    }
    try {
      const page = await fetchFreshPage(client, {
        offset24: reset ? 0 : freshState.paging.last24h.nextOffset,
        offsetWeek: reset ? 0 : freshState.paging.thisWeek.nextOffset,
        signal: reqAbort.signal,
      })
      if (serial !== freshSerial || reqAbort.signal.aborted) return
      characterCache.rememberMany([
        ...page.windows.last24h,
        ...page.windows.thisWeek,
      ])
      freshState.last24h = capById(
        reset
          ? page.windows.last24h
          : appendUniqueById(freshState.last24h, page.windows.last24h),
      )
      freshState.thisWeek = capById(
        reset
          ? page.windows.thisWeek
          : appendUniqueById(freshState.thisWeek, page.windows.thisWeek),
      )
      freshState.paging = page.paging
      renderAffinityRail()
      void renderFollowedRail()
      if (discoverMode === 'fresh') renderDiscover()
    } catch (error) {
      if (reqAbort.signal.aborted || serial !== freshSerial || discoverMode !== 'fresh') return
      if (reset || freshState.last24h.length + freshState.thisWeek.length === 0) {
        discoverBody.replaceChildren(
          h('div', {
            class: 'ss-error',
            text:
              error instanceof Error
                ? error.message
                : 'Could not load Fresh feed',
          }),
        )
      } else {
        freshMoreStatus.hidden = false
        freshMoreStatus.textContent =
          error instanceof Error ? error.message : 'Could not load more'
      }
      setStatus('Fresh failed', true)
    } finally {
      if (serial === freshSerial) {
        freshState.loading = false
        freshState.loadingMore = false
      }
      if (
        !freshMoreStatus.textContent ||
        freshMoreStatus.textContent === 'Loading more…'
      ) {
        freshMoreStatus.hidden = true
        freshMoreStatus.textContent = ''
      }
    }
  }

  async function loadBrowse(reset: boolean): Promise<void> {
    if (reset) {
      browseState.loading = true
      browseState.loadingMore = false
      browseSerial += 1
      huntLoadCooldownUntil = 0
    } else {
      if (
        browseState.loading ||
        browseState.loadingMore ||
        !browseState.paging.hasMore
      ) {
        return
      }
      browseState.loadingMore = true
      browseMoreStatus.hidden = false
      browseMoreStatus.textContent = 'Loading more…'
    }
    const serial = browseSerial
    const reqAbort = reset
      ? (browseAbort = childSignal(abort.signal, browseAbort))
      : browseAbort ?? (browseAbort = childSignal(abort.signal, null))
    if (reset) {
      browseBody.replaceChildren(renderSkeletonGrid(6))
      browseState.characters = []
      browseState.paging = { ...EMPTY_PAGING }
      browseGrid = null
    }
    try {
      if (filters.followedCreatorsOnly && !follows.length) {
        followedBrowseCursors = []
        browseState.characters = []
        browseState.paging = { ...EMPTY_PAGING }
        browseState.loading = false
        browseState.loadingMore = false
        if (serial !== browseSerial || reqAbort.signal.aborted) return
        renderBrowse()
        return
      }
      const collected: CatalogCharacter[] = []
      let paging = { ...browseState.paging }
      const imported = importedIdSet(imports)
      const searchValue = search.value.trim()

      if (filters.followedCreatorsOnly) {
        const clientFilters = { ...filters, followedCreatorsOnly: false }
        const searchNeedle = searchValue.toLowerCase()
        const refine = (rows: CatalogCharacter[]): CatalogCharacter[] => {
          let next = applyClientFilters(rows, clientFilters)
          if (searchNeedle) {
            next = next.filter((character) => {
              const hay =
                `${character.name} ${character.description} ${character.tags.join(' ')} ${character.creatorName}`.toLowerCase()
              return hay.includes(searchNeedle)
            })
          }
          return next
        }
        if (reset) {
          const refs = follows
            .map((creator) => creator.ref.trim().toLowerCase())
            .filter(Boolean)
          const pages = await Promise.all(
            refs.map(async (ref) => {
              try {
                const page = await fetchCreatorBootstrap(
                  client,
                  ref,
                  reqAbort.signal,
                )
                return { ref, characters: page.characters, paging: page.paging }
              } catch {
                return {
                  ref,
                  characters: [] as CatalogCharacter[],
                  paging: { ...EMPTY_PAGING },
                }
              }
            }),
          )
          if (serial !== browseSerial || reqAbort.signal.aborted) return
          followedBrowseCursors = pages.map((page) => ({
            ref: page.ref,
            offset: page.paging.nextOffset,
            hasMore: page.paging.hasMore,
          }))
          collected.push(
            ...refine(
              appendUniqueById(
                [],
                pages.flatMap((page) => page.characters),
              ),
            ),
          )
        } else {
          const pending = followedBrowseCursors.filter((cursor) => cursor.hasMore)
          const batches = await Promise.all(
            pending.map(async (cursor) => {
              try {
                const page = await fetchCreatorCharacters(client, {
                  creatorRef: cursor.ref,
                  offset: cursor.offset,
                  signal: reqAbort.signal,
                })
                cursor.offset = page.paging.nextOffset
                cursor.hasMore = page.paging.hasMore
                return page.characters
              } catch {
                cursor.hasMore = false
                return [] as CatalogCharacter[]
              }
            }),
          )
          if (serial !== browseSerial || reqAbort.signal.aborted) return
          collected.push(
            ...refine(appendUniqueById([], batches.flat())),
          )
        }
        paging = {
          hasMore: followedBrowseCursors.some((cursor) => cursor.hasMore),
          nextOffset: 0,
        }
      } else {
        followedBrowseCursors = []
        let offset = reset ? 0 : browseState.paging.nextOffset
        let pages = 0
        const followedRefs = new Set(
          follows
            .map((creator) => creator.ref.trim().toLowerCase())
            .filter(Boolean),
        )
        const followedNames = new Set(
          follows
            .map((creator) => creator.name.trim().toLowerCase())
            .filter(Boolean),
        )
        const wantMore = needsClientFilter(filters) || imported.size > 0
        while (pages < MAX_FILTER_PAGES) {
          const page = await fetchCatalogPage(client, {
            offset,
            search: searchValue,
            sort: filters.sort,
            tagIds: filters.tagIds,
            signal: reqAbort.signal,
          })
          if (serial !== browseSerial || reqAbort.signal.aborted) return
          pages += 1
          const kept = filterOutImported(
            applyClientFilters(page.characters, filters, {
              followedRefs,
              followedNames,
            }),
            imported,
          )
          collected.push(...kept)
          paging = page.paging
          offset = page.paging.nextOffset
          if (!page.paging.hasMore) break
          if (!wantMore) break
          if (collected.length >= PAGE_TARGET) break
        }
      }
      const nextRows = collected
      characterCache.rememberMany(nextRows)
      const next = capById(
        reset
          ? nextRows
          : appendUniqueById(browseState.characters, nextRows),
      )
      const added = next.length - browseState.characters.length
      browseState.characters = next
      browseState.paging = paging
      if (!reset && browseHunt) {
        browseHunt.append(huntDeck(next.slice(next.length - added)), paging.hasMore)
      } else if (reset || !browseGrid) {
        renderBrowse()
      } else if (added > 0) {
        appendCards(
          browseGrid,
          next.slice(next.length - added),
          openCharacter,
        )
        if (!browseState.paging.hasMore) {
          stopBrowseObserver?.()
          stopBrowseObserver = null
          browseSentinel.remove()
        }
      } else if (!browseState.paging.hasMore) {
        stopBrowseObserver?.()
        stopBrowseObserver = null
      }
    } catch (error) {
      if (reqAbort.signal.aborted || serial !== browseSerial) return
      huntLoadCooldownUntil = Date.now() + 8000
      if (reset || browseState.characters.length === 0) {
        browseBody.replaceChildren(
          h('div', {
            class: 'ss-error',
            text:
              error instanceof Error
                ? error.message
                : 'Could not load catalog',
          }),
        )
      } else {
        browseMoreStatus.hidden = false
        browseMoreStatus.textContent =
          error instanceof Error ? error.message : 'Could not load more'
      }
      setStatus(
        error instanceof Error ? error.message : 'Catalog failed',
        true,
      )
    } finally {
      if (serial === browseSerial) {
        browseState.loading = false
        browseState.loadingMore = false
      }
      if (
        !browseMoreStatus.textContent ||
        browseMoreStatus.textContent === 'Loading more…'
      ) {
        browseMoreStatus.hidden = true
        browseMoreStatus.textContent = ''
      }
    }
  }

  function closeDetail(): void {
    clearDetailLoading()
    openDetailCharacterId = null
    const current = detail
    detail = null
    current?.destroy()
  }

  async function pickPlaylist(): Promise<Playlist | null> {
    if (!playlists.length) {
      playlists = defaultPlaylists()
    }
    if (playlists.length === 1) {
      return playlists[0] ?? null
    }
    const host = root.querySelector<HTMLElement>('.ss-sheet-backdrop') ?? root
    const choice = await openOptionSheet({
      host,
      title: 'Save to collection',
      options: playlists.map((playlist) => ({
        id: playlist.id,
        label: `${playlist.name} · ${playlist.characterIds.length}`,
      })),
    })
    if (!choice) return null
    return playlists.find((playlist) => playlist.id === choice) ?? null
  }

  async function saveCharacterToCollection(
    character: CatalogCharacter,
    sheet: ReturnType<typeof openDetailSheet>,
  ): Promise<void> {
    const target = await pickPlaylist()
    if (!target) return
    await persistPlaylists(addToPlaylist(playlists, target.id, character))
    sheet.setSaved(true, `Saved · ${target.name}`)
    setStatus(`Saved to ${target.name}`)
    if (active === 'collections') renderCollections()
  }

  async function pickChat(
    characterName: string,
    chats: Parameters<typeof chatPickerOptions>[0],
  ): Promise<'new' | string | null> {
    const host = root.querySelector<HTMLElement>('.ss-sheet-backdrop') ?? root
    const choice = await openOptionSheet({
      host,
      title: `Chats with ${characterName || 'character'}`,
      options: chatPickerOptions(chats),
    })
    if (!choice) return null
    return choice === 'new' ? 'new' : choice
  }

  async function openLumiverseChat(
    lumiverseId: string,
    sheet: ReturnType<typeof openDetailSheet>,
    characterName: string,
  ): Promise<void> {
    try {
      const opened = await resolveAndOpenChat({
        lumiverseId,
        characterName,
        signal: abort.signal,
        pickChat,
        setBusy: (busy, message) => sheet.setBusy(busy, message),
      })
      sheet.setBusy(false)
      if (opened) closeDetail()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Could not open chat'
      sheet.setError(message)
      setStatus(message, true)
    }
  }

  function bindDetail(
    character: CatalogCharacter,
  ): ReturnType<typeof openDetailSheet> {
    const holder: {
      sheet?: ReturnType<typeof openDetailSheet>
    } = {}
    holder.sheet = openDetailSheet(root, character, {
      onClose: closeDetail,
      onImport: (row) => {
        const current = holder.sheet
        if (!current) return
        const popup = openImportVerifyPopup()
        void runImport(row.id, current, popup, row)
      },
      onChat: (lumiverseId) => {
        const current = holder.sheet
        if (!current) return
        void openLumiverseChat(lumiverseId, current, character.name)
      },
      onSaveToCollection: (row) => {
        const current = holder.sheet
        if (!current) return
        runTask(saveCharacterToCollection(row, current))
      },
      onOpenCreator: (row) => {
        const ref = row.creatorRef || row.creatorName
        void openCreator(ref, row.creatorName)
      },
    })
    const already = playlists.some((playlist) =>
      playlist.characterIds.includes(character.id),
    )
    if (already) {
      const names = playlists
        .filter((playlist) => playlist.characterIds.includes(character.id))
        .map((playlist) => playlist.name)
      holder.sheet.setSaved(true, `In · ${names[0] || 'collection'}`)
    }
    return holder.sheet
  }

  let detailLoading: HTMLElement | null = null
  let detailOpenSerial = 0

  function clearDetailLoading(): void {
    detailLoading?.remove()
    detailLoading = null
  }

  function showDetailLoading(): void {
    clearDetailLoading()
    detailLoading = h('div', {
      class: 'ss-detail-loading',
      role: 'status',
      'aria-live': 'polite',
    }, [
      h('div', { class: 'ss-detail-loading-pulse', 'aria-hidden': 'true' }),
      h('div', { text: 'Loading character…' }),
    ])
    root.append(detailLoading)
  }

  function openCharacter(character: CatalogCharacter): void {
    void openCharacterReady(character)
  }

  async function openCharacterReady(
    character: CatalogCharacter,
  ): Promise<void> {
    const serial = ++detailOpenSerial
    closeDetail()
    characterCache.remember(character)
    showDetailLoading()
    let full = characterCache.get(character.id) || character
    let community: Awaited<ReturnType<typeof fetchCommunitySummary>> = null
    try {
      const [detailRow, communityRow] = await Promise.all([
        characterCache.getOrFetch(character.id, abort.signal),
        fetchCommunitySummary(client, character.id, abort.signal),
      ])
      full = detailRow
      community = communityRow
    } catch {
    }
    if (abort.signal.aborted || serial !== detailOpenSerial) {
      clearDetailLoading()
      return
    }
    clearDetailLoading()
    openDetailCharacterId = full.id
    detail = bindDetail(full)
    if (community) detail.setCommunity(community)
    await reconcileImportedState(full.id, detail)
  }

  async function runImport(
    id: string,
    sheet: ReturnType<typeof openDetailSheet>,
    popup: Window | null,
    preview?: CatalogCharacter,
  ): Promise<void> {
    sheet.setBusy(true, 'Importing…')
    try {
      const result = await importDatacatCharacter(
        client,
        id,
        abort.signal,
        popup,
        (message) => sheet.setBusy(true, message),
      )
      await persistImports(
        upsertImportRecord(imports, {
          datacatId: id,
          lumiverseId: result.lumiverseCharacterId,
          name: result.name,
          importedAt: new Date().toISOString(),
          imageUrl: preview?.imageUrl || '',
          score: preview?.score ?? null,
        }),
      )
      sheet.setImported(result.lumiverseCharacterId)
      sheet.setBusy(false)
      setStatus(
        result.lorebookEntries > 0
          ? `Imported ${result.name} + lorebook (${result.lorebookEntries} entries)`
          : `Imported ${result.name} · card had no lorebook`,
      )
      if (active === 'library') renderLibrary()
      if (discoverMode === 'fresh') renderDiscover()
      else renderFeed(discoverMode)
      if (active === 'browse') renderBrowse()
    } catch (error) {
      if (popup && !popup.closed) {
        try {
          popup.close()
        } catch {
        }
      }
      const message =
        error instanceof Error ? error.message : 'Import failed'
      sheet.setError(message)
      setStatus(message, true)
    }
  }

  const stopImportPush = rpc.onPush((message) => {
    if (message.type !== 'imports_changed') return
    applyImportsFromHost(normalizeImportList(message.value))
  })

  void rpc
    .request({ type: 'health' }, abort.signal)
    .then(async (result) => {
      if (result.type !== 'health_result') return
      setStatus(`${result.health.extension} backend ok`)
      try {
        const [syncedPlaylists, syncedImports, syncedFollows] =
          await Promise.all([
            userStore.loadPlaylists(abort.signal),
            userStore.loadImports(abort.signal),
            userStore.loadFollows(abort.signal),
          ])
        if (MOCK_PREVIEW) {
          playlists = mockPreviewPlaylists()
          imports = mockPreviewImports()
          follows = mockPreviewFollows()
        } else {
          if (!dirtyPlaylists) playlists = syncedPlaylists
          if (!dirtyImports) imports = syncedImports
          if (!dirtyFollows) follows = syncedFollows
        }
        storeReady = true
        if (active === 'collections') renderCollections()
        if (active === 'library') renderLibrary()
        if (active === 'discover') {
          renderAffinityRail()
          void renderFollowedRail()
        }
        if (
          filters.followedCreatorsOnly &&
          active === 'browse' &&
          browseScope === 'characters' &&
          !creatorState.active
        ) {
          void loadBrowse(true)
        }
      } catch {
        storeReady = false
      }
      try {
        const tags = await fetchTagsPage(client, { signal: abort.signal })
        knownTags = tags.tags
      } catch {
        knownTags = []
      }
      updateFilterBar()
      await loadFresh(true)
    })
    .catch((error: unknown) => {
      if (abort.signal.aborted) return
      setStatus(
        error instanceof Error ? error.message : 'Backend unavailable',
        true,
      )
    })

  return {
    destroy: () => {
      abort.abort()
      stopImportPush()
      if (searchTimer) clearTimeout(searchTimer)
      if (statusTimer) clearTimeout(statusTimer)
      stopBrowseObserver?.()
      stopFreshObserver?.()
      stopCreatorObserver?.()
      stopCreatorBrowseObserver?.()
      destroyAffinityRail()
      destroyFollowedRailHandle()
      filterUi?.destroy()
      browseHunt?.destroy()
      browseHunt = null
      detailOpenSerial += 1
      closeDetail()
      root.replaceChildren()
    },
  }
}
