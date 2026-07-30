/**
 * KC-028C — Rukn dashboard card when Weekly Ijtema attendance window is open.
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
    return subscribeToWeeklyIjtemaStore(() => setTick((value) => value + 1))
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
      aria-label="Weekly Ijtema attendance window"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-text-heading">
            Weekly Ijtema Attendance is Open
          </h2>
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
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Metric label="Present" value={progress.present} />
        <Metric label="Absent" value={progress.absent} />
        <Metric label="Pending" value={progress.pending} />
      </div>
    </section>
  )
}
