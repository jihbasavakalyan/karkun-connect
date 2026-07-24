/**
 * Shared durability helpers for Firestore queued writes.
 * Re-exports / thin wrappers so modules do not reimplement await + error mapping.
 *
 * Policy: KC-ARCH-001 — docs/architecture/kc-arch-001-reliability-persistence.md
 * Cursor rule: .cursor/rules/kc-arch-001-reliability.mdc
 */

export {
  formatPersistFailureBanner,
  FRIENDLY_PERSIST_ERROR,
  FRIENDLY_PERSIST_OFFLINE_ERROR,
  FRIENDLY_PERSIST_PERMISSION_ERROR,
  toOperatorPersistError,
} from '@/lib/reliability/persistErrors'
