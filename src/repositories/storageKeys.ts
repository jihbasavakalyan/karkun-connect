/** Central registry of persistence keys — stores must not reference these directly. */

export const STORAGE_KEYS = {
  ruknMaster: 'karkun-connect.rukn-master',
  karkunRegistry: 'karkun-connect.karkun-registry',
  karkunNextId: 'karkun-connect.karkun.next-id',
  migrationVersion: 'karkun-connect.migration.version',
  assignments: 'karkun-connect.assignments',
  assignmentSequence: 'karkun-connect.assignments.sequence',
  activityLog: 'karkun-connect.activity-log',
  annexure1: 'karkun-connect.annexure1',
  followUps: 'karkun-connect.followups',
  guidance: 'karkun-connect.guidance',
  communication: 'karkun-connect.communication',
  baitulMaal: 'karkun-connect.baitul-maal',
  ijtema: 'karkun-connect.ijtema',
  jihPortal: 'karkun-connect.jih-portal',
  broadcastLists: 'karkun-connect.broadcast-lists',
  migrationBackups: 'karkun-connect.migration.backups',
  migrationBackup: (id: string) => `karkun-connect.migration.backup.${id}`,
} as const
