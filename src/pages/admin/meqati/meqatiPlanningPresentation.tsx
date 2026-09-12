/**
 * Meqati Planning presentation — hierarchy unchanged:
 * میقاتی منصوبہ → شعبہ → اہداف → سرگرمی → ذمہ دار → Schedule → Remarks / Report
 * Presentation only. Persistence stays on AdminPlanningPage.
 */
/* eslint-disable react-refresh/only-export-components -- helpers colocated with canvas UI */

import type { LocalProgramme, LocalProgrammeStatus } from '@/types/localProgramme.types'
import type { PlanningObjective, Shobah } from '@/types/planning.types'
import { formatProgrammeScheduleLabel } from '@/lib/planning/programmeSchedule'
import {
  formatActivityYearStatusLabel,
  resolveActivityYearStatus,
} from '@/lib/planning/activityYearStatus'
import { resolveMeqatiYear } from '@/lib/dashboard/meqatiYear'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/design-system/iconNames'

const PROGRAMME_STATUS_URDU: Record<LocalProgrammeStatus, string> = {
  draft: 'مسودہ',
  active: 'فعال',
  archived: 'محفوظ',
}

const activityNameClass = 'font-medium text-text-heading break-words whitespace-normal'

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

/**
 * Presentational, deterministic H01–H09 palette.
 * Approved muted variety — not persisted; contrast-safe ink on wash.
 */
const HEAD_VISUAL_BY_CODE: Record<string, ShobahVisual> = {
  /* muted teal */
  H01: { accent: '#0f766e', wash: '#e7f2f0', ink: '#0f172a', icon: 'clipboard' },
  /* muted blue */
  H02: { accent: '#1d4ed8', wash: '#e8eef8', ink: '#0f172a', icon: 'users' },
  /* muted aqua */
  H03: { accent: '#0e7490', wash: '#e6f3f5', ink: '#0f172a', icon: 'handshake' },
  /* muted violet */
  H04: { accent: '#6d28d9', wash: '#eee8f7', ink: '#0f172a', icon: 'flag' },
  /* muted green */
  H05: { accent: '#047857', wash: '#e8f3ee', ink: '#0f172a', icon: 'megaphone' },
  /* muted slate */
  H06: { accent: '#475569', wash: '#eef1f4', ink: '#0f172a', icon: 'file-text' },
  /* muted amber/gold */
  H07: { accent: '#b45309', wash: '#f6f0e4', ink: '#0f172a', icon: 'sprout' },
  /* muted rose */
  H08: { accent: '#9f1239', wash: '#f5e9ec', ink: '#0f172a', icon: 'chart' },
  /* muted terracotta */
  H09: { accent: '#9a3412', wash: '#f4ebe6', ink: '#0f172a', icon: 'home' },
}

const FALLBACK_VISUAL: ShobahVisual = {
  accent: '#0f766e',
  wash: '#eef1f4',
  ink: '#0f172a',
  icon: 'clipboard',
}

export function shobahVisualByCode(code: string): ShobahVisual {
  const key = code.trim().toUpperCase()
  if (/^H\d{2}$/.test(key)) return HEAD_VISUAL_BY_CODE[key] ?? FALLBACK_VISUAL
  const match = key.match(/H(\d{1,2})/)
  if (match) {
    const padded = `H${match[1].padStart(2, '0')}`
    return HEAD_VISUAL_BY_CODE[padded] ?? FALLBACK_VISUAL
  }
  return FALLBACK_VISUAL
}

export function shobahVisual(shobah: Pick<Shobah, 'id' | 'sortOrder'>): ShobahVisual {
  return shobahVisualByCode(shobahHeadCode(shobah))
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
  /** Meqati year key for عمل درآمد. Defaults to the current Karachi Meqati year (same as Home). */
  yearKey?: string
}

function activityMeta(
  row: LocalProgramme,
  ruknNameById: ReadonlyMap<string, string>,
  yearKey: string,
) {
  const summary = row.summary?.trim() || null
  return {
    responsible: row.responsibleRuknId ? (ruknNameById.get(row.responsibleRuknId) ?? '—') : '—',
    schedule: formatProgrammeScheduleLabel(row.frequency),
    lifecycleStatus: formatActivityStatus(row.status),
    yearStatus: formatActivityYearStatusLabel(
      resolveActivityYearStatus(row.yearStatuses, yearKey),
    ),
    summary,
  }
}

export function CompactActivityList({
  rows,
  ruknNameById,
  onOpen,
  showUnmappedState = false,
  yearKey,
}: CompactActivityListProps) {
  if (rows.length === 0) return null
  const resolvedYearKey = yearKey ?? resolveMeqatiYear().key

  return (
    <>
      <div className="hidden overflow-x-hidden lg:block">
        <table className="w-full table-fixed text-start text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-secondary">
              <th className="w-[32%] pb-2 ps-0 font-medium">سرگرمی</th>
              <th className="w-[16%] pb-2 font-medium">ذمہ دار</th>
              <th className="w-[16%] pb-2 font-medium">نظام الاوقات</th>
              <th className="w-[12%] pb-2 font-medium">عمل درآمد</th>
              <th className="w-[12%] pb-2 font-medium">حالت</th>
              <th className="w-[12%] pb-2 pe-0 font-medium">تفصیل</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const meta = activityMeta(row, ruknNameById, resolvedYearKey)
              const unmapped = showUnmappedState || !isMappedActivity(row)
              return (
                <tr
                  key={row.id}
                  className="align-top border-b border-border/60 last:border-b-0 cursor-pointer hover:bg-surface-muted/70 transition-colors"
                  onClick={() => onOpen(row)}
                  tabIndex={0}
                  role="button"
                  aria-label={`سرگرمی ${row.name}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      onOpen(row)
                    }
                  }}
                >
                  <td className="py-3 pe-3">
                    <p className={activityNameClass}>{row.name}</p>
                    {unmapped ? (
                      <p className="mt-1 text-xs text-amber-700">
                        <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-800 border border-amber-300/60">
                          بغیر ہدف
                        </span>
                      </p>
                    ) : null}
                    {meta.summary ? (
                      <p className="mt-1 text-xs text-secondary">خلاصہ: {meta.summary}</p>
                    ) : null}
                  </td>
                  <td className="py-2.5 pe-3 text-secondary whitespace-normal break-words">
                    {meta.responsible}
                  </td>
                  <td className="py-2.5 pe-3 text-secondary whitespace-normal break-words">
                    {meta.schedule}
                  </td>
                  <td className="py-2.5 pe-3 text-secondary">{meta.yearStatus}</td>
                  <td className="py-2.5 pe-3 text-secondary">{meta.lifecycleStatus}</td>
                  <td className="py-2.5 pe-0">
                    <button
                      type="button"
                      className="min-h-11 text-sm font-medium text-primary hover:underline"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpen(row)
                      }}
                    >
                      تفصیل
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <ul className="overflow-x-hidden lg:hidden">
        {rows.map((row) => {
          const meta = activityMeta(row, ruknNameById, resolvedYearKey)
          const unmapped = showUnmappedState || !isMappedActivity(row)
          return (
            <li
              key={row.id}
              className="border-b border-border/60 py-3 last:border-b-0 cursor-pointer hover:bg-surface-muted/70 transition-colors rounded-lg p-2.5 -mx-2"
              onClick={() => onOpen(row)}
              tabIndex={0}
              role="button"
              aria-label={`سرگرمی ${row.name}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onOpen(row)
                }
              }}
            >
              <p className={activityNameClass}>{row.name}</p>
              {unmapped ? (
                <p className="mt-1 text-xs text-amber-700">
                  <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-800 border border-amber-300/60">
                    بغیر ہدف
                  </span>
                </p>
              ) : null}
              {meta.summary ? (
                <p className="mt-1 text-xs text-secondary">خلاصہ: {meta.summary}</p>
              ) : null}
              <p className="mt-1 text-xs text-secondary">
                {meta.responsible} · {meta.schedule} · عمل درآمد: {meta.yearStatus} · حالت:{' '}
                {meta.lifecycleStatus}
              </p>
              <button
                type="button"
                className="mt-1 min-h-11 text-sm font-medium text-primary hover:underline"
                onClick={(e) => {
                  e.stopPropagation()
                  onOpen(row)
                }}
              >
                تفصیل
              </button>
            </li>
          )
        })}
      </ul>
    </>
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
      className="meqati-head-card flex min-h-[7.5rem] w-full flex-col items-stretch justify-between gap-3 px-4 py-4 text-start"
      style={{
        backgroundColor: visual.wash,
        color: visual.ink,
        borderColor: `color-mix(in srgb, ${visual.accent} 22%, #e2e5ea)`,
      }}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          <span className="block text-xs font-medium opacity-70">{code}</span>
          <span className="mt-1 block text-lg font-semibold whitespace-normal break-words">
            {item.shobah.name}
          </span>
        </span>
        <span
          className="meqati-head-icon inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/85"
          style={{ color: visual.accent }}
          aria-hidden
        >
          <Icon name={visual.icon} size="md" />
        </span>
      </span>
      <span className="block text-sm opacity-80">
        {item.objectiveCount} اہداف · {item.activityCount} سرگرمیاں
        <span className="mt-1 block text-xs">
          {item.mappedCount} مربوط · {item.unmappedCount} بغیر ہدف
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
  onEdit?: () => void
}

export function ObjectiveNavBox({
  index,
  objective,
  activityCount,
  mappedCount,
  unmappedCount,
  accent: _accent,
  onOpen,
  onEdit,
}: ObjectiveNavBoxProps) {
  void _accent
  return (
    <li>
      <div
        className="flex w-full items-stretch overflow-hidden border-b border-border bg-transparent"
        style={{ borderColor: 'color-mix(in srgb, var(--color-border) 100%, transparent)' }}
      >
        <button
          type="button"
          className="min-h-14 min-w-0 flex-1 px-0 py-3 text-start"
          onClick={onOpen}
        >
          <span className="block text-xs text-secondary">
            ہدف {objectiveDisplayNumber(objective, index)}
          </span>
          <span className="mt-1 block text-base font-medium text-text-heading whitespace-normal break-words">
            {objective.title}
          </span>
          <span className="mt-2 block text-sm text-secondary">
            {activityCount} سرگرمیاں · {mappedCount} مربوط · {unmappedCount} بغیر ہدف
          </span>
        </button>
        <span className="flex shrink-0 flex-col items-end justify-between gap-2 px-3 py-3">
          {onEdit ? (
            <button
              type="button"
              className="min-h-11 text-sm text-primary"
              onClick={onEdit}
            >
              ترمیم
            </button>
          ) : null}
          <Chevron />
        </span>
      </div>
    </li>
  )
}
