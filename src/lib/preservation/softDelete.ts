/**
 * KC-0058 — Soft-delete / archive helpers (no hard delete).
 */

import type { RecoveryMetadata } from '@/types/preservation.types'

export function buildArchivePatch(
  archivedBy: string,
  at = new Date().toISOString(),
): Pick<RecoveryMetadata, 'archivedAt' | 'archivedBy'> & { isArchived: true } {
  return {
    isArchived: true,
    archivedAt: at,
    archivedBy: archivedBy.trim() || 'Administrator',
  }
}

export function buildRestorePatch(
  restoredBy: string,
  at = new Date().toISOString(),
): Pick<RecoveryMetadata, 'restoredAt' | 'restoredBy'> & {
  isArchived: false
  archivedAt: undefined
  archivedBy: undefined
} {
  return {
    isArchived: false,
    archivedAt: undefined,
    archivedBy: undefined,
    restoredAt: at,
    restoredBy: restoredBy.trim() || 'Administrator',
  }
}

export function bumpVersion(current?: number): number {
  const n = typeof current === 'number' && Number.isFinite(current) ? current : 0
  return n + 1
}
