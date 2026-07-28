import type { KarkunAssignmentPoolStatus } from '@/types/karkun-registry.types'
import { UI_LABELS } from '@/lib/uiTerminology'

/**
 * User-facing Connection language for the internal assignment/pool status values.
 * Internal enum values (`Assigned`, `Available`, etc.) are unchanged — only the
 * displayed label is mapped to the Campaign Operating System vocabulary.
 */
export function getConnectionStatusLabel(
  status: KarkunAssignmentPoolStatus | string | undefined | null,
): string {
  switch (status) {
    case 'Assigned':
      return UI_LABELS.connected
    case 'Available':
    case 'Unassigned':
      return UI_LABELS.notConnected
    case 'Suspended':
      return 'Suspended'
    default:
      return status ? String(status) : UI_LABELS.notConnected
  }
}
