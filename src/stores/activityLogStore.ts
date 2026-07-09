import type {
  ActivityLogEntry,
  ActivityLogSeverity,
  ActivityLogType,
} from '@/types/assignment'
import { getRepositories } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'

const activityLog: ActivityLogEntry[] = unwrapRepository(
  getRepositories().connection.loadActivityLog(),
  [],
)

type ActivityLogListener = () => void
const listeners = new Set<ActivityLogListener>()

function persistActivityLogStore(): void {
  getRepositories().connection.saveActivityLog(activityLog)
}

export function subscribeToActivityLog(listener: ActivityLogListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyActivityLogChange(): void {
  persistActivityLogStore()
  listeners.forEach((listener) => listener())
}

function severityForType(type: ActivityLogType): ActivityLogSeverity {
  if (type === 'replace') return 'IMPORTANT'
  if (type === 'remove') return 'WARNING'
  return 'INFO'
}

type LogActivityInput = {
  type: ActivityLogType
  message: string
  ruknId?: string
  karkunId?: string
  assignmentId?: string
  actor: string
  severity?: ActivityLogSeverity
}

export function logActivity(input: LogActivityInput): ActivityLogEntry {
  const entry: ActivityLogEntry = {
    id: `activity-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: input.type,
    severity: input.severity ?? severityForType(input.type),
    message: input.message,
    ruknId: input.ruknId,
    karkunId: input.karkunId,
    assignmentId: input.assignmentId,
    timestamp: new Date().toISOString(),
    actor: input.actor,
  }

  activityLog.unshift(entry)
  notifyActivityLogChange()
  return entry
}

export function getActivityLog(): ActivityLogEntry[] {
  return [...activityLog]
}

export function getRecentActivity(limit = 20): ActivityLogEntry[] {
  return activityLog.slice(0, limit)
}

export function reloadActivityLogStoreFromPersistence(): void {
  const loaded = unwrapRepository(getRepositories().connection.loadActivityLog(), [])
  activityLog.length = 0
  activityLog.push(...loaded)
  listeners.forEach((listener) => listener())
}

export function clearActivityLogStore(): void {
  activityLog.length = 0
  getRepositories().connection.clearActivityLog()
  notifyActivityLogChange()
}
