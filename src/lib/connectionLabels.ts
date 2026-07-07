import type { KarkunAssignmentPoolStatus } from '@/types/karkun-registry.types'

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
      return 'Connected'
    case 'Available':
      return 'Available'
    case 'Unassigned':
      return 'Not Connected'
    case 'Suspended':
      return 'Suspended'
    default:
      return status ? String(status) : 'Not Connected'
  }
}
