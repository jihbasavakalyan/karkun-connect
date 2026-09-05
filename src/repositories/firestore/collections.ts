/** Firestore collection and document paths (M8). */

export const FIRESTORE_COLLECTIONS = {
  campaigns: 'campaigns',
  rukns: 'rukns',
  karkuns: 'karkuns',
  connections: 'connections',
  executions: 'executions',
  communications: 'communications',
  compliance: 'compliance',
  settings: 'settings',
  activityLogs: 'activityLogs',
  followUps: 'followUps',
  /** KC-0058 — append-only connection lifecycle history */
  connectionLedger: 'connectionLedger',
  /** TD-04 / KC-032 P1 — durable assignment review requests (one doc per review) */
  assignmentReviews: 'assignmentReviews',
  /** Phase 1 — Meqati Mansooba planning root (Admin-owned) */
  meqatiMansoobas: 'meqatiMansoobas',
  /** Phase 1 — Objectives under a Mansooba (Admin-owned) */
  objectives: 'objectives',
  /** شعبہ under Meqati Mansooba (Admin-owned). Not `units`. */
  shobahs: 'shobahs',
  /** Legacy Unit / Scope — not a planning layer; retained for Work/Responsibility FKs */
  units: 'units',
  /** Phase 2 — Local Programme under a Campaign (Admin-owned) */
  localProgrammes: 'localProgrammes',
  /** Phase 3 — Occurrence under a Local Programme (Admin-owned; generation later) */
  occurrences: 'occurrences',
  /** Phase 4 — Responsibility (Admin-owned writes; Rukn read-own) */
  responsibilities: 'responsibilities',
  /** Phase 4 — Work (operational record; Admin administers; Rukn acts in context) */
  work: 'work',
  /** Bounded training gathering registrations — Admin SDK writes; Admin read. */
  trainingRegistrations: 'trainingRegistrations',
  /** Increment A — Rukn ↔ Muttafiq relationship (not campaign connections). */
  muttafiqRelationships: 'muttafiqRelationships',
} as const

export const FIRESTORE_DOCS = {
  karkunCounter: 'karkunCounter',
  /** A Rukn AR## allocator — Admin-only; never reused. */
  aRuknCounter: 'aRuknCounter',
  connectionMeta: 'connectionMeta',
  migrationVersion: 'migrationVersion',
  backupIndex: 'backupIndex',
  communicationState: 'state',
  guidanceState: 'guidance',
  jihPortalState: 'jihPortal',
  karkunRequests: 'karkunRequests',
  /** BATCH-06A — Rukn → Admin one-way internal messages (Admin Inbox). */
  ruknAdminMessages: 'ruknAdminMessages',
  /** Tarbiyati Ijtema operational flags — existing settings collection, not a new SoT. */
  trainingRegistration: 'trainingRegistration',
} as const

export type FirestoreDocumentMeta = {
  _updatedAt: string
  _revision: number
}

export function complianceBaitulMaalDocId(karkunId: string, monthKey: string): string {
  return `baitulMaal_${karkunId}_${monthKey}`
}

export function complianceIjtemaDocId(karkunId: string, weekEndingDate: string): string {
  return `ijtema_${karkunId}_${weekEndingDate}`
}

/** KC-0107 — Weekly Ijtema event document. */
export function complianceWeeklyIjtemaEventDocId(eventId: string): string {
  return `weeklyIjtemaEvent_${eventId}`
}

/** KC-0107 — Rukn submission for a Weekly Ijtema event. */
export function complianceWeeklyIjtemaSubmissionDocId(eventId: string, ruknId: string): string {
  return `weeklyIjtemaSubmission_${eventId}_${ruknId}`
}

/** KC-0108 — Monthly Baitul Maal cycle document. */
export function complianceMonthlyBaitulMaalCycleDocId(cycleId: string): string {
  return `monthlyBaitulMaalCycle_${cycleId}`
}

/** KC-0108 — Rukn submission for a Monthly Baitul Maal cycle. */
export function complianceMonthlyBaitulMaalSubmissionDocId(
  cycleId: string,
  ruknId: string,
): string {
  return `monthlyBaitulMaalSubmission_${cycleId}_${ruknId}`
}

export function settingsBackupDocId(backupId: string): string {
  return `backup_${backupId}`
}

export function settingsBroadcastDocId(listId: string): string {
  return `broadcast_${listId}`
}

/** Phase 6 — per-user notification preferences (settings collection; not a new SoT). */
export function settingsNotificationPreferencesDocId(userId: string): string {
  return `notificationPreferences_${userId.trim()}`
}

export function executionAnnexureDocId(formId: string): string {
  return `annexure_${formId}`
}

/**
 * TD-04 — pending-lock doc id for one Pending review per karkun.
 * Stored in `assignmentReviews` alongside review docs (`_docType: 'pendingLock'`).
 */
export function assignmentReviewPendingLockDocId(karkunId: string): string {
  return `pending_${karkunId}`
}
