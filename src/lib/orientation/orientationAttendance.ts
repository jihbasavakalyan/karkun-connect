/**
 * Phase 5 — Orientation attendance (TASK-040).
 * Authority: docs/architecture/kc-phase5-activity-tracking-arch009-gate.md
 *
 * Orientation is already supported as a Karkun journey signal
 * (`hasOrientationSignal`: 2+ submitted visits or a non-cancelled commitment).
 * That remains the source of truth.
 *
 * Do not create a participation entity, universal attendance, or event register
 * for orientation. Other Local Programme kinds must not receive attendance tracking.
 */

import { hasOrientationSignal } from '@/lib/guidance/journeyEngine'
import type { ProgrammeKind } from '@/types/localProgramme.types'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

export type ProgrammeAttendanceMode = 'weekly_ijtema_event' | 'orientation_journey' | 'none'

/**
 * Event-style attendance exists only for Weekly Ijtema.
 * Orientation stays on the existing journey SoT and is not a programme event register.
 */
export function programmeAttendanceMode(kind: ProgrammeKind): ProgrammeAttendanceMode {
  if (kind === 'weekly_ijtema') return 'weekly_ijtema_event'
  return 'none'
}

export function programmeRequiresEventAttendance(kind: ProgrammeKind): boolean {
  return programmeAttendanceMode(kind) === 'weekly_ijtema_event'
}

/** Existing orientation attendance SoT — journey signal, not a new collection. */
export function resolveOrientationAttendance(karkun: KarkunRegistryRecord): boolean {
  return hasOrientationSignal(karkun)
}
