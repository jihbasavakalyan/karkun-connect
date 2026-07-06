import type { PeopleAuditAction, PeopleAuditEntry, PersonKind } from '@/types/people.types'

const auditLog: PeopleAuditEntry[] = []

type AuditInput = {
  personKind: PersonKind
  personId: string
  personName: string
  action: PeopleAuditAction
  field?: string
  previousValue?: string
  newValue?: string
  updatedBy?: string
}

export function logPeopleAudit(input: AuditInput): PeopleAuditEntry {
  const entry: PeopleAuditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    personKind: input.personKind,
    personId: input.personId,
    personName: input.personName,
    action: input.action,
    field: input.field,
    previousValue: input.previousValue,
    newValue: input.newValue,
    updatedBy: input.updatedBy ?? 'Administrator',
    timestamp: new Date().toISOString(),
  }

  auditLog.unshift(entry)
  return entry
}

export function getPeopleAuditLog(): PeopleAuditEntry[] {
  return [...auditLog]
}

export function getAuditLogForPerson(personKind: PersonKind, personId: string): PeopleAuditEntry[] {
  return auditLog.filter((entry) => entry.personKind === personKind && entry.personId === personId)
}
