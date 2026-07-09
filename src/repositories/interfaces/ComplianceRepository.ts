import type { BaitulMaalRecord } from '@/types/baitulMaal'
import type { IjtemaAttendanceRecord } from '@/types/ijtemaAttendance'
import type { JihMonthlyReport, JihWebPortalRegistration } from '@/types/jihWebPortal'
import type { RepositoryResult } from '@/repositories/errors'

export type JihPortalState = {
  registrations: [string, JihWebPortalRegistration][]
  monthlyReports: [string, JihMonthlyReport][]
}

export interface ComplianceRepository {
  loadBaitulMaal(): RepositoryResult<BaitulMaalRecord[]>
  saveBaitulMaal(records: BaitulMaalRecord[]): RepositoryResult<void>
  clearBaitulMaal(): RepositoryResult<void>
  loadIjtema(): RepositoryResult<IjtemaAttendanceRecord[]>
  saveIjtema(records: IjtemaAttendanceRecord[]): RepositoryResult<void>
  clearIjtema(): RepositoryResult<void>
  loadJihPortal(): RepositoryResult<JihPortalState>
  saveJihPortal(state: JihPortalState): RepositoryResult<void>
  clearJihPortal(): RepositoryResult<void>
}
