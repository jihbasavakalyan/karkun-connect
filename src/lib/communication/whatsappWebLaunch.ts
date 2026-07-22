/**
 * KC-0077.2.2B — WhatsApp Web launch for personalized bulk delivery.
 * Reuses buildWhatsAppLink; does not modify sendIndividualMessage or mail merge.
 */

import type { MessageRecipient } from '@/types/communication'
import { buildWhatsAppLink } from '@/utils/personContactLinks'

export type WhatsAppLaunchResult = {
  launched: boolean
  url: string | null
  reason?: string
}

/** Resolve phone for wa.me — prefers explicit WhatsApp number. */
export function resolveRecipientWhatsAppNumber(recipient: MessageRecipient): string {
  return recipient.whatsapp?.trim() ? recipient.whatsapp : recipient.mobile
}

/**
 * Pre-open blank tabs during the user click handler so async merge can navigate them later.
 * Browsers block window.open after the first await without this gesture-linked step.
 */
export function prepareWhatsAppLaunchWindows(count: number): (Window | null)[] {
  if (typeof window === 'undefined' || count <= 0) {
    return []
  }
  const windows: (Window | null)[] = []
  for (let index = 0; index < count; index++) {
    windows.push(window.open('about:blank', '_blank', 'noopener,noreferrer'))
  }
  return windows
}

/** Close a pre-opened tab when merge/send is skipped for that recipient. */
export function closeWhatsAppLaunchWindow(launchWindow: Window | null | undefined): void {
  try {
    launchWindow?.close()
  } catch {
    // Ignore cross-origin close failures.
  }
}

/**
 * Navigate a pre-opened tab (or open a new one) to WhatsApp Web with the merged message.
 */
export function launchWhatsAppWebMessage(
  recipient: MessageRecipient,
  message: string,
  launchWindow?: Window | null,
): WhatsAppLaunchResult {
  const phone = resolveRecipientWhatsAppNumber(recipient)
  const url = buildWhatsAppLink(phone, message)
  if (!url) {
    closeWhatsAppLaunchWindow(launchWindow)
    return { launched: false, url: null, reason: 'Invalid phone number' }
  }

  if (typeof window === 'undefined') {
    return { launched: false, url, reason: 'WhatsApp launch unavailable in this environment' }
  }

  try {
    if (launchWindow && !launchWindow.closed) {
      launchWindow.location.href = url
      launchWindow.focus()
      return { launched: true, url }
    }

    const opened = window.open(url, '_blank', 'noopener,noreferrer')
    if (!opened) {
      return {
        launched: false,
        url,
        reason: 'Popup blocked — allow pop-ups for this site and try again',
      }
    }
    return { launched: true, url }
  } catch (error) {
    closeWhatsAppLaunchWindow(launchWindow)
    return {
      launched: false,
      url,
      reason: error instanceof Error ? error.message : 'WhatsApp launch failed',
    }
  }
}
