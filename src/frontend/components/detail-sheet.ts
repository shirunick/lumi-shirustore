import type { CatalogCharacter } from '../../shared/character'
import type { CommunitySummary } from '../api/catalog'
import { h } from '../dom'
import { icon } from '../icons'
import { scoreBadge } from './card-grid'

export type DetailSheetHandlers = {
  onClose: () => void
  onImport: (character: CatalogCharacter) => void
  onChat: (lumiverseId: string) => void
  onSaveToCollection: (character: CatalogCharacter) => void
  onOpenCreator?: (character: CatalogCharacter) => void
}

export type DetailSheet = {
  destroy: () => void
  update: (character: CatalogCharacter) => void
  setBusy: (busy: boolean, label?: string) => void
  setError: (message: string) => void
  setSaved: (saved: boolean, label?: string) => void
  setCommunity: (summary: CommunitySummary | null) => void
  setImported: (lumiverseId: string | null) => void
}

function safeCssUrl(raw: string): string {
  if (!raw) return ''
  const escaped = raw.replace(/["\\()\r\n]/g, (ch) =>
    `%${ch.charCodeAt(0).toString(16).padStart(2, '0')}`,
  )
  return `url("${escaped}")`
}

function buttonLabel(button: HTMLButtonElement, text: string): void {
  const label = button.querySelector('.ss-btn-label')
  if (label) label.textContent = text
}

export function openDetailSheet(
  host: HTMLElement,
  initial: CatalogCharacter,
  handlers: DetailSheetHandlers,
): DetailSheet {
  let character = initial
  let community: CommunitySummary | null = null
  let lumiverseId: string | null = null
  host.classList.add('ss-root--sheet-open')

  const backdrop = h('div', {
    class: 'ss-sheet-backdrop',
    'data-open': 'true',
  })
  const sheet = h('div', {
    class: 'ss-sheet',
    role: 'dialog',
    'aria-modal': 'true',
  })

  const backBtn = h('button', {
    class: 'ss-icon-btn',
    type: 'button',
    'aria-label': 'Back',
    title: 'Back',
  })
  backBtn.append(icon('back'))
  backBtn.addEventListener('click', handlers.onClose)
  const headerTitle = h('div', { class: 'ss-sheet-header-title' })
  const chrome = h('div', { class: 'ss-sheet-header' }, [backBtn, headerTitle])

  const scroll = h('div', { class: 'ss-sheet-scroll' })

  const errorEl = h('div', {
    class: 'ss-sheet-error',
    hidden: true,
    role: 'alert',
  })
  const saveBtn = h('button', {
    class: 'ss-btn ss-btn-secondary',
    type: 'button',
  })
  saveBtn.append(
    icon('bookmark', 16),
    h('span', { class: 'ss-btn-label', text: 'Save' }),
  )
  saveBtn.addEventListener('click', () => handlers.onSaveToCollection(character))
  const importBtn = h('button', {
    class: 'ss-btn ss-btn-primary',
    type: 'button',
  })
  importBtn.append(
    icon('download', 16),
    h('span', { class: 'ss-btn-label', text: 'Import' }),
  )
  const chatBtn = h('button', {
    class: 'ss-btn ss-btn-primary',
    type: 'button',
    hidden: true,
  })
  chatBtn.append(
    icon('chat', 16),
    h('span', { class: 'ss-btn-label', text: 'Chat' }),
  )
  importBtn.addEventListener('click', () => handlers.onImport(character))
  chatBtn.addEventListener('click', () => {
    if (!lumiverseId) return
    handlers.onChat(lumiverseId)
  })

  const actionRow = h('div', { class: 'ss-sheet-action-row' }, [
    saveBtn,
    importBtn,
    chatBtn,
  ])
  const actions = h('div', { class: 'ss-sheet-actions' }, [errorEl, actionRow])
  sheet.append(chrome, scroll, actions)
  backdrop.append(sheet)
  host.append(backdrop)

  let heroTitle: HTMLElement | null = null
  let heroCreator: HTMLElement | null = null
  let heroMeta: HTMLElement | null = null
  let heroArt: HTMLElement | null = null
  let heroGlow: HTMLElement | null = null
  let aboutCopy: HTMLElement | null = null
  let firstMessageCopy: HTMLElement | null = null
  let firstMessageSection: HTMLElement | null = null
  let chipRow: HTMLElement | null = null

  function syncPrimaryAction(): void {
    const imported = Boolean(lumiverseId)
    importBtn.hidden = imported
    chatBtn.hidden = !imported
  }

  function communityLine(): HTMLElement | null {
    if (!community || (community.kudos <= 0 && community.comments <= 0)) {
      return null
    }
    const row = h('div', { class: 'ss-hero-stats' })
    if (community.kudos > 0) {
      row.append(
        h('span', { class: 'ss-stat' }, [
          icon('heart', 14),
          String(community.kudos),
        ]),
      )
    }
    if (community.comments > 0) {
      row.append(
        h('span', { class: 'ss-stat' }, [
          icon('chat', 14),
          String(community.comments),
        ]),
      )
    }
    return row
  }

  function buildMeta(): HTMLElement {
    const meta = h('div', { class: 'ss-hero-meta' }, [
      scoreBadge(character.score, 'ss-score ss-score-lg'),
    ])
    const stats = communityLine()
    if (stats) meta.append(stats)
    if (character.lorebook?.present) {
      meta.append(
        h('span', { class: 'ss-stat' }, [
          icon('library', 14),
          character.lorebook.entries
            ? `Lorebook · ${character.lorebook.entries}`
            : 'Lorebook',
        ]),
      )
    }
    return meta
  }

  function buildCreator(): HTMLElement {
    const canOpenCreator = Boolean(
      handlers.onOpenCreator &&
        (character.creatorRef || character.creatorName !== 'Unknown creator'),
    )
    const creatorEl = canOpenCreator
      ? h('button', {
          class: 'ss-hero-creator ss-creator-link',
          type: 'button',
          text: `by ${character.creatorName}`,
        })
      : h('div', {
          class: 'ss-hero-creator',
          text: `by ${character.creatorName}`,
        })
    if (canOpenCreator) {
      creatorEl.addEventListener('click', () => handlers.onOpenCreator?.(character))
    }
    return creatorEl
  }

  function buildArt(): HTMLElement {
    return character.imageUrl
      ? h('img', { class: 'ss-hero-art', src: character.imageUrl, alt: '' })
      : h('div', {
          class: 'ss-hero-art ss-card-art-empty',
          text: character.name.slice(0, 1).toUpperCase(),
        })
  }

  function patchContent(): void {
    headerTitle.textContent = character.name
    syncPrimaryAction()
    if (heroTitle) heroTitle.textContent = character.name
    if (heroCreator) {
      const next = buildCreator()
      heroCreator.replaceWith(next)
      heroCreator = next
    }
    if (heroMeta) {
      const next = buildMeta()
      heroMeta.replaceWith(next)
      heroMeta = next
    }
    if (heroArt) {
      const next = buildArt()
      heroArt.replaceWith(next)
      heroArt = next
    }
    if (heroGlow) {
      heroGlow.style.backgroundImage = safeCssUrl(character.imageUrl)
    }
    if (aboutCopy) {
      aboutCopy.textContent =
        character.description || 'No description provided.'
    }
    if (character.firstMessage.trim()) {
      if (firstMessageCopy) {
        firstMessageCopy.textContent = character.firstMessage
        if (firstMessageSection) firstMessageSection.hidden = false
      }
    } else if (firstMessageSection) {
      firstMessageSection.hidden = true
    }
    if (chipRow) {
      chipRow.replaceChildren(
        ...character.tags
          .slice(0, 16)
          .map((tag) => h('span', { class: 'ss-chip', text: tag })),
      )
      chipRow.hidden = character.tags.length === 0
    }
  }

  function render(): void {
    const top = scroll.scrollTop
    headerTitle.textContent = character.name
    syncPrimaryAction()

    heroArt = buildArt()
    heroGlow = h('div', { class: 'ss-hero-glow' })
    if (character.imageUrl) {
      heroGlow.style.backgroundImage = safeCssUrl(character.imageUrl)
    }
    heroTitle = h('h1', { class: 'ss-hero-title', text: character.name })
    heroCreator = buildCreator()
    heroMeta = buildMeta()

    const hero = h('div', { class: 'ss-hero' }, [
      heroGlow,
      h('div', { class: 'ss-hero-inner' }, [
        heroArt,
        h('div', { class: 'ss-hero-text' }, [
          heroTitle,
          heroCreator,
          heroMeta,
        ]),
      ]),
    ])

    chipRow = h(
      'div',
      { class: 'ss-chip-row', hidden: character.tags.length === 0 },
      character.tags
        .slice(0, 16)
        .map((tag) => h('span', { class: 'ss-chip', text: tag })),
    )
    aboutCopy = h('p', {
      class: 'ss-sheet-copy',
      text: character.description || 'No description provided.',
    })
    firstMessageCopy = h('p', {
      class: 'ss-sheet-copy ss-sheet-quote',
      text: character.firstMessage,
    })
    firstMessageSection = h('section', {
      class: 'ss-sheet-section',
      hidden: !character.firstMessage.trim(),
    }, [
      h('h2', { class: 'ss-sheet-section-title', text: 'First message' }),
      firstMessageCopy,
    ])

    scroll.replaceChildren(
      h('div', { class: 'ss-sheet-body' }, [
        hero,
        chipRow,
        h('section', { class: 'ss-sheet-section' }, [
          h('h2', { class: 'ss-sheet-section-title', text: 'About' }),
          aboutCopy,
        ]),
        firstMessageSection,
      ]),
    )
    scroll.scrollTop = top
  }

  render()

  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') handlers.onClose()
  }
  window.addEventListener('keydown', onKey)

  return {
    destroy: () => {
      window.removeEventListener('keydown', onKey)
      host.classList.remove('ss-root--sheet-open')
      backdrop.remove()
    },
    update: (next) => {
      const same = next.id === character.id
      character = next
      if (same && aboutCopy) patchContent()
      else render()
    },
    setBusy: (busy, label) => {
      importBtn.disabled = busy
      chatBtn.disabled = busy
      saveBtn.disabled = busy
      if (!lumiverseId) {
        buttonLabel(importBtn, busy ? label || 'Importing…' : 'Import')
      } else {
        buttonLabel(chatBtn, busy ? label || 'Opening…' : 'Chat')
      }
      if (busy) {
        errorEl.hidden = true
        errorEl.textContent = ''
      }
    },
    setError: (message) => {
      importBtn.disabled = false
      chatBtn.disabled = false
      saveBtn.disabled = false
      buttonLabel(importBtn, 'Import')
      buttonLabel(chatBtn, 'Chat')
      errorEl.hidden = !message
      errorEl.textContent = message
    },
    setSaved: (saved, label) => {
      buttonLabel(saveBtn, saved ? label || 'Saved' : 'Save')
      if (saved) saveBtn.dataset.saved = 'true'
      else delete saveBtn.dataset.saved
    },
    setCommunity: (summary) => {
      community = summary
      if (heroMeta) {
        const next = buildMeta()
        heroMeta.replaceWith(next)
        heroMeta = next
      } else {
        render()
      }
    },
    setImported: (nextId) => {
      lumiverseId = nextId ? String(nextId).trim() || null : null
      syncPrimaryAction()
    },
  }
}
