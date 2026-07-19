/**
 * KC-0058 — Gate for repository hard-clear operations.
 *
 * Production Firestore clears are blocked unless explicitly allowed
 * (local tests / controlled maintenance only).
 */

let dangerousClearAllowed = false

export function allowDangerousRepositoryClear(allowed: boolean): void {
  dangerousClearAllowed = allowed
}

export function isDangerousRepositoryClearAllowed(): boolean {
  return dangerousClearAllowed
}

export const DANGEROUS_CLEAR_BLOCKED_MESSAGE =
  'KC-0058: permanent delete is blocked. Use archive/soft-delete instead.'
