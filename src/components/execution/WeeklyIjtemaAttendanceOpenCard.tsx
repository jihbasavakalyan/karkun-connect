/**
 * KC-028C — Rukn dashboard card when Weekly Ijtema attendance window is open.
 * KC-037C2B — Title + OPEN badge presentation only.
 * KC-037C2D — Reminded / Present / Absent / Pending (Reminder % · Attendance %).
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EnterpriseBadge } from '@/components/enterprise'
import { ROUTES } from '@/constants/routes'
import { getRuknById } from '@/data/ruknMaster'
import {
  ensureWeeklyIjtemaAttendanceWindows,
  getActiveAttendanceWindowForGender,
  getRuknAttendanceProgress,
} from '@/lib/weeklyIjtema/attendanceWindowEngine'
import { listWeeklyIjtemaNotificationsForRukn } from '@/stores/weeklyIjtemaNotificationStore'
import { subscribeToWeeklyIjtemaStore } from '@/stores/weeklyIjtemaStore'
import type { WeeklyIjtemaAudienceGender } from '@/lib/weeklyIjtema/attendanceWindowSchedule'

type WeeklyIjtemaAttendanceOpenCardProps = {
  ruknId: string
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-center">
      <p className="text-xs text-secondary">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-text-heading">{value}</p>
    </div>
  )
}

export function WeeklyIjtemaAttendanceOpenCard({ ruknId }: WeeklyIjtemaAttendanceOpenCardProps) {
  const [tick, setTick] = useState(0)

  useEffect(() => {
    ensureWeeklyIjtemaAttendanceWindows()
    const unsubEvent = subscribeToWeeklyIjtemaStore(() => setTick((value) => value + 1))
    return () => {
      unsubEvent()
    }
  }, [])

  void tick

  const rukn = getRuknById(ruknId)
  const gender: WeeklyIjtemaAudienceGender =
    rukn?.gender === 'Female' ? 'Female' : 'Male'
  const event = getActiveAttendanceWindowForGender(gender)
  if (!event || event.status !== 'Open') return null

  const progress = getRuknAttendanceProgress(event.id, ruknId)
  const notice =
    listWeeklyIjtemaNotificationsForRukn(ruknId).find(
      (row) => row.eventId === event.id && !row.read,
    )?.messageUrdu ?? null

  return (
    <section
      className="rounded-(--radius-card) border border-primary/30 bg-surface p-4 shadow-card"
      aria-label="Today's Weekly Ijtema attendance"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-text-heading">
              Today&apos;s Weekly Ijtema Attendance
            </h2>
            <EnterpriseBadge variant="success">
              <span
                className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-green-600"
                aria-hidden
              />
              Open
            </EnterpriseBadge>
          </div>
          <p className="mt-1 text-xs text-secondary">{event.title}</p>
          {notice ? (
            <p className="mt-2 text-sm text-secondary" dir="rtl" lang="ur">
              {notice}
            </p>
          ) : null}
        </div>
        <Link
          to={ROUTES.RUKN_WEEKLY_IJTEMA}
          className="inline-flex min-h-10 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-white hover:opacity-90"
        >
          Open Attendance
        </Link>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric label="Reminded" value={progress.reminded} />
        <Metric label="Present" value={progress.present} />
        <Metric label="Absent" value={progress.absent} />
        <Metric label="Pending" value={progress.pending} />
      </div>
      <p className="mt-2 text-[11px] text-secondary">
        Reminder {progress.reminderPct}% · Attendance {progress.attendancePct}% (Present ÷
        Reminded)
      </p>
    </section>
  )
}
