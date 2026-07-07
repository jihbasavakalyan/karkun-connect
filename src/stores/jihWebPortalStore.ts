import type { JihMonthlyReport, JihWebPortalRegistration } from '@/types/jihWebPortal'

const registrations = new Map<string, JihWebPortalRegistration>()
const monthlyReports = new Map<string, JihMonthlyReport>()

type JihWebPortalStoreListener = () => void
const listeners = new Set<JihWebPortalStoreListener>()

export function subscribeToJihWebPortalStore(listener: JihWebPortalStoreListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyJihWebPortalStoreChange(): void {
  listeners.forEach((listener) => listener())
}

function monthlyReportKey(karkunId: string, monthKey: string): string {
  return `${karkunId}:${monthKey}`
}

export function getRegistration(karkunId: string): JihWebPortalRegistration | undefined {
  return registrations.get(karkunId)
}

export function upsertRegistration(record: JihWebPortalRegistration): JihWebPortalRegistration {
  registrations.set(record.karkunId, record)
  notifyJihWebPortalStoreChange()
  return record
}

export function getAllRegistrations(): JihWebPortalRegistration[] {
  return [...registrations.values()]
}

export function getMonthlyReport(
  karkunId: string,
  monthKey: string,
): JihMonthlyReport | undefined {
  return monthlyReports.get(monthlyReportKey(karkunId, monthKey))
}

export function upsertMonthlyReport(record: JihMonthlyReport): JihMonthlyReport {
  monthlyReports.set(monthlyReportKey(record.karkunId, record.monthKey), record)
  notifyJihWebPortalStoreChange()
  return record
}

export function getAllMonthlyReports(): JihMonthlyReport[] {
  return [...monthlyReports.values()]
}

export function getMonthlyReportsForMonth(monthKey: string): JihMonthlyReport[] {
  return getAllMonthlyReports().filter((record) => record.monthKey === monthKey)
}

export function clearJihWebPortalStore(): void {
  registrations.clear()
  monthlyReports.clear()
  notifyJihWebPortalStoreChange()
}
