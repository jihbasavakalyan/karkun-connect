/**
 * KC-0058 — Data preservation & recovery foundation types.
 */

export type SoftDeleteStatus = 'Active' | 'Archived'

export type RecoveryMetadata = {
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
  archivedAt?: string
  archivedBy?: string
  restoredAt?: string
  restoredBy?: string
  /** Monotonic document revision hint (optional). */
  version?: number
}

export type ArchiveTargetKind =
  | 'karkun'
  | 'rukn'
  | 'request'
  | 'assignment'
  | 'connection'
  | 'visit'

export type ArchiveResult =
  | { ok: true; id: string; kind: ArchiveTargetKind }
  | { ok: false; error: string }
