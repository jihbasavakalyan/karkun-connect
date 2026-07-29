/**
 * Module 18 — Accessibility helpers for Rafeeq conversation surfaces.
 */

export type RafeeqA11yLabels = {
  readonly drawerLabel: string
  readonly inputLabel: string
  readonly sendLabel: string
  readonly listeningLabel: string
  readonly thinkingLabel: string
  readonly speakingLabel: string
  readonly confirmLabel: string
  readonly cancelLabel: string
  readonly loadingLabel: string
  readonly emptyLabel: string
  readonly errorLabel: string
  readonly highContrastClass: string
}

export const RAFEEQ_A11Y: RafeeqA11yLabels = Object.freeze({
  drawerLabel: 'Digital Rafeeq conversational assistant',
  inputLabel: 'Message Digital Rafeeq',
  sendLabel: 'Send message',
  listeningLabel: 'Listening',
  thinkingLabel: 'Thinking',
  speakingLabel: 'Speaking',
  confirmLabel: 'Confirm action',
  cancelLabel: 'Cancel action',
  loadingLabel: 'Loading Digital Rafeeq response',
  emptyLabel: 'No conversation yet. Ask about visits, campaign, or search a name.',
  errorLabel: 'Something went wrong. You can retry the last request.',
  highContrastClass: 'dr-a11y-high-contrast',
})

export function focusableActionProps(label: string): {
  readonly role: 'button'
  readonly tabIndex: 0
  readonly 'aria-label': string
} {
  return {
    role: 'button',
    tabIndex: 0,
    'aria-label': label,
  }
}

export function liveRegionProps(
  polite: boolean,
): { readonly role: 'status' | 'alert'; readonly 'aria-live': 'polite' | 'assertive' } {
  return polite
    ? { role: 'status', 'aria-live': 'polite' }
    : { role: 'alert', 'aria-live': 'assertive' }
}
