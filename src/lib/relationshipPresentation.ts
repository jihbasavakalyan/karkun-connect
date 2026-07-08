import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import { getLatestSubmissionForKarkun } from '@/stores/annexure1Store'

export function matchesKarkunRegistrySearch(
  karkun: KarkunRegistryRecord,
  query: string,
): boolean {
  const term = query.trim().toLowerCase()
  if (!term) {
    return true
  }

  const haystack = [
    karkun.name,
    karkun.mobile,
    karkun.whatsapp ?? '',
    karkun.fatherHusbandName ?? '',
    karkun.place,
    karkun.area,
    karkun.id,
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(term)
}

export function formatLastVisitLabel(karkunId: string): string {
  const latest = getLatestSubmissionForKarkun(karkunId)
  if (!latest) {
    return 'No visit recorded yet'
  }
  if (latest.visitConducted === 'no') {
    return `Visit attempted on ${latest.visitDate}`
  }
  return `Last visit on ${latest.visitDate}`
}

export function humanizeAvailableKarkunStatus(): string {
  return 'This Karkun is ready to be connected.'
}

export function humanizeAvailableKarkunStatusShort(): string {
  return 'Ready to connect'
}

export function humanizeDisconnectedKarkunStatus(): string {
  return 'No active Rukn is currently guiding this Karkun.'
}

export function humanizeConnectionReleased(): string {
  return 'Connection released successfully.'
}

export function humanizeConnectionConfirmed(assignmentNumber?: string): string {
  if (assignmentNumber) {
    return `Connected successfully. Connection number ${assignmentNumber}.`
  }
  return 'Connected successfully.'
}

export function humanizeVisitPending(karkunName: string): string {
  return `${karkunName} is waiting for your visit.`
}

export function fatherHusbandLabel(gender: KarkunRegistryRecord['gender']): string {
  return gender === 'Female' ? 'Husband' : 'Father'
}
