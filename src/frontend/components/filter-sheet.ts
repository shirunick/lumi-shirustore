import {
  CATALOG_SORT_OPTIONS,
  DEFAULT_FILTERS,
  activeFilterCount,
  cloneFilters,
  normalizeMinScore,
  normalizeTagName,
  type CatalogFilters,
} from '../../shared/catalog-filters'
import {
  createFilterPreset,
  loadFilterPresets,
  saveFilterPresets,
  type FilterPreset,
} from '../../shared/filter-presets'
import type { CatalogTag } from '../../shared/tags'
import { h } from '../dom'
import { icon } from '../icons'
import { openPromptSheet } from '../ui/pickers'

export function openFilterSheet(opts: {
  host: HTMLElement
  filters: CatalogFilters
  tags: CatalogTag[]
  onApply: (filters: CatalogFilters) => void
  onClose: () => void
  onLoadTags?: (search: string) => Promise<CatalogTag[]>
}): { destroy: () => void } {
  let draft = cloneFilters(opts.filters)
  let tags = [...opts.tags]
  let presets = loadFilterPresets()
  let tagTimer: ReturnType<typeof setTimeout> | null = null

  opts.host.classList.add('ss-root--sheet-open')

  const backdrop = h('div', {
    class: 'ss-filter-backdrop',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': 'Catalog filters',
  })
  const sheet = h('div', { class: 'ss-filter-sheet' })
  const title = h('div', { class: 'ss-filter-title', text: 'Filters' })
  const closeBtn = h('button', {
    class: 'ss-icon-btn',
    type: 'button',
    title: 'Close',
    'aria-label': 'Close',
  })
  closeBtn.append(icon('close'))
  const header = h('div', { class: 'ss-filter-header' }, [title, closeBtn])

  const scoreValue = h('span', {
    class: 'ss-filter-score-value',
    text: draft.minScore > 0 ? `${draft.minScore}%+` : 'Any',
  })
  const scoreLabel = h('div', { class: 'ss-filter-label ss-filter-score-label' }, [
    h('span', { text: 'Min finish score' }),
    scoreValue,
  ])
  const scoreSlider = h('input', {
    class: 'ss-filter-slider',
    type: 'range',
    min: '0',
    max: '100',
    step: '5',
    value: String(draft.minScore),
  }) as HTMLInputElement
  const scoreRow = h('div', { class: 'ss-filter-score' }, [scoreSlider])
  const followedBtn = h('button', {
    class: 'ss-filter-choice ss-filter-choice-block',
    type: 'button',
    text: 'Only followed creators',
    'data-active': draft.followedCreatorsOnly ? 'true' : 'false',
  })
  const followedHint = h('div', {
    class: 'ss-filter-hint',
    text: 'Limits results to creators you follow in Shelf. Local follows only.',
  })
  const sortRow = h('div', { class: 'ss-filter-choice-grid' })
  const tagSearch = h('input', {
    class: 'ss-search',
    type: 'search',
    placeholder: 'Search tags…',
  }) as HTMLInputElement
  const selectedTags = h('div', { class: 'ss-selected-tags', hidden: true })
  const clearTagsBtn = h('button', {
    class: 'ss-filter-chip',
    type: 'button',
    text: 'Clear tags',
    hidden: true,
  })
  const tagRow = h('div', { class: 'ss-filter-tag-grid' })

  const presetRow = h('div', { class: 'ss-filter-tag-grid' })
  const savePresetBtn = h('button', {
    class: 'ss-btn ss-btn-ghost ss-filter-chip-block',
    type: 'button',
    text: '+ Save current as preset',
  })
  const clearBtn = h('button', {
    class: 'ss-btn ss-btn-secondary',
    type: 'button',
    text: 'Reset',
  })
  const applyBtn = h('button', {
    class: 'ss-btn ss-btn-primary',
    type: 'button',
    text: 'Apply',
  })
  const actions = h('div', { class: 'ss-filter-actions' }, [
    clearBtn,
    applyBtn,
  ])

  const tagsHeader = h('div', { class: 'ss-filter-label ss-filter-label-row' }, [
    h('span', { text: 'Tags' }),
    clearTagsBtn,
  ])

  const body = h('div', { class: 'ss-filter-body' }, [
    h('div', { class: 'ss-filter-section' }, [scoreLabel, scoreRow]),
    h('div', { class: 'ss-filter-section' }, [
      h('div', { class: 'ss-filter-label', text: 'Creators' }),
      followedBtn,
      followedHint,
    ]),
    h('div', { class: 'ss-filter-section' }, [
      h('div', { class: 'ss-filter-label', text: 'Sort' }),
      sortRow,
    ]),
    h('div', { class: 'ss-filter-section' }, [
      tagsHeader,
      h('div', {
        class: 'ss-filter-hint',
        text: 'Tap once to include, twice to exclude, again to clear.',
      }),
      selectedTags,
      tagSearch,
      tagRow,
    ]),
    h('div', { class: 'ss-filter-section' }, [
      h('div', { class: 'ss-filter-label', text: 'Presets' }),
      presetRow,
      savePresetBtn,
    ]),
  ])

  sheet.append(header, body, actions)
  backdrop.append(sheet)
  opts.host.append(backdrop)

  function updateApplyLabel(): void {
    const count = activeFilterCount(draft)
    applyBtn.textContent = count > 0 ? `Apply (${count})` : 'Apply'
  }

  function tagLabel(id: number): string {
    const known = tags.find((tag) => tag.id === id)
    return known?.name || `#${id}`
  }

  type TagState = 'off' | 'include' | 'exclude'

  function tagState(tag: CatalogTag): TagState {
    if (draft.tagIds.includes(tag.id)) return 'include'
    if (draft.excludeTags.includes(normalizeTagName(tag.name))) return 'exclude'
    return 'off'
  }

  function setTagState(tag: CatalogTag, next: TagState): void {
    const name = normalizeTagName(tag.name)
    const tagIds = draft.tagIds.filter((id) => id !== tag.id)
    const excludeTags = draft.excludeTags.filter((row) => row !== name)
    if (next === 'include') tagIds.push(tag.id)
    if (next === 'exclude' && name) excludeTags.push(name)
    draft = { ...draft, tagIds, excludeTags }
    renderSelectedTags()
    renderTags()
    updateApplyLabel()
  }

  function cycleTag(tag: CatalogTag): void {
    const state = tagState(tag)
    setTagState(tag, state === 'off' ? 'include' : state === 'include' ? 'exclude' : 'off')
  }

  function selectedChip(label: string, state: TagState, onRemove: () => void): HTMLElement {
    const button = h('button', {
      class: 'ss-filter-chip',
      type: 'button',
      text: `${state === 'exclude' ? '−' : '+'} ${label} ×`,
      'data-state': state,
      title: 'Remove',
    })
    button.addEventListener('click', onRemove)
    return button
  }

  function renderSelectedTags(): void {
    selectedTags.replaceChildren()
    const total = draft.tagIds.length + draft.excludeTags.length
    clearTagsBtn.hidden = total === 0
    if (!total) {
      selectedTags.hidden = true
      return
    }
    selectedTags.hidden = false
    for (const id of draft.tagIds) {
      selectedTags.append(
        selectedChip(tagLabel(id), 'include', () => {
          draft = { ...draft, tagIds: draft.tagIds.filter((row) => row !== id) }
          renderSelectedTags()
          renderTags()
          updateApplyLabel()
        }),
      )
    }
    for (const name of draft.excludeTags) {
      selectedTags.append(
        selectedChip(name, 'exclude', () => {
          draft = {
            ...draft,
            excludeTags: draft.excludeTags.filter((row) => row !== name),
          }
          renderSelectedTags()
          renderTags()
          updateApplyLabel()
        }),
      )
    }
  }

  function renderScore(): void {
    const value = normalizeMinScore(draft.minScore)
    draft = { ...draft, minScore: value }
    scoreSlider.value = String(value)
    scoreValue.textContent = value > 0 ? `${value}%+` : 'Any'
  }

  function renderFollowed(): void {
    followedBtn.dataset.active = draft.followedCreatorsOnly ? 'true' : 'false'
  }

  scoreSlider.addEventListener('input', () => {
    draft = { ...draft, minScore: normalizeMinScore(scoreSlider.value) }
    renderScore()
    updateApplyLabel()
  })

  followedBtn.addEventListener('click', () => {
    draft = {
      ...draft,
      followedCreatorsOnly: !draft.followedCreatorsOnly,
    }
    renderFollowed()
    updateApplyLabel()
  })

  function renderSort(): void {
    sortRow.replaceChildren()
    for (const option of CATALOG_SORT_OPTIONS) {
      const button = h('button', {
        class: 'ss-filter-choice',
        type: 'button',
        text: option.label,
        'data-active': draft.sort === option.value ? 'true' : 'false',
      })
      button.addEventListener('click', () => {
        draft = { ...draft, sort: option.value }
        renderSort()
        updateApplyLabel()
      })
      sortRow.append(button)
    }
  }

  function renderTags(): void {
    tagRow.replaceChildren()
    if (!tags.length) {
      tagRow.append(
        h('span', { class: 'ss-copy', text: 'No tags loaded yet.' }),
      )
      return
    }
    for (const tag of tags.slice(0, 40)) {
      const state = tagState(tag)
      const prefix = state === 'include' ? '+ ' : state === 'exclude' ? '− ' : ''
      const button = h('button', {
        class: 'ss-filter-chip',
        type: 'button',
        text: `${prefix}${tag.count ? `${tag.name} · ${tag.count}` : tag.name}`,
        'data-state': state,
        title:
          state === 'off'
            ? 'Tap to include'
            : state === 'include'
              ? 'Tap again to exclude'
              : 'Tap again to clear',
      })
      button.addEventListener('click', () => cycleTag(tag))
      tagRow.append(button)
    }
  }

  function renderPresets(): void {
    presetRow.replaceChildren()
    if (!presets.length) {
      presetRow.append(
        h('span', { class: 'ss-copy', text: 'No saved presets.' }),
      )
      return
    }
    for (const preset of presets) {
      const wrap = h('div', { class: 'ss-filter-preset' })
      const button = h('button', {
        class: 'ss-filter-chip',
        type: 'button',
        text: preset.name,
      })
      button.addEventListener('click', () => {
        draft = cloneFilters(preset.filters)
        renderScore()
        renderFollowed()
        renderSort()
        renderSelectedTags()
        renderTags()
        updateApplyLabel()
      })
      const remove = h('button', {
        class: 'ss-filter-chip ss-filter-chip-danger',
        type: 'button',
        text: '×',
        title: `Remove ${preset.name}`,
      })
      remove.addEventListener('click', () => {
        presets = presets.filter((row) => row.id !== preset.id)
        saveFilterPresets(presets)
        renderPresets()
      })
      wrap.append(button, remove)
      presetRow.append(wrap)
    }
  }

  async function refreshTags(search: string): Promise<void> {
    if (!opts.onLoadTags) return
    try {
      tags = await opts.onLoadTags(search)
      renderSelectedTags()
      renderTags()
    } catch {
    }
  }

  tagSearch.addEventListener('input', () => {
    if (tagTimer) clearTimeout(tagTimer)
    tagTimer = setTimeout(() => {
      void refreshTags(tagSearch.value.trim())
    }, 250)
  })

  clearTagsBtn.addEventListener('click', () => {
    draft = { ...draft, tagIds: [], excludeTags: [] }
    renderSelectedTags()
    renderTags()
    updateApplyLabel()
  })

  savePresetBtn.addEventListener('click', () => {
    void openPromptSheet({
      host: backdrop,
      title: 'Preset name',
      initialValue: `Score ${draft.minScore}%+`,
      confirmLabel: 'Save',
    }).then((name) => {
      if (!name) return
      const preset: FilterPreset = createFilterPreset(name, draft)
      presets = [preset, ...presets].slice(0, 12)
      saveFilterPresets(presets)
      renderPresets()
    })
  })

  clearBtn.addEventListener('click', () => {
    draft = cloneFilters(DEFAULT_FILTERS)
    tagSearch.value = ''
    renderScore()
    renderFollowed()
    renderSort()
    renderSelectedTags()
    renderTags()
    updateApplyLabel()
  })

  applyBtn.addEventListener('click', () => {
    opts.onApply(cloneFilters(draft))
    destroy()
  })

  closeBtn.addEventListener('click', () => destroy())
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) destroy()
  })

  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') destroy()
  }
  window.addEventListener('keydown', onKey)

  function destroy(): void {
    if (tagTimer) clearTimeout(tagTimer)
    window.removeEventListener('keydown', onKey)
    opts.host.classList.remove('ss-root--sheet-open')
    backdrop.remove()
    opts.onClose()
  }

  renderScore()
  renderFollowed()
  renderSort()
  renderSelectedTags()
  renderTags()
  renderPresets()
  updateApplyLabel()
  void refreshTags('')

  return { destroy }
}

export function filterSummary(filters: CatalogFilters): string {
  const parts: string[] = []
  if (filters.minScore > 0) parts.push(`${filters.minScore}%+`)
  if (filters.followedCreatorsOnly) parts.push('Followed creators')
  if (filters.sort !== 'first_published') {
    const sort = CATALOG_SORT_OPTIONS.find((row) => row.value === filters.sort)
    if (sort) parts.push(sort.label)
  }
  if (filters.tagIds.length) parts.push(`+${filters.tagIds.length} tags`)
  if (filters.excludeTags.length) {
    parts.push(`−${filters.excludeTags.join(', −')}`)
  }
  return parts.join(' · ')
}
