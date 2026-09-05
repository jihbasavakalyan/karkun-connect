/**
 * Available-pool hydrate is separate from critical connection hydrate.
 * A denied/unindexed Available query must not freeze the Rukn shell or
 * invent a "0 connected" campaign state.
 */

let failed = false
let failureMessage: string | null = null

export function markAvailableKarkunPoolHydrateOk(): void {
  failed = false
  failureMessage = null
}

export function markAvailableKarkunPoolHydrateFailed(error: unknown): void {
  failed = true
  failureMessage =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'Unable to load the available Karkun list.'
}

export function isAvailableKarkunPoolHydrateFailed(): boolean {
  return failed
}

export function getAvailableKarkunPoolHydrateFailureMessage(): string | null {
  return failureMessage
}

/** Verify scripts only. */
export function resetAvailableKarkunPoolHydrateForTests(): void {
  failed = false
  failureMessage = null
}
