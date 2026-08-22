/**
 * Meqati Planning presentation — hierarchy unchanged:
 * میقاتی منصوبہ → شعبہ → اہداف → سرگرمی → ذمہ دار → Schedule → Remarks / Report
 * Presentation only. Persistence stays on AdminPlanningPage.
 */

import type { ReactNode } from 'react'
import type { LocalProgramme, LocalProgrammeStatus } from '@/types/localProgramme.types'
import type { PlanningObjective, Shobah } from '@/types/planning.types'
import { formatProgrammeScheduleLabel } from '@/lib/planning/programmeSchedule'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

const PROGRAMME_STATUS_URDU: Record<LocalProgrammeStatus, string> = {
  draft: 'مسودہ',
  active: 'فعال',
  archived: 'محفوظ',
}

const activityNameClass =
  'font-medium text-text-heading break-words [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] overflow-hidden'

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
  showUnmappedState?: boolean
}

export function CompactActivityList({
  rows,
  ruknNameById,
  onOpen,
  showUnmappedState = false,
}: CompactActivityListProps) {
  if (rows.length === 0) return null

  return (
    <>
      <div className="hidden md:block overflow-x-hidden">
        <table className="w-full text-start text-sm">
          <thead>
            <tr className="text-xs text-secondary">
              <th className="pb-2 ps-0 font-medium">سرگرمی</th>
              <th className="pb-2 font-medium">ذمہ دار</th>
              <th className="pb-2 font-medium">نظام الاوقات</th>
              <th className="pb-2 font-medium">حالت</th>
              <th className="pb-2 pe-0 font-medium">تفصیل</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="align-top">
                <td className="max-w-md py-2.5 pe-3">
                  <p className={activityNameClass}>{row.name}</p>
                  {showUnmappedState ? (
                    <p className="mt-1 text-xs text-secondary">غیر متعین</p>
                  ) : null}
                </td>
                <td className="py-2.5 pe-3 text-secondary whitespace-normal break-words">
                  {row.responsibleRuknId
                    ? (ruknNameById.get(row.responsibleRuknId) ?? '—')
                    : '—'}
                </td>
                <td className="py-2.5 pe-3 text-secondary whitespace-normal break-words">
                  {formatProgrammeScheduleLabel(row.frequency)}
                </td>
                <td className="py-2.5 pe-3 text-secondary">{formatActivityStatus(row.status)}</td>
                <td className="py-2.5 pe-0">
                  <button
                    type="button"
                    className="text-sm text-primary"
                    onClick={() => onOpen(row)}
                  >
                    تفصیل
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="md:hidden divide-y divide-transparent">
        {rows.map((row) => (
          <li key={row.id} className="py-3">
            <p className={activityNameClass}>{row.name}</p>
            {showUnmappedState ? (
              <p className="mt-1 text-xs text-secondary">غیر متعین</p>
            ) : null}
            <p className="mt-1 text-xs text-secondary">
              {row.responsibleRuknId ? (ruknNameById.get(row.responsibleRuknId) ?? '—') : '—'}
              {' · '}
              {formatProgrammeScheduleLabel(row.frequency)}
              {' · '}
              {formatActivityStatus(row.status)}
            </p>
            <button
              type="button"
              className="mt-2 text-sm text-primary"
              onClick={() => onOpen(row)}
            >
              تفصیل
            </button>
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
      className="w-full rounded-2xl bg-surface px-4 py-4 text-start shadow-card transition hover:bg-surface-muted"
    >
      <p className="text-base font-semibold text-text-heading">{item.shobah.name}</p>
      <p className="mt-2 text-sm text-secondary">
        {item.objectiveCount} اہداف · {item.activityCount} سرگرمیاں
      </p>
      <p className="mt-1 text-xs text-secondary">
        {item.mappedCount} مربوط · {item.unmappedCount} بغیر ہدف
      </p>
    </button>
  )
}

type ObjectiveRowProps = {
  index: number
  objective: PlanningObjective
  activityCount: number
  expanded: boolean
  onToggle: () => void
  onEdit: () => void
  children?: ReactNode
}

export function ObjectiveRow({
  index,
  objective,
  activityCount,
  expanded,
  onToggle,
  onEdit,
  children,
}: ObjectiveRowProps) {
  return (
    <li className="py-3">
      <div className="flex items-start gap-3">
        <button type="button" className="min-w-0 flex-1 text-start" onClick={onToggle}>
          <p className="text-xs text-secondary">{index}</p>
          <p className="mt-0.5 font-medium text-text-heading whitespace-normal break-words">
            {objective.title}
          </p>
          <p className="mt-1 text-xs text-secondary">
            {activityCount} سرگرمیاں · {activityCount} مربوط · 0 بغیر ہدف
          </p>
        </button>
        <SecondaryButton type="button" onClick={onEdit}>
          ترمیم
        </SecondaryButton>
      </div>
      {expanded ? <div className="mt-3">{children}</div> : null}
    </li>
  )
}
