import type { BaitulMaalRecord } from '@/types/baitulMaal'
import type { IjtemaAttendanceRecord } from '@/types/ijtemaAttendance'
import type { JihMonthlyReport, JihWebPortalRegistration } from '@/types/jihWebPortal'
import type { WeeklyIjtemaEvent, WeeklyIjtemaSubmission } from '@/types/weeklyIjtema'
import type { RepositoryResult } from '@/repositories/errors'

export type JihPortalState = {
  registrations: Record<string, JihWebPortalRegistration>
  monthlyReports: Record<string, JihMonthlyReport>
}

export interface ComplianceRepository {
  loadBaitulMaal(): RepositoryResult<BaitulMaalRecord[]>
  saveBaitulMaal(records: BaitulMaalRecord[]): RepositoryResult<void>
  clearBaitulMaal(): RepositoryResult<void>
  loadIjtema(): RepositoryResult<IjtemaAttendanceRecord[]>
  saveIjtema(records: IjtemaAttendanceRecord[]): RepositoryResult<void>
  clearIjtema(): RepositoryResult<void>
  /** KC-0107 — Weekly Ijtema events (Admin-managed). */
  loadWeeklyIjtemaEvents(): RepositoryResult<WeeklyIjtemaEvent[]>
  saveWeeklyIjtemaEvents(events: WeeklyIjtemaEvent[]): RepositoryResult<void>
  clearWeeklyIjtemaEvents(): RepositoryResult<void>
  /** KC-0107 — Rukn submissions belonging to an event. */
  loadWeeklyIjtemaSubmissions(): RepositoryResult<WeeklyIjtemaSubmission[]>
  saveWeeklyIjtemaSubmissions(submissions: WeeklyIjtemaSubmission[]): RepositoryResult<void>
  clearWeeklyIjtemaSubmissions(): RepositoryResult<void>
  loadJihPortal(): RepositoryResult<JihPortalState>
  saveJihPortal(state: JihPortalState): RepositoryResult<void>
  clearJihPortal(): RepositoryResult<void>
}
