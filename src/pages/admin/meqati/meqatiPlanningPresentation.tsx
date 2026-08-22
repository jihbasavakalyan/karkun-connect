/**
 * Meqati Planning presentation — hierarchy unchanged:
 * میقاتی منصوبہ → شعبہ → اہداف → سرگرمی → ذمہ دار → Schedule → Remarks / Report
 * Read-only layout helpers. Persistence stays on AdminPlanningPage.
 */

import type { LocalProgramme, LocalProgrammeStatus } from '@/types/localProgramme.types'
import type { PlanningObjective, Shobah } from '@/types/planning.types'
import { formatProgrammeScheduleLabel } from '@/lib/planning/programmeSchedule'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

const PROGRAMME_STATUS_URDU: Record<LocalProgrammeStatus, string> = {
  draft: 'مسودہ',
  active: 'فعال',
  archived: 'محفوظ',
}

export function formatActivityStatus(status: LocalProgrammeStatus): string {
  return PROGRAMME_STATUS_URDU[status] ?? status
}

export function isMappedActivity(row: LocalProgramme): boolean {
  return Boolean(row.objectiveId?.trim())
}

export type ShobahOverviewItem = {
  shobah: Shobah
  objectiveCount: number
  activityCount: number
  mappedCount: number
  unmappedCount: number
}

export function buildShobahOverviewItems(
  shobahs: readonly Shobah[],
  objectives: readonly PlanningObjective[],
  programmes: readonly LocalProgramme[],
): ShobahOverviewItem[] {
  return shobahs.map((shobah) => {
    const objectiveCount = objectives.filter((row) => row.shobahId === shobah.id).length
    const activities = programmes.filter((row) => row.shobahId === shobah.id)
    const mappedCount = activities.filter(isMappedActivity).length
    return {
      shobah,
      objectiveCount,
      activityCount: activities.length,
      mappedCount,
      unmappedCount: activities.length - mappedCount,
    }
  })
}

type CompactActivityListProps = {
  rows: readonly LocalProgramme[]
  ruknNameById: ReadonlyMap<string, string>
  onOpen: (row: LocalProgramme) => void
  showUnmappedObjective?: boolean
}

export function CompactActivityList({
  rows,
  ruknNameById,
  onOpen,
  showUnmappedObjective = false,
}: CompactActivityListProps) {
  if (rows.length === 0) return null

  return (
    <>
      <div className="hidden md:block overflow-x-hidden">
        <table className="w-full text-start text-sm">
          <thead>
            <tr className="text-xs text-secondary">
              <th className="pb-2 font-medium">سرگرمی</th>
              {showUnmappedObjective ? <th className="pb-2 font-medium">ہدف</th> : null}
              <th className="pb-2 font-medium">ذمہ دار</th>
              <th className="pb-2 font-medium">نظام الاوقات</th>
              <th className="pb-2 font-medium">حالت</th>
              <th className="pb-2 font-medium"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-transparent align-top">
                <td className="py-2 pe-3 font-medium text-text-heading whitespace-normal break-words">
                  {row.name}
                </td>
                {showUnmappedObjective ? (
                  <td className="py-2 pe-3 text-secondary whitespace-nowrap">غیر متعین</td>
                ) : null}
                <td className="py-2 pe-3 text-secondary whitespace-normal break-words">
                  {row.responsibleRuknId
                    ? (ruknNameById.get(row.responsibleRuknId) ?? '—')
                    : '—'}
                </td>
                <td className="py-2 pe-3 text-secondary whitespace-normal break-words">
                  {formatProgrammeScheduleLabel(row.frequency)}
                </td>
                <td className="py-2 pe-3 text-secondary">{formatActivityStatus(row.status)}</td>
                <td className="py-2 text-end">
                  <SecondaryButton type="button" onClick={() => onOpen(row)}>
                    تفصیل
                  </SecondaryButton>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="py-2">
            <p className="font-medium text-text-heading whitespace-normal break-words">{row.name}</p>
            {showUnmappedObjective ? (
              <p className="mt-1 text-xs text-secondary">ہدف: غیر متعین</p>
            ) : null}
            <p className="mt-1 text-xs text-secondary">
              ذمہ دار:{' '}
              {row.responsibleRuknId ? (ruknNameById.get(row.responsibleRuknId) ?? '—') : '—'}
            </p>
            <p className="mt-1 text-xs text-secondary">
              نظام الاوقات: {formatProgrammeScheduleLabel(row.frequency)}
            </p>
            <p className="mt-1 text-xs text-secondary">حالت: {formatActivityStatus(row.status)}</p>
            <div className="mt-2">
              <SecondaryButton type="button" onClick={() => onOpen(row)}>
                تفصیل
              </SecondaryButton>
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

type ShobahTileProps = {
  item: ShobahOverviewItem
  onOpen: (id: string) => void
}

export function ShobahTile({ item, onOpen }: ShobahTileProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(item.shobah.id)}
      className="w-full rounded-xl bg-surface px-4 py-3 text-start shadow-card transition hover:bg-surface-muted"
    >
      <p className="font-semibold text-text-heading">{item.shobah.name}</p>
      <p className="mt-2 text-xs text-secondary">
        {item.objectiveCount} اہداف · {item.activityCount} سرگرمیاں
      </p>
      <p className="mt-1 text-xs text-secondary">
        {item.mappedCount} مربوط · {item.unmappedCount} بغیر ہدف
      </p>
    </button>
  )
}
