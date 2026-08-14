/**
 * Phase 5 — Admin presentation for derived Mansooba weekly/monthly/yearly reports.
 * Read-only. No reporting store. No SoT writes.
 */

import { useMemo, useState } from 'react'
import type { CampaignListItem } from '@/constants/mockMissions'
import { buildMansoobaActivityReport } from '@/lib/mansoobaReporting/buildMansoobaActivityReport'
import {
  karachiDateKey,
  resolveMansoobaReportPeriod,
  type MansoobaReportPeriodKind,
} from '@/lib/mansoobaReporting/periods'
import type { LocalProgramme } from '@/types/localProgramme.types'
import type { Occurrence } from '@/types/occurrence.types'
import type { MeqatiMansooba, PlanningObjective } from '@/types/planning.types'
import type { Work } from '@/types/work.types'
import type { WeeklyIjtemaEvent, WeeklyIjtemaSubmission } from '@/types/weeklyIjtema'
import type {
  MonthlyBaitulMaalCycle,
  MonthlyBaitulMaalSubmission,
} from '@/types/monthlyBaitulMaal'

const inputClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

const labelClassName = 'mb-1 block text-sm font-medium text-text-heading'

type MansoobaActivityReportPanelProps = {
  mansooba: MeqatiMansooba | null
  objectives: readonly PlanningObjective[]
  campaigns: readonly CampaignListItem[]
  programmes: readonly LocalProgramme[]
  occurrences: readonly Occurrence[]
  work: readonly Work[]
  weeklyIjtemaEvents: readonly WeeklyIjtemaEvent[]
  weeklyIjtemaSubmissions: readonly WeeklyIjtemaSubmission[]
  baitulMaalCycles: readonly MonthlyBaitulMaalCycle[]
  baitulMaalSubmissions: readonly MonthlyBaitulMaalSubmission[]
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
      <p className="text-xs text-secondary">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-text-heading">{value}</p>
    </div>
  )
}

export function MansoobaActivityReportPanel({
  mansooba,
  objectives,
  campaigns,
  programmes,
  occurrences,
  work,
  weeklyIjtemaEvents,
  weeklyIjtemaSubmissions,
  baitulMaalCycles,
  baitulMaalSubmissions,
}: MansoobaActivityReportPanelProps) {
  const today = karachiDateKey()
  const [kind, setKind] = useState<MansoobaReportPeriodKind>('weekly')
  const [asOfDate, setAsOfDate] = useState(today)

  const period = useMemo(
    () => resolveMansoobaReportPeriod({ kind, asOfDate }),
    [kind, asOfDate],
  )

  const report = useMemo(() => {
    if (!mansooba || !period) return null
    return buildMansoobaActivityReport({
      mansooba,
      period,
      asOfDate: asOfDate || today,
      objectives,
      campaigns,
      programmes,
      occurrences,
      work,
      weeklyIjtemaEvents,
      weeklyIjtemaSubmissions,
      baitulMaalCycles,
      baitulMaalSubmissions,
    })
  }, [
    mansooba,
    period,
    asOfDate,
    today,
    objectives,
    campaigns,
    programmes,
    occurrences,
    work,
    weeklyIjtemaEvents,
    weeklyIjtemaSubmissions,
    baitulMaalCycles,
    baitulMaalSubmissions,
  ])

  return (
    <section className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
      <div>
        <h2 className="text-lg font-semibold text-text-heading">رپورٹ</h2>
        <p className="mt-1 text-sm text-secondary">
          منتخب میقاتی منصوبہ کی سرگرمیوں سے ماخوذ ہفتہ وار / ماہانہ / سالانہ رپورٹ۔ الگ Remarks
          نظام نہیں۔
        </p>
      </div>

      {!mansooba ? (
        <p className="mt-4 text-sm text-secondary">رپورٹ دیکھنے کے لیے میقاتی منصوبہ منتخب کریں۔</p>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClassName} htmlFor="mansooba-report-kind">
                Period
              </label>
              <select
                id="mansooba-report-kind"
                className={inputClassName}
                value={kind}
                onChange={(event) =>
                  setKind(event.target.value as MansoobaReportPeriodKind)
                }
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className={labelClassName} htmlFor="mansooba-report-asof">
                As of (Karachi date)
              </label>
              <input
                id="mansooba-report-asof"
                type="date"
                className={inputClassName}
                value={asOfDate}
                onChange={(event) => setAsOfDate(event.target.value)}
              />
            </div>
            <div>
              <p className={labelClassName}>Window</p>
              <p className="rounded-lg border border-border bg-surface-muted px-4 py-3 text-sm text-text-heading">
                {period
                  ? `${period.startDate} → ${period.endDate}`
                  : 'Invalid date'}
              </p>
            </div>
          </div>

          {report ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="منصوبہ شدہ سرگرمیاں" value={report.plannedProgrammeCount} />
                <Metric label="Scheduled" value={report.scheduled} />
                <Metric label="Occurred" value={report.occurred} />
                <Metric label="Completed" value={report.completed} />
                <Metric label="Pending" value={report.pending} />
                <Metric label="مکمل" value={report.workCompleted} />
                <Metric label="زیر التوا" value={report.workPending} />
                <Metric label="Attention items" value={report.attentionItems.length} />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-text-heading">اہداف کی پیش رفت</h3>
                {report.objectiveRows.length === 0 ? (
                  <p className="mt-2 text-sm text-secondary">اس منصوبہ میں کوئی اہداف نہیں۔</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {report.objectiveRows.map((row) => (
                      <li
                        key={row.objectiveId}
                        className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm"
                      >
                        <p className="font-medium text-text-heading">{row.title}</p>
                        <p className="mt-0.5 text-xs text-secondary">
                          {row.programmeCount} سرگرمی(اں) · scheduled {row.scheduled} ·
                          occurred {row.occurred} · completed {row.completed} · pending{' '}
                          {row.pending}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold text-text-heading">سرگرمی</h3>
                {report.programmeRows.length === 0 ? (
                  <p className="mt-2 text-sm text-secondary">
                    اس میقاتی منصوبہ کے اہداف کے تحت کوئی سرگرمی نہیں۔
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {report.programmeRows.map((row) => (
                      <li
                        key={row.programmeId}
                        className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm"
                      >
                        <p className="font-medium text-text-heading">
                          {row.name}{' '}
                          <span className="text-xs font-normal text-secondary">
                            · {row.kind} · {row.status}
                          </span>
                        </p>
                        <p className="mt-0.5 text-xs text-secondary">
                          scheduled {row.scheduled} · occurred {row.occurred} · completed{' '}
                          {row.completed} · pending {row.pending}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {kind === 'yearly' || kind === 'monthly' ? (
                <div>
                  <h3 className="text-sm font-semibold text-text-heading">
                    {kind === 'yearly' ? 'Monthly progression' : 'Activity in month'}
                  </h3>
                  {report.monthlyProgression.length === 0 ? (
                    <p className="mt-2 text-sm text-secondary">No scheduled activity in this window.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {report.monthlyProgression.map((row) => (
                        <li
                          key={row.monthKey}
                          className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs text-secondary"
                        >
                          {row.monthKey}: scheduled {row.scheduled} · completed {row.completed}{' '}
                          · pending {row.pending}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}

              <div>
                <h3 className="text-sm font-semibold text-text-heading">اس مدت کی سرگرمیاں</h3>
                {report.activityRows.length === 0 ? (
                  <p className="mt-2 text-sm text-secondary">
                    No activities in this period. Empty is valid.
                  </p>
                ) : (
                  <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto">
                    {report.activityRows.map((row) => (
                      <li
                        key={row.occurrenceId}
                        className="rounded-lg border border-border bg-surface-muted px-3 py-2"
                      >
                        <p className="text-sm font-medium text-text-heading">
                          {row.occurrenceDate} · {row.programmeName}
                        </p>
                        <p className="mt-0.5 text-xs text-secondary">
                          {row.occurrenceStatus}
                          {row.execution.completed ? ' · completed' : ''}
                          {row.execution.pending ? ' · pending' : ''}
                          {row.attendance
                            ? row.attendance.source === 'weekly_ijtema'
                              ? ` · WI present ${row.attendance.present} / absent ${row.attendance.absent}`
                              : ` · BM contributed ${row.attendance.present} / pending ${row.attendance.absent}`
                            : ''}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {report.workRows.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-text-heading">اس مدت کی تکمیل</h3>
                  <ul className="mt-2 space-y-2">
                    {report.workRows.map((row) => (
                      <li
                        key={row.workId}
                        className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm"
                      >
                        {row.title} · {row.status} · due {row.dueDate}
                        {row.overdue ? ' · overdue' : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {report.attentionItems.length > 0 ? (
                <div>
                  <h3 className="text-sm font-semibold text-text-heading">Attention</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-secondary">
                    {report.attentionItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <p className="text-xs text-secondary">
                Gaps: {report.gaps.join(', ')}. Orientation is not period-scoped. No
                performance scores. Manual narrative is not stored — attention is derived.
              </p>
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
