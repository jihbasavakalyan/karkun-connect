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
import type { ProgrammeFrequency, ProgrammeKind } from '@/types/localProgramme.types'

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

function formatSpecifiedSchedule(frequency: ProgrammeFrequency | undefined): string | null {
  if (!frequency) return null
  if (frequency.cadence === 'weekly') return 'ہفتہ وار'
  if (frequency.cadence === 'monthly') return 'ماہانہ'
  if (frequency.cadence === 'yearly') return 'سالانہ'
  if (frequency.cadence === 'once') return 'یک بار'
  return frequency.note?.trim() ? `دیگر: ${frequency.note}` : 'دیگر'
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

    const objective = unwrapRepository(
      repos.objective.getById(programme.objectiveId),
      undefined,
    )
    const shobah = objective
      ? unwrapRepository(repos.shobah.getById(objective.shobahId), undefined)
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
