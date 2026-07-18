/**
 * Karkun profile completeness helpers (presentation + quality metrics).
 * Mandatory fields are collected gradually during Rukn interaction.
 */

import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getCanonicalConnectedAssignments } from '@/lib/connections/getConnectedKarkunsForRukn'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

export type ProfileMissingField = {
  key: 'fatherHusbandName' | 'address' | 'area' | 'place' | 'gender'
  label: string
}

function isBlank(value: string | undefined | null): boolean {
  return !value || !value.trim()
}

/** Mandatory enrichment fields for an actively connected Karkun. */
export function getMissingMandatoryProfileFields(
  karkun: KarkunRegistryRecord,
): ProfileMissingField[] {
  const missing: ProfileMissingField[] = []

  if (isBlank(karkun.fatherHusbandName)) {
    missing.push({
      key: 'fatherHusbandName',
      label: karkun.gender === 'Female' ? 'شوہر کا نام' : 'والد کا نام',
    })
  }

  if (isBlank(karkun.address)) {
    missing.push({ key: 'address', label: 'پتہ' })
  }

  if (isBlank(karkun.area)) {
    missing.push({ key: 'area', label: 'علاقہ' })
  }

  if (isBlank(karkun.place)) {
    missing.push({ key: 'place', label: 'مقام' })
  }

  if (isBlank(karkun.gender as unknown as string)) {
    missing.push({ key: 'gender', label: 'جنس' })
  }

  return missing
}

export function isKarkunProfileComplete(karkun: KarkunRegistryRecord): boolean {
  return getMissingMandatoryProfileFields(karkun).length === 0
}

export type ProfileCompletionMetrics = {
  totalConnected: number
  complete: number
  incomplete: number
}

/** Profile quality across actively connected Karkuns (campaign scope). */
export function getConnectedProfileCompletionMetrics(): ProfileCompletionMetrics {
  const connectedIds = getCanonicalConnectedAssignments().map((record) => record.karkunId)

  let complete = 0
  let incomplete = 0

  for (const karkunId of connectedIds) {
    const karkun = getKarkunById(karkunId)
    if (!karkun || karkun.isArchived) continue
    if (isKarkunProfileComplete(karkun)) {
      complete += 1
    } else {
      incomplete += 1
    }
  }

  return {
    totalConnected: complete + incomplete,
    complete,
    incomplete,
  }
}
