/**
 * KC-0118 — Abstract delivery channels (Phase 1).
 * WhatsApp: reuses existing wa.me helper (not Business API).
 * SMS: architecture stub only.
 */

import { launchWhatsAppWebMessage } from '@/lib/communication/whatsappWebLaunch'
import type {
  ContextAwareDeliveryPort,
  ContextAwareDeliveryRequest,
  ContextAwareDeliveryResult,
} from './types'

/** Phase 1 WhatsApp adapter — opens WhatsApp Web / wa.me; no Business API. */
export const whatsAppWebDeliveryPort: ContextAwareDeliveryPort = {
  async deliver(request: ContextAwareDeliveryRequest): Promise<ContextAwareDeliveryResult> {
    if (request.channel !== 'whatsapp') {
      return {
        ok: false,
        status: 'unsupported',
        detail: 'This adapter only supports WhatsApp.',
      }
    }
    if (request.recipients.length === 0) {
      return {
        ok: true,
        status: 'prepared',
        detail:
          'Message prepared. Add or resolve recipients on the operational screen, then Notify again to deliver.',
        launchedCount: 0,
      }
    }

    // Cap auto-launches to avoid popup storms; remaining stay prepared.
    const launchTargets = request.recipients.slice(0, 5)
    let launchedCount = 0
    const failures: string[] = []
    for (const recipient of launchTargets) {
      const result = launchWhatsAppWebMessage(recipient, request.message)
      if (result.launched) {
        launchedCount += 1
      } else {
        failures.push(result.reason ?? recipient.name)
      }
    }

    if (launchedCount === 0) {
      return {
        ok: false,
        status: 'failed',
        detail: failures[0] ?? 'WhatsApp could not be opened.',
        launchedCount: 0,
      }
    }

    const remaining = request.recipients.length - launchTargets.length
    const extra =
      remaining > 0
        ? ` ${remaining} additional recipients remain — notify again or send in smaller groups.`
        : ''

    return {
      ok: true,
      status: 'launched',
      detail:
        (launchedCount === 1
          ? 'WhatsApp opened with the prepared message.'
          : `WhatsApp opened for ${launchedCount} recipients.`) + extra,
      launchedCount,
    }
  },
}

/** Phase 1 SMS stub — ready for gateway plug-in later. */
export const smsStubDeliveryPort: ContextAwareDeliveryPort = {
  async deliver(request: ContextAwareDeliveryRequest): Promise<ContextAwareDeliveryResult> {
    if (request.channel !== 'sms') {
      return {
        ok: false,
        status: 'unsupported',
        detail: 'This adapter only supports SMS.',
      }
    }
    return {
      ok: true,
      status: 'prepared',
      detail:
        'SMS gateway is not connected in Phase 1. Message is prepared for a future SMS adapter.',
      launchedCount: 0,
    }
  },
}

export function getDeliveryPort(channel: ContextAwareDeliveryRequest['channel']): ContextAwareDeliveryPort {
  return channel === 'sms' ? smsStubDeliveryPort : whatsAppWebDeliveryPort
}
