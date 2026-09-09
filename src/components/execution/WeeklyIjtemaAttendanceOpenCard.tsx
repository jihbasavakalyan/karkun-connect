/**
 * KC-028C — Rukn Home Weekly Ijtema summary.
 * Presentation: Invited | Present | Absent.
 * Invited uses existing reminded production semantics (remindedOnly alias).
 */

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { getRuknById } from '@/data/ruknMaster'
import { ensureWeeklyIjtemaAttendanceWindows } from '@/lib/weeklyIjtema/attendanceWindowEngine'
import { getCurrentWeeklyIjtemaEvent, getRuknAttendanceProgress } from '@/services/weeklyIjtemaService'
import { subscribeToWeeklyIjtemaStore } from '@/stores/weeklyIjtemaStore'
import type { WeeklyIjtemaAudienceGender } from '@/lib/weeklyIjtema/attendanceWindowSchedule'

type WeeklyIjtemaAttendanceOpenCardProps = {
  ruknId: string
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
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
  const gender: WeeklyIjtemaAudienceGender = rukn?.gender === 'Female' ? 'Female' : 'Male'
  const event = getCurrentWeeklyIjtemaEvent({ audienceGender: gender })
  const progress = event ? getRuknAttendanceProgress(event.id, ruknId) : null

  return (
    <section className="rukn-home-card" aria-labelledby="rukn-home-ijtema-title">
      <header className="rukn-home-card-head">
        <h2 id="rukn-home-ijtema-title" className="rukn-home-card-title">
          Weekly Ijtema
        </h2>
        <p className="rukn-home-card-sub">
          {event ? event.title : 'No current meeting'}
          {event?.status === 'Open' ? ' · Open' : null}
        </p>
      </header>
      {progress ? (
        <dl className="rukn-home-stat-row">
          <Metric label="Invited" value={progress.reminded} />
          <Metric label="Present" value={progress.present} />
          <Metric label="Absent" value={progress.absent} />
        </dl>
      ) : (
        <p className="rukn-home-empty">Attendance is not open yet.</p>
      )}
      <Link to={ROUTES.RUKN_WEEKLY_IJTEMA} className="rukn-home-inline-link">
        Open Attendance
      </Link>
    </section>
  )
}
