import type { SpindleFrontendContext } from 'lumiverse-spindle-types'
import { DRAWER_TAB_ID } from '../shared/constants'
import { h } from './dom'
import type { RpcClient } from './rpc-client'
import { mountShell } from './shell'

const STORE_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l1-4h16l1 4"/><path d="M4 9h16v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9z"/><path d="M9 13h6"/></svg>`

export function registerDrawerTab(opts: {
  ctx: SpindleFrontendContext
  rpc: RpcClient
}): { destroy: () => void } {
  const { ctx, rpc } = opts
  const tab = ctx.ui.registerDrawerTab({
    id: DRAWER_TAB_ID,
    title: 'ShiruStore',
    shortName: 'Store',
    headerTitle: 'ShiruStore',
    description: 'Browse and import Datacat character cards',
    keywords: [
      'shirustore',
      'datacat',
      'characters',
      'marketplace',
      'cards',
      'store',
    ],
    iconSvg: STORE_ICON,
  })

  tab.root.classList.add('ss-tab-root')

  const root = h('div', { class: 'ss-root' })
  tab.root.appendChild(root)
  const stopBleed = bleedIntoHostPadding(tab.root)
  const stopSidebar = mountSidebarButton(ctx, tab)
  const shell = mountShell({ root, rpc })

  return {
    destroy: () => {
      stopSidebar()
      stopBleed()
      shell.destroy()
      tab.destroy()
    },
  }
}

type DrawerTab = ReturnType<SpindleFrontendContext['ui']['registerDrawerTab']>

function mountSidebarButton(ctx: SpindleFrontendContext, tab: DrawerTab): () => void {
  let slot: Element
  try {
    slot = ctx.ui.mount('sidebar_bottom')
  } catch {
    return () => {}
  }
  const tabSelector = `[data-tab-id="${CSS.escape(tab.tabId)}"]`
  const style = document.createElement('style')
  style.textContent = `button${tabSelector}:not(.ss-sidebar-btn) { display: none !important; }`
  document.head.append(style)

  const button = h('button', {
    class: 'ss-sidebar-btn',
    type: 'button',
    title: 'ShiruStore',
    'aria-label': 'ShiruStore',
    'aria-pressed': 'false',
    'data-tab-id': tab.tabId,
  })
  button.innerHTML = STORE_ICON
  button.addEventListener('click', () => tab.activate())
  slot.replaceChildren(button)

  let selected = false

  const sync = () => {
    button.dataset.active = selected ? 'true' : 'false'
    button.setAttribute('aria-pressed', selected ? 'true' : 'false')
  }

  const observer = new MutationObserver(() => {
    if (!selected) return
    if (tab.root.isConnected) return
    // Detached briefly during remount; confirm on next frame.
    requestAnimationFrame(() => {
      if (selected && !tab.root.isConnected) {
        selected = false
        sync()
      }
    })
  })
  let observedParent: Element | null = null
  const ensureObserver = () => {
    const parent = tab.root.parentElement
    if (!parent || parent === observedParent) return
    observer.disconnect()
    observedParent = parent
    observer.observe(parent, { childList: true })
  }
  ensureObserver()
  const stopActivate = tab.onActivate(() => {
    selected = true
    requestAnimationFrame(() => {
      ensureObserver()
      sync()
    })
  })

  const sidebar =
    (slot.parentElement instanceof HTMLElement ? slot.parentElement.parentElement : null) ||
    document.querySelector<HTMLElement>('[data-spindle-mount="sidebar"]')

  const onSidebarClick = (event: Event) => {
    const target = event.target
    if (!(target instanceof Element)) return
    const clicked = target.closest('button')
    if (!clicked || clicked === button) return
    if (!selected) return
    selected = false
    sync()
  }
  sidebar?.addEventListener('click', onSidebarClick, true)
  if (tab.root.isConnected) selected = true
  sync()

  return () => {
    stopActivate()
    sidebar?.removeEventListener('click', onSidebarClick, true)
    observer.disconnect()
    button.remove()
    style.remove()
  }
}

function paddedAncestor(el: HTMLElement): HTMLElement | null {
  let node = el.parentElement
  for (let depth = 0; node && depth < 3; depth += 1) {
    const cs = getComputedStyle(node)
    const padded = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft]
      .some((value) => parseFloat(value) > 0)
    if (padded) return node
    node = node.parentElement
  }
  return null
}

function bleedIntoHostPadding(el: HTMLElement): () => void {
  let applied: boolean | null = null
  const apply = () => {
    const host = el.isConnected ? paddedAncestor(el) : null
    const bleed = Boolean(host && getComputedStyle(host).position !== 'static')
    if (bleed === applied) return
    applied = bleed
    el.style.position = bleed ? 'absolute' : ''
    el.style.inset = bleed ? '0' : ''
    el.style.height = bleed ? 'auto' : '100%'
    el.style.maxHeight = bleed ? 'none' : ''
  }
  const observer = new ResizeObserver(apply)
  observer.observe(el)
  window.addEventListener('resize', apply)
  window.visualViewport?.addEventListener('resize', apply)
  apply()
  return () => {
    observer.disconnect()
    window.removeEventListener('resize', apply)
    window.visualViewport?.removeEventListener('resize', apply)
  }
}
