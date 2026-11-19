import { h } from '../dom'

export type OptionSheetChoice = {
  id: string
  label: string
  meta?: string
}

export function openOptionSheet(opts: {
  host: HTMLElement
  title: string
  options: OptionSheetChoice[]
  cancelLabel?: string
}): Promise<string | null> {
  return new Promise((resolve) => {
    const backdrop = h('div', {
      class: 'ss-pick-backdrop',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': opts.title,
    })
    const sheet = h('div', { class: 'ss-pick-sheet' }, [
      h('div', { class: 'ss-pick-title', text: opts.title }),
    ])
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      finish(null)
    }
    const finish = (value: string | null) => {
      window.removeEventListener('keydown', onKey, true)
      backdrop.remove()
      resolve(value)
    }
    for (const option of opts.options) {
      const button = h('button', {
        class: 'ss-pick-option',
        type: 'button',
        text: option.label,
      })
      if (option.meta) {
        button.append(h('div', { class: 'ss-row-sub', text: option.meta }))
      }
      button.addEventListener('click', () => finish(option.id))
      sheet.append(button)
    }
    const cancel = h('button', {
      class: 'ss-pick-option',
      type: 'button',
      text: opts.cancelLabel || 'Cancel',
    })
    cancel.addEventListener('click', () => finish(null))
    sheet.append(cancel)
    backdrop.append(sheet)
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) finish(null)
    })
    window.addEventListener('keydown', onKey, true)
    opts.host.append(backdrop)
  })
}

export function openPromptSheet(opts: {
  host: HTMLElement
  title: string
  placeholder?: string
  initialValue?: string
  confirmLabel?: string
  cancelLabel?: string
}): Promise<string | null> {
  return new Promise((resolve) => {
    const backdrop = h('div', {
      class: 'ss-pick-backdrop',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': opts.title,
    })
    const input = h('input', {
      class: 'ss-search',
      type: 'text',
      placeholder: opts.placeholder || '',
      value: opts.initialValue || '',
    }) as HTMLInputElement
    const cancel = h('button', {
      class: 'ss-btn ss-btn-secondary',
      type: 'button',
      text: opts.cancelLabel || 'Cancel',
    })
    const confirm = h('button', {
      class: 'ss-btn ss-btn-primary',
      type: 'button',
      text: opts.confirmLabel || 'Save',
    })
    const sheet = h('div', { class: 'ss-pick-sheet' }, [
      h('div', { class: 'ss-pick-title', text: opts.title }),
      input,
      h('div', { class: 'ss-pick-actions' }, [cancel, confirm]),
    ])
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        finish(null)
      } else if (event.key === 'Enter') {
        event.preventDefault()
        finish(input.value.trim() || null)
      }
    }
    const finish = (value: string | null) => {
      window.removeEventListener('keydown', onKey, true)
      backdrop.remove()
      resolve(value)
    }
    cancel.addEventListener('click', () => finish(null))
    confirm.addEventListener('click', () => finish(input.value.trim() || null))
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) finish(null)
    })
    window.addEventListener('keydown', onKey, true)
    backdrop.append(sheet)
    opts.host.append(backdrop)
    input.focus()
    input.select()
  })
}

export function openConfirmSheet(opts: {
  host: HTMLElement
  title: string
  confirmLabel?: string
  cancelLabel?: string
}): Promise<boolean> {
  return new Promise((resolve) => {
    const backdrop = h('div', {
      class: 'ss-pick-backdrop',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-label': opts.title,
    })
    const cancel = h('button', {
      class: 'ss-btn ss-btn-secondary',
      type: 'button',
      text: opts.cancelLabel || 'Cancel',
    })
    const confirm = h('button', {
      class: 'ss-btn ss-btn-primary',
      type: 'button',
      text: opts.confirmLabel || 'Confirm',
    })
    const sheet = h('div', { class: 'ss-pick-sheet' }, [
      h('div', { class: 'ss-pick-title', text: opts.title }),
      h('div', { class: 'ss-pick-actions' }, [cancel, confirm]),
    ])
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      finish(false)
    }
    const finish = (value: boolean) => {
      window.removeEventListener('keydown', onKey, true)
      backdrop.remove()
      resolve(value)
    }
    cancel.addEventListener('click', () => finish(false))
    confirm.addEventListener('click', () => finish(true))
    backdrop.addEventListener('click', (event) => {
      if (event.target === backdrop) finish(false)
    })
    window.addEventListener('keydown', onKey, true)
    backdrop.append(sheet)
    opts.host.append(backdrop)
  })
}
