import type { CatalogCharacter } from '../../shared/character'
import { h } from '../dom'
import { icon } from '../icons'
import { scoreBadge } from './card-grid'

export type HuntAction = 'skip' | 'save' | 'preview'

export type HuntStack = {
  el: HTMLElement
  append: (characters: CatalogCharacter[], hasMore: boolean) => void
  sync: (characters: CatalogCharacter[], hasMore: boolean) => void
  destroy: () => void
}

const NEAR_END = 3
const LOCK_PX = 8
const SWIPE_PX = 96
const FLING_PX_PER_MS = 0.55
const FLY_MS = 220

export function mountHuntStack(opts: {
  characters: CatalogCharacter[]
  hasMore?: boolean
  emptyText?: string
  onAction: (action: HuntAction, character: CatalogCharacter) => void
  onNearEnd?: () => void
  enrich?: (id: string) => Promise<CatalogCharacter>
}): HuntStack {
  const root = h('div', { class: 'ss-hunt' })
  const deck = [...opts.characters]
  let hasMore = opts.hasMore === true
  let index = 0
  let pointerId: number | null = null
  let startX = 0
  let deltaX = 0
  let leaving = false
  let enrichSerial = 0
  let enrichTimer: ReturnType<typeof setTimeout> | null = null

  const stage = h('div', { class: 'ss-hunt-stage' })
  const empty = h('div', {
    class: 'ss-empty',
    text: opts.emptyText ?? 'No more cards. Try loosening your filters.',
  })
  const loading = h('div', { class: 'ss-empty', text: 'Loading more cards…' })
  const skipBtn = h('button', {
    class: 'ss-hunt-btn ss-hunt-btn-skip',
    type: 'button',
    title: 'Skip (swipe left)',
    'aria-label': 'Skip',
  })
  skipBtn.append(icon('close', 22))
  const openBtn = h('button', {
    class: 'ss-hunt-btn ss-hunt-btn-open',
    type: 'button',
    title: 'Open details',
    'aria-label': 'Open details',
  })
  openBtn.append(icon('eye', 20))
  const saveBtn = h('button', {
    class: 'ss-hunt-btn ss-hunt-btn-save',
    type: 'button',
    title: 'Save (swipe right)',
    'aria-label': 'Save',
  })
  saveBtn.append(icon('bookmark', 22))
  const counter = h('div', { class: 'ss-hunt-counter' })
  const actions = h('div', { class: 'ss-hunt-actions' }, [
    skipBtn,
    openBtn,
    saveBtn,
  ])

  root.append(stage, actions, counter)

  function current(): CatalogCharacter | null {
    return deck[index] ?? null
  }

  function needsEnrich(character: CatalogCharacter): boolean {
    return !character.description.trim() && !character.firstMessage.trim()
  }

  function hasFinePointer(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches
    )
  }

  function counterText(): string {
    if (!deck.length) return ''
    const base = `${Math.min(index + 1, deck.length)} / ${deck.length}${hasMore ? '+' : ''}`
    return hasFinePointer() ? `${base} · ← skip · save → · ↑ open` : base
  }

  function buildBodyNodes(character: CatalogCharacter): HTMLElement[] {
    const aboutText =
      character.description ||
      character.firstMessage ||
      'Open for full text…'
    const nodes: HTMLElement[] = []
    if (character.tags.length) {
      nodes.push(
        h(
          'div',
          { class: 'ss-chip-row' },
          character.tags
            .slice(0, 6)
            .map((tag) => h('span', { class: 'ss-chip', text: tag })),
        ),
      )
    }
    nodes.push(
      h('div', { class: 'ss-section' }, [
        h('div', { class: 'ss-section-title', text: 'About' }),
        h('p', { class: 'ss-hunt-copy', text: aboutText }),
      ]),
    )
    if (character.firstMessage) {
      nodes.push(
        h('div', { class: 'ss-section' }, [
          h('div', {
            class: 'ss-section-title',
            text: 'First message',
          }),
          h('p', {
            class: 'ss-hunt-copy',
            text: character.firstMessage,
          }),
        ]),
      )
    }
    return nodes
  }

  function scheduleEnrich(character: CatalogCharacter, at: number, bodyEl: HTMLElement): void {
    if (!opts.enrich || !needsEnrich(character)) return
    if (enrichTimer) clearTimeout(enrichTimer)
    const serial = ++enrichSerial
    enrichTimer = setTimeout(() => {
      void opts
        .enrich?.(character.id)
        .then((full) => {
          if (serial !== enrichSerial || at !== index) return
          deck[at] = full
          bodyEl.replaceChildren(...buildBodyNodes(full))
        })
        .catch(() => {})
    }, 280)
  }

  function renderCard(): void {
    const character = current()
    counter.textContent = counterText()
    if (hasMore && deck.length - index <= NEAR_END) opts.onNearEnd?.()
    if (!character) {
      stage.replaceChildren(hasMore ? loading : empty)
      skipBtn.disabled = true
      saveBtn.disabled = true
      openBtn.disabled = true
      return
    }
    skipBtn.disabled = false
    saveBtn.disabled = false
    openBtn.disabled = false

    const artWrap = h('div', { class: 'ss-hunt-art-wrap' })
    const art = character.imageUrl
      ? h('img', {
          class: 'ss-hunt-art',
          src: character.imageUrl,
          alt: '',
          draggable: 'false',
        })
      : h('div', {
          class: 'ss-hunt-art ss-card-art-empty',
          text: character.name.slice(0, 1).toUpperCase(),
        })
    artWrap.append(
      art,
      scoreBadge(character.score, 'ss-score ss-score-lg ss-hunt-score'),
      h('span', {
        class: 'ss-hunt-stamp ss-hunt-stamp-skip',
        text: 'SKIP',
        hidden: true,
      }),
      h('span', {
        class: 'ss-hunt-stamp ss-hunt-stamp-save',
        text: 'SAVE',
        hidden: true,
      }),
      h('div', { class: 'ss-hunt-title' }, [
        h('div', { class: 'ss-hunt-name', text: character.name }),
        h('div', { class: 'ss-hunt-creator', text: `by ${character.creatorName}` }),
      ]),
    )

    const body = h('div', { class: 'ss-hunt-body' }, buildBodyNodes(character))

    const card = h('div', { class: 'ss-hunt-card' }, [artWrap, body])
    card.style.transform = ''
    card.style.opacity = '1'
    stage.replaceChildren(card)
    bindDrag(card)
    scheduleEnrich(character, index, body)
  }

  function emit(action: HuntAction): void {
    const character = current()
    if (!character) return
    opts.onAction(action, character)
    if (action === 'preview') return
    index += 1
    renderCard()
  }

  function flyOut(action: 'skip' | 'save'): void {
    const card = stage.querySelector('.ss-hunt-card') as HTMLElement | null
    if (!card || leaving || !current()) return
    leaving = true
    const dir = action === 'save' ? 1 : -1
    const distance = Math.max(card.offsetWidth, 320) * 1.3
    card.dataset.dragging = 'false'
    card.dataset.leaving = 'true'
    card.style.transform = `translate3d(${dir * distance}px, 0, 0) rotate(${dir * 18}deg)`
    card.style.opacity = '0'
    let done = false
    const finish = () => {
      if (done) return
      done = true
      leaving = false
      emit(action)
    }
    card.addEventListener('transitionend', finish, { once: true })
    setTimeout(finish, FLY_MS + 60)
  }

  function bindDrag(card: HTMLElement): void {
    const skipStamp = card.querySelector(
      '.ss-hunt-stamp-skip',
    ) as HTMLElement | null
    const saveStamp = card.querySelector(
      '.ss-hunt-stamp-save',
    ) as HTMLElement | null
    let startY = 0
    let lastX = 0
    let lastT = 0
    let velocity = 0
    let frame = 0
    let mode: 'idle' | 'pending' | 'dragging' = 'idle'

    const paint = () => {
      frame = 0
      card.style.transform = `translate3d(${deltaX}px, 0, 0) rotate(${deltaX / 22}deg)`
      if (skipStamp) {
        skipStamp.hidden = deltaX > -24
        skipStamp.style.opacity = String(Math.min(1, -deltaX / SWIPE_PX))
      }
      if (saveStamp) {
        saveStamp.hidden = deltaX < 24
        saveStamp.style.opacity = String(Math.min(1, deltaX / SWIPE_PX))
      }
    }

    const reset = () => {
      if (frame) cancelAnimationFrame(frame)
      frame = 0
      mode = 'idle'
      pointerId = null
      card.dataset.dragging = 'false'
      card.style.transform = ''
      if (skipStamp) skipStamp.hidden = true
      if (saveStamp) saveStamp.hidden = true
    }

    card.addEventListener('pointerdown', (event) => {
      if (leaving || pointerId !== null) return
      if (event.pointerType === 'mouse' && event.button !== 0) return
      pointerId = event.pointerId
      startX = lastX = event.clientX
      startY = event.clientY
      lastT = event.timeStamp
      deltaX = 0
      velocity = 0
      mode = 'pending'
    })
    card.addEventListener('pointermove', (event) => {
      if (pointerId !== event.pointerId || mode === 'idle') return
      const dx = event.clientX - startX
      const dy = event.clientY - startY
      if (mode === 'pending') {
        if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return
        if (Math.abs(dy) >= Math.abs(dx)) {
          mode = 'idle'
          pointerId = null
          return
        }
        mode = 'dragging'
        card.dataset.dragging = 'true'
        try {
          card.setPointerCapture(event.pointerId)
        } catch {
        }
      }
      event.preventDefault()
      const dt = event.timeStamp - lastT
      if (dt > 0) velocity = (event.clientX - lastX) / dt
      lastX = event.clientX
      lastT = event.timeStamp
      deltaX = dx
      if (!frame) frame = requestAnimationFrame(paint)
    })
    const end = (event: PointerEvent) => {
      if (pointerId !== event.pointerId) return
      const wasDragging = mode === 'dragging'
      const cancelled = event.type === 'pointercancel'
      const fling = Math.abs(velocity) > FLING_PX_PER_MS && Math.abs(deltaX) > 40
      const commit =
        wasDragging && !cancelled && (Math.abs(deltaX) > SWIPE_PX || fling)
      const dir = fling ? Math.sign(velocity) : Math.sign(deltaX)
      reset()
      if (commit) flyOut(dir > 0 ? 'save' : 'skip')
    }
    card.addEventListener('pointerup', end)
    card.addEventListener('pointercancel', end)
    card.addEventListener('dragstart', (event) => event.preventDefault())
    card.addEventListener(
      'click',
      (event) => {
        if (Math.abs(deltaX) > LOCK_PX) event.stopPropagation()
      },
      true,
    )
  }

  skipBtn.addEventListener('click', () => flyOut('skip'))
  saveBtn.addEventListener('click', () => flyOut('save'))
  openBtn.addEventListener('click', () => emit('preview'))

  const onKey = (event: KeyboardEvent) => {
    if (leaving) return
    const target = event.target
    if (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      (target instanceof HTMLElement && target.isContentEditable)
    ) {
      return
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      flyOut('skip')
      return
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      flyOut('save')
      return
    }
    if (event.key === 'ArrowUp' || event.key === 'Enter') {
      event.preventDefault()
      emit('preview')
    }
  }
  window.addEventListener('keydown', onKey)

  function mergeDeck(characters: CatalogCharacter[], more: boolean): void {
    const wasEmpty = !current()
    const known = new Set(deck.map((row) => row.id))
    for (const row of characters) {
      if (!known.has(row.id)) deck.push(row)
    }
    hasMore = more
    if (wasEmpty) {
      renderCard()
    } else {
      counter.textContent = counterText()
    }
  }

  renderCard()
  return {
    el: root,
    append: mergeDeck,
    sync: mergeDeck,
    destroy: () => {
      window.removeEventListener('keydown', onKey)
      if (enrichTimer) clearTimeout(enrichTimer)
      root.remove()
    },
  }
}
