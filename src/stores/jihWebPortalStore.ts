import type { JihMonthlyReport, JihWebPortalRegistration } from '@/types/jihWebPortal'
import { getRepositories } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'

const persisted = unwrapRepository(getRepositories().compliance.loadJihPortal(), {
  registrations: [],
  monthlyReports: [],
})

const registrations = new Map<string, JihWebPortalRegistration>(persisted.registrations)
const monthlyReports = new Map<string, JihMonthlyReport>(persisted.monthlyReports)

type JihWebPortalStoreListener = () => void
const listeners = new Set<JihWebPortalStoreListener>()

function persistJihWebPortalStore(): void {
  getRepositories().compliance.saveJihPortal({
    registrations: [...registrations.entries()],
    monthlyReports: [...monthlyReports.entries()],
  })
}

export function subscribeToJihWebPortalStore(listener: JihWebPortalStoreListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyJihWebPortalStoreChange(): void {
  persistJihWebPortalStore()
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

export function reloadJihWebPortalStoreFromPersistence(): void {
  const loaded = unwrapRepository(getRepositories().compliance.loadJihPortal(), {
    registrations: [],
    monthlyReports: [],
  })
  registrations.clear()
  monthlyReports.clear()
  for (const entry of loaded.registrations) {
    registrations.set(entry[0], entry[1])
  }
  for (const entry of loaded.monthlyReports) {
    monthlyReports.set(entry[0], entry[1])
  }
  listeners.forEach((listener) => listener())
}

export function clearJihWebPortalStore(): void {
  registrations.clear()
  monthlyReports.clear()
  getRepositories().compliance.clearJihPortal()
  notifyJihWebPortalStoreChange()
}
