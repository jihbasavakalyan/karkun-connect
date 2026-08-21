/**
 * Rukn Meqati سرگرمی context — derived from LocalProgramme.responsibleRuknId.
 * Read-only. Does not create Work or Standing Responsibility.
 */

import { ROUTES } from '@/constants/routes'
import { resolveMeqatiYear } from '@/lib/dashboard/meqatiYear'
import { canReadLocalProgrammeAsResponsible } from '@/lib/planning/localProgrammePermissions'
import {
  resolveActivityYearStatus,
  type ActivityYearStatus,
} from '@/lib/planning/activityYearStatus'
import { unwrapRepository } from '@/repositories/errors'
import { getRepositories } from '@/repositories/provider'
import type { LocalProgramme, ProgrammeFrequency } from '@/types/localProgramme.types'
import { listProgrammeFrequencies } from '@/lib/planning/programmeSchedule'

export type RuknMeqatiActivityAction = {
  href: string
  label: string
}

export type RuknMeqatiActivityItem = {
  id: string
  name: string
  shobahName: string
  objectiveTitle: string
  scheduleLabel: string | null
  yearKey: string
  yearStatusLabel: string | null
  action: RuknMeqatiActivityAction | null
}

const YEAR_STATUS_LABEL: Record<ActivityYearStatus, string> = {
  completed: 'مکمل',
  in_progress: 'جاری',
  remaining: 'باقی',
}

function formatOneRuknCadence(frequency: ProgrammeFrequency): string {
  switch (frequency.cadence) {
    case 'weekly':
      return 'ہفتہ وار'
    case 'monthly':
      return 'ماہانہ'
    case 'quarterly':
      return 'سہ ماہی'
    case 'yearly':
      return 'سالانہ'
    case 'once':
      return 'یک بار'
    case 'custom':
      return frequency.note?.trim() ? `دیگر: ${frequency.note}` : 'دیگر'
    default:
      return 'دیگر'
  }
}

function formatSpecifiedSchedule(
  frequency: LocalProgramme['frequency'],
): string | null {
  const patterns = listProgrammeFrequencies(frequency)
  if (patterns.length === 0) return null
  return patterns.map(formatOneRuknCadence).join(' + ')
}

/**
 * Existing operational surfaces only. `other` has no Rukn ops SoT here.
 */
export function operationalActionForProgrammeKind(
  kind: ProgrammeKind,
): RuknMeqatiActivityAction | null {
  if (kind === 'weekly_ijtema') {
    return { href: ROUTES.RUKN_WEEKLY_IJTEMA, label: 'ہفتہ وار اجتماع' }
  }
  if (kind === 'monthly_baitul_maal') {
    return { href: ROUTES.RUKN_MONTHLY_BAITUL_MAAL, label: 'ماہانہ بیت المال' }
  }
  if (kind === 'campaign_execution') {
    return { href: ROUTES.RUKN, label: 'مہم کی تکمیل' }
  }
  if (kind === 'follow_up') {
    return { href: ROUTES.RUKN_MY_KARKUN, label: 'کارکنان کی پیروی' }
  }
  return null
}

export function buildRuknMeqatiActivities(
  ruknId: string,
  asOf?: Date | string,
): RuknMeqatiActivityItem[] {
  const id = ruknId.trim()
  if (!id) return []

  const actor = { role: 'rukn' as const, ruknId: id }
  const repos = getRepositories()
  const programmes = unwrapRepository(
    repos.localProgramme.listByResponsibleRuknId(id),
    [],
  )
  const year = resolveMeqatiYear(asOf)

  const items: RuknMeqatiActivityItem[] = []
  for (const programme of programmes) {
    if (!canReadLocalProgrammeAsResponsible(actor, programme)) continue

    const objectiveId = programme.objectiveId?.trim()
    const objective = objectiveId
      ? unwrapRepository(repos.objective.getById(objectiveId), undefined)
      : undefined
    const shobahId = objective?.shobahId?.trim() || programme.shobahId?.trim()
    const shobah = shobahId
      ? unwrapRepository(repos.shobah.getById(shobahId), undefined)
      : undefined
    const yearStatus = resolveActivityYearStatus(programme.yearStatuses, year.key)

    items.push({
      id: programme.id,
      name: programme.name.trim() || programme.id,
      shobahName: shobah?.name?.trim() ?? '',
      objectiveTitle: objective?.title?.trim() ?? '',
      scheduleLabel: formatSpecifiedSchedule(programme.frequency),
      yearKey: year.key,
      yearStatusLabel: yearStatus ? YEAR_STATUS_LABEL[yearStatus] : null,
      action: operationalActionForProgrammeKind(programme.kind),
    })
  }

  return items.sort((a, b) => a.name.localeCompare(b.name, 'ur'))
}
