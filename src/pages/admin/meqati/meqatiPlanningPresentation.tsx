/**
 * Meqati Planning presentation — hierarchy unchanged:
 * میقاتی منصوبہ → شعبہ → اہداف → سرگرمی → ذمہ دار → Schedule → Remarks / Report
 * Presentation only. Persistence stays on AdminPlanningPage.
 */

import type { LocalProgramme, LocalProgrammeStatus } from '@/types/localProgramme.types'
import type { PlanningObjective, Shobah } from '@/types/planning.types'
import { formatProgrammeScheduleLabel } from '@/lib/planning/programmeSchedule'
import type { IconName } from '@/design-system/iconNames'
import { Icon } from '@/components/ui/Icon'

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

export function shobahHeadCode(shobah: Pick<Shobah, 'id' | 'sortOrder'>): string {
  const fromId = shobah.id.trim().toUpperCase()
  if (/^H\d{2}$/.test(fromId)) return fromId
  const n = shobah.sortOrder
  if (typeof n === 'number' && n >= 1 && n <= 99) {
    return `H${String(n).padStart(2, '0')}`
  }
  return fromId.slice(0, 3).toUpperCase() || 'H—'
}

export function objectiveDisplayNumber(objective: PlanningObjective, index: number): string {
  const match = objective.id.match(/O(\d+)/i)
  if (match) return match[1].replace(/^0+/, '') || match[1]
  if (typeof objective.sortOrder === 'number' && objective.sortOrder > 0) {
    return String(objective.sortOrder)
  }
  return String(index + 1)
}

export type ShobahVisual = {
  accent: string
  wash: string
  ink: string
  icon: IconName
}

const HEAD_VISUAL_BY_CODE: Record<string, ShobahVisual> = {
  H01: { accent: '#2d6a4f', wash: '#f0f7f3', ink: '#1b4332', icon: 'clipboard' },
  H02: { accent: '#3d5a80', wash: '#f2f5f9', ink: '#293241', icon: 'users' },
  H03: { accent: '#52796f', wash: '#f3f7f5', ink: '#354f52', icon: 'handshake' },
  H04: { accent: '#6d6875', wash: '#f6f5f7', ink: '#4a4458', icon: 'flag' },
  H05: { accent: '#457b9d', wash: '#f1f6f9', ink: '#1d3557', icon: 'megaphone' },
  H06: { accent: '#588157', wash: '#f3f7f2', ink: '#3a5a40', icon: 'file-text' },
  H07: { accent: '#7c6f57', wash: '#f7f5f1', ink: '#4a4238', icon: 'sprout' },
  H08: { accent: '#5c677d', wash: '#f4f5f8', ink: '#3d4454', icon: 'chart' },
  H09: { accent: '#6b705c', wash: '#f5f6f2', ink: '#414833', icon: 'home' },
}

const FALLBACK_VISUAL: ShobahVisual = {
  accent: '#4a6359',
  wash: '#f4f6f5',
  ink: '#2f3e37',
  icon: 'clipboard',
}

export function shobahVisual(shobah: Pick<Shobah, 'id' | 'sortOrder'>): ShobahVisual {
  return HEAD_VISUAL_BY_CODE[shobahHeadCode(shobah)] ?? FALLBACK_VISUAL
}

export function Chevron({ className = '' }: { className?: string }) {
  return (
    <span className={`text-lg leading-none text-secondary ${className}`} aria-hidden>
      ‹
    </span>
  )
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
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.id}>
          <article className="rounded-2xl bg-surface px-5 py-4 shadow-card">
            <p className={activityNameClass}>{row.name}</p>
            {showUnmappedState ? (
              <p className="mt-1 text-xs text-secondary">ہدف: غیر متعین</p>
            ) : null}
            <p className="mt-2 text-xs text-secondary">
              {formatProgrammeScheduleLabel(row.frequency)}
              {' · '}
              {row.responsibleRuknId ? (ruknNameById.get(row.responsibleRuknId) ?? '—') : '—'}
              {' · '}
              {formatActivityStatus(row.status)}
            </p>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                className="min-h-11 min-w-11 text-sm font-medium text-primary"
                onClick={() => onOpen(row)}
              >
                تفصیل
              </button>
            </div>
          </article>
        </li>
      ))}
    </ul>
  )
}

type ShobahHeadCardProps = {
  item: ShobahOverviewItem
  onOpen: (id: string) => void
}

export function ShobahHeadCard({ item, onOpen }: ShobahHeadCardProps) {
  const code = shobahHeadCode(item.shobah)
  const visual = shobahVisual(item.shobah)
  return (
    <button
      type="button"
      onClick={() => onOpen(item.shobah.id)}
      className="flex min-h-[7.5rem] w-full items-stretch overflow-hidden rounded-2xl bg-surface text-start shadow-card"
    >
      <span className="w-1.5 shrink-0" style={{ backgroundColor: visual.accent }} aria-hidden />
      <span className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-4">
        <span className="min-w-0">
          <span
            className="block text-xs font-semibold tracking-wide"
            style={{ color: visual.ink }}
          >
            {code}
          </span>
          <span className="mt-1 block text-lg font-semibold text-text-heading">
            {item.shobah.name}
          </span>
          <span className="mt-2 block text-sm text-secondary">
            {item.objectiveCount} اہداف · {item.activityCount} سرگرمیاں
          </span>
          <span className="mt-1 block text-xs text-secondary">
            {item.mappedCount} مربوط · {item.unmappedCount} بغیر ہدف
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-center gap-3">
          <span
            className="flex h-11 w-11 items-center justify-center rounded-full"
            style={{ backgroundColor: visual.wash, color: visual.accent }}
          >
            <Icon name={visual.icon} size="md" />
          </span>
          <Chevron />
        </span>
      </span>
    </button>
  )
}

type ObjectiveNavBoxProps = {
  index: number
  objective: PlanningObjective
  activityCount: number
  mappedCount: number
  unmappedCount: number
  accent: string
  onOpen: () => void
  onEdit: () => void
}

export function ObjectiveNavBox({
  index,
  objective,
  activityCount,
  mappedCount,
  unmappedCount,
  accent,
  onOpen,
  onEdit,
}: ObjectiveNavBoxProps) {
  return (
    <li>
      <div className="flex w-full items-stretch overflow-hidden rounded-2xl bg-surface shadow-card">
        <span className="w-1 shrink-0" style={{ backgroundColor: accent }} aria-hidden />
        <button
          type="button"
          className="min-h-14 min-w-0 flex-1 px-4 py-4 text-start"
          onClick={onOpen}
        >
          <span className="block text-xs text-secondary">
            {objectiveDisplayNumber(objective, index)}
          </span>
          <span className="mt-1 block text-base font-medium text-text-heading whitespace-normal break-words">
            {objective.title}
          </span>
          <span className="mt-2 block text-sm text-secondary">
            {activityCount} سرگرمیاں · {mappedCount} مربوط · {unmappedCount} بغیر ہدف
          </span>
        </button>
        <span className="flex shrink-0 flex-col items-end justify-between gap-2 px-3 py-3">
          <button
            type="button"
            className="min-h-11 text-sm text-primary"
            onClick={onEdit}
          >
            ترمیم
          </button>
          <Chevron />
        </span>
      </div>
    </li>
  )
}
