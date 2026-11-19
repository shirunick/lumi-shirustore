import type { CatalogCharacter } from '../../shared/character'
import { scorePresentation } from '../../shared/score'
import { h } from '../dom'

export function scoreBadge(
  value: number | null,
  className = 'ss-score',
): HTMLSpanElement {
  const score = scorePresentation(value)
  return h('span', {
    class: className,
    'data-tier': score.tier,
    title:
      score.tier === 'none'
        ? 'No Datacat finish score'
        : `Datacat finish score ${score.label}`,
    text: score.label,
  })
}

export function createCardButton(
  character: CatalogCharacter,
  onOpen: (character: CatalogCharacter) => void,
): HTMLButtonElement {
  const art = character.imageUrl
    ? h('img', {
        class: 'ss-card-art',
        src: character.imageUrl,
        alt: '',
        loading: 'lazy',
        decoding: 'async',
      })
    : h('div', {
        class: 'ss-card-art ss-card-art-empty',
        text: character.name.slice(0, 1).toUpperCase(),
      })

  const button = h('button', {
    class: 'ss-card',
    type: 'button',
    title: character.name,
  })
  button.append(
    h('div', { class: 'ss-card-art-wrap' }, [art]),
    scoreBadge(character.score),
    h('div', { class: 'ss-card-meta' }, [
      h('div', { class: 'ss-card-name', text: character.name }),
      h('div', { class: 'ss-card-creator', text: character.creatorName }),
    ]),
  )
  button.addEventListener('click', () => onOpen(character))
  return button
}

export function renderCardGrid(
  characters: CatalogCharacter[],
  onOpen: (character: CatalogCharacter) => void,
): HTMLElement {
  const grid = h('div', { class: 'ss-grid' })
  appendCards(grid, characters, onOpen)
  return grid
}

export function appendCards(
  grid: HTMLElement,
  characters: CatalogCharacter[],
  onOpen: (character: CatalogCharacter) => void,
): void {
  for (const character of characters) {
    grid.append(createCardButton(character, onOpen))
  }
}

export function renderSkeletonGrid(count = 6): HTMLElement {
  const grid = h('div', { class: 'ss-grid', 'aria-busy': 'true' })
  for (let i = 0; i < count; i += 1) {
    grid.append(h('div', { class: 'ss-card ss-skeleton' }))
  }
  return grid
}

export function renderSection(
  title: string,
  body: HTMLElement,
  count?: number,
): HTMLElement {
  const head = h('div', { class: 'ss-section-head' }, [
    h('h2', { class: 'ss-section-title', text: title }),
  ])
  if (count !== undefined) {
    head.append(h('span', { class: 'ss-section-count', text: String(count) }))
  }
  return h('section', { class: 'ss-section' }, [head, body])
}
