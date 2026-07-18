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

export function settingsBackupDocId(backupId: string): string {
  return `backup_${backupId}`
}

export function settingsBroadcastDocId(listId: string): string {
  return `broadcast_${listId}`
}

export function executionAnnexureDocId(formId: string): string {
  return `annexure_${formId}`
}
