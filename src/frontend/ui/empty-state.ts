import type { IconName } from '../icons'
import { icon } from '../icons'
import { h } from '../dom'

export function renderEmptyState(
  iconName: IconName,
  title: string,
  body: string,
  action?: HTMLElement,
): HTMLElement {
  const node = h('div', { class: 'ss-empty-state' }, [
    h('div', { class: 'ss-empty-icon' }, [icon(iconName, 22)]),
    h('div', { class: 'ss-empty-title', text: title }),
    h('div', { class: 'ss-empty-body', text: body }),
  ])
  if (action) node.append(action)
  return node
}
