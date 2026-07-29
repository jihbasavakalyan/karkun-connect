/**
 * Confirmation prompt contracts (KC-0131.8).
 * No user-facing text generation.
 */

import { createConfirmationPromptContract } from '../decisions'
import type { ConfirmationPromptContract, ConfirmationPromptOption } from '../decisions/models'

export type { ConfirmationPromptContract, ConfirmationPromptOption }

export const DEFAULT_CONFIRMATION_PROMPT_OPTIONS: readonly ConfirmationPromptOption[] = [
  { id: 'approve', labelKey: 'confirmation.option.approve', mapsTo: 'approve' },
  { id: 'deny', labelKey: 'confirmation.option.deny', mapsTo: 'deny' },
  { id: 'defer', labelKey: 'confirmation.option.defer', mapsTo: 'DEFERRED' },
]

export function createUserConfirmationPrompt(
  requestId: string,
  options?: {
    readonly timeoutMs?: number | null
  },
): ConfirmationPromptContract {
  return createConfirmationPromptContract({
    requestId,
    options: DEFAULT_CONFIRMATION_PROMPT_OPTIONS,
    timeoutMs: options?.timeoutMs ?? null,
    defaultAction: 'none',
  })
}
