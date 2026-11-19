import { h } from '../dom'
import { icon } from '../icons'

const NEAR_END_PX = 160
const SCROLL_STEP = 280

export type RailHandle = {
  root: HTMLElement
  track: HTMLElement
  destroy: () => void
  refresh: () => void
}

export function createRail(opts: {
  onNearEnd?: () => void
}): RailHandle {
  const track = h('div', { class: 'ss-rail' })
  const prev = h(
    'button',
    {
      class: 'ss-rail-nav ss-rail-nav--prev',
      type: 'button',
      'aria-label': 'Scroll left',
      hidden: true,
    },
    [icon('back', 16)],
  ) as HTMLButtonElement
  const next = h(
    'button',
    {
      class: 'ss-rail-nav ss-rail-nav--next',
      type: 'button',
      'aria-label': 'Scroll right',
      hidden: true,
    },
    [icon('back', 16)],
  ) as HTMLButtonElement
  const root = h('div', { class: 'ss-rail-wrap' }, [prev, track, next])

  let nearEndArmed = true
  let frame = 0

  function maxScroll(): number {
    return Math.max(0, track.scrollWidth - track.clientWidth)
  }

  function refresh(): void {
    const max = maxScroll()
    const left = track.scrollLeft
    const canScroll = max > 4
    prev.hidden = !canScroll || left <= 4
    next.hidden = !canScroll || left >= max - 4
    if (
      nearEndArmed &&
      left + track.clientWidth >= track.scrollWidth - NEAR_END_PX
    ) {
      nearEndArmed = false
      opts.onNearEnd?.()
    } else if (
      left + track.clientWidth <
      track.scrollWidth - NEAR_END_PX - 40
    ) {
      nearEndArmed = true
    }
  }

  function scheduleRefresh(): void {
    if (frame) return
    frame = requestAnimationFrame(() => {
      frame = 0
      refresh()
    })
  }

  prev.addEventListener('click', () => {
    track.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' })
  })
  next.addEventListener('click', () => {
    track.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' })
  })
  track.addEventListener('scroll', scheduleRefresh, { passive: true })
  window.addEventListener('resize', scheduleRefresh)

  void Promise.resolve().then(refresh)

  return {
    root,
    track,
    refresh,
    destroy: () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('resize', scheduleRefresh)
      track.removeEventListener('scroll', scheduleRefresh)
    },
  }
}
