/**
 * KC-0107 — Admin Weekly Ijtema Report.
 * Attendance (canonical event) and Commitment (legacy Matrix) are labeled separately.
 * Deep-link page; list "View Attendance Report" opens the same body in a viewport modal.
 */

import { Link, useParams } from 'react-router-dom'
import { WeeklyIjtemaAttendanceReportDetail } from '@/components/weekly-ijtema/WeeklyIjtemaAttendanceReportDetail'
import { PageHeader, PageShell } from '@/components/ui'
import { ROUTES, adminWeeklyIjtemaPath } from '@/constants/routes'

export function AdminWeeklyIjtemaReportPage() {
  const { eventId } = useParams<{ eventId: string }>()

  return (
    <PageShell>
      <PageHeader title="Weekly Summary" description="Weekly Ijtema summary" />
      {eventId ? (
        <WeeklyIjtemaAttendanceReportDetail eventId={eventId} variant="page" />
      ) : (
        <p className="rounded-lg border border-border bg-surface p-4 text-sm text-secondary">
          Report not found. Choose a week below or open Weekly Ijtema Management.
        </p>
      )}
      <p className="mt-6 text-sm">
        <Link to={adminWeeklyIjtemaPath()} className="font-medium text-primary hover:underline">
          ← Weekly Ijtema Management
        </Link>
        {' · '}
        <Link to={ROUTES.ADMIN} className="font-medium text-primary hover:underline">
          Dashboard
        </Link>
      </p>
    </PageShell>
  )
}
