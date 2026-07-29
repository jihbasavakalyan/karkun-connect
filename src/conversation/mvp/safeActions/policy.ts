/**
 * Safe action vocabulary and confirmation policy (MVP v1.3).
 */

export type SafeActionKind =
  | 'CALL'
  | 'WHATSAPP'
  | 'REMINDER'
  | 'OPEN_PROFILE'
  | 'OPEN_CONTACT'
  | 'OPEN_ASSIGNMENT'
  | 'OPEN_ATTENDANCE'
  | 'OPEN_IJTEMA'
  | 'OPEN_CAMPAIGN'
  | 'OPEN_REPORTS'
  | 'CONFIRM'
  | 'CANCEL'

export type PendingSafeAction = {
  readonly kind: Exclude<SafeActionKind, 'CONFIRM' | 'CANCEL'>
  readonly personId: string | null
  readonly personName: string | null
  readonly route: string | null
  readonly label: string
  readonly summary: string
}

/** Communication / reminder require explicit confirm. Navigation opens are read-only. */
export function requiresExplicitConfirmation(kind: SafeActionKind): boolean {
  return kind === 'CALL' || kind === 'WHATSAPP' || kind === 'REMINDER'
}

export function isReadOnlyOpen(kind: SafeActionKind): boolean {
  return (
    kind === 'OPEN_PROFILE' ||
    kind === 'OPEN_CONTACT' ||
    kind === 'OPEN_ASSIGNMENT' ||
    kind === 'OPEN_ATTENDANCE' ||
    kind === 'OPEN_IJTEMA' ||
    kind === 'OPEN_CAMPAIGN' ||
    kind === 'OPEN_REPORTS'
  )
}
