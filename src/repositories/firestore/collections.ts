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
} as const

export const FIRESTORE_DOCS = {
  karkunCounter: 'karkunCounter',
  connectionMeta: 'connectionMeta',
  migrationVersion: 'migrationVersion',
  backupIndex: 'backupIndex',
  communicationState: 'state',
  guidanceState: 'guidance',
  jihPortalState: 'jihPortal',
  karkunRequests: 'karkunRequests',
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

export function executionAnnexureDocId(formId: string): string {
  return `annexure_${formId}`
}
