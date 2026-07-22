import type { SubmittedMeetingForm } from '@/types/annexure1.types'
import { isSubmissionDateOnDay } from '@/lib/dates/submissionDateDay'
import { getRepositories } from '@/repositories/provider'
import { unwrapRepository } from '@/repositories/errors'

const submittedForms: SubmittedMeetingForm[] = unwrapRepository(
  getRepositories().execution.loadAnnexureForms(),
  [],
)

type Annexure1StoreListener = () => void
const listeners = new Set<Annexure1StoreListener>()

function persistAnnexure1Store(): void {
  getRepositories().execution.saveAnnexureForms(submittedForms)
}

export function subscribeToAnnexure1Store(listener: Annexure1StoreListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyAnnexure1StoreChange(): void {
  persistAnnexure1Store()
  listeners.forEach((listener) => listener())
}

export function appendSubmittedForm(record: SubmittedMeetingForm): SubmittedMeetingForm {
  submittedForms.unshift(record)
  notifyAnnexure1StoreChange()
  return record
}

export function getAllSubmittedForms(): SubmittedMeetingForm[] {
  return [...submittedForms]
}

export function getSubmittedMeetingForms(): SubmittedMeetingForm[] {
  return submittedForms.filter((form) => form.status === 'submitted')
}

export function getLatestSubmissionForKarkun(karkunId: string): SubmittedMeetingForm | undefined {
  return submittedForms.find(
    (form) => form.karkunId === karkunId && form.status === 'submitted',
  )
}

/** KC-0080 — today's submitted progress for a Karkun (if any). */
export function getTodaysSubmissionForKarkun(
  karkunId: string,
  dayIso = new Date().toISOString().slice(0, 10),
): SubmittedMeetingForm | undefined {
  return getSubmittedMeetingForms().find(
    (form) =>
      form.karkunId === karkunId && isSubmissionDateOnDay(form.submissionDate, dayIso),
  )
}

/** KC-0080 — update an existing form in place (no duplicate append). */
export function updateSubmittedForm(record: SubmittedMeetingForm): SubmittedMeetingForm {
  const index = submittedForms.findIndex((form) => form.id === record.id)
  if (index >= 0) {
    submittedForms[index] = record
  } else {
    submittedForms.unshift(record)
  }
  notifyAnnexure1StoreChange()
  return record
}

export function hasSubmittedAnnexureForAssignment(assignmentId: string): boolean {
  return submittedForms.some(
    (form) => form.assignmentId === assignmentId && form.status === 'submitted',
  )
}

export function getSubmissionsForRukn(ruknId: string): SubmittedMeetingForm[] {
  return submittedForms.filter((form) => form.ruknId === ruknId && form.status === 'submitted')
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function startOfWeek(date: Date): Date {
  const day = date.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(date)
  monday.setDate(date.getDate() - diff)
  return startOfDay(monday)
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function countSubmissionsSince(since: Date): number {
  const sinceMs = since.getTime()
  return getSubmittedMeetingForms().filter(
    (form) => new Date(form.submissionDate).getTime() >= sinceMs,
  ).length
}

export function getSubmissionPeriodCounts(): {
  submittedToday: number
  submittedThisWeek: number
  submittedThisMonth: number
} {
  const now = new Date()
  return {
    submittedToday: countSubmissionsSince(startOfDay(now)),
    submittedThisWeek: countSubmissionsSince(startOfWeek(now)),
    submittedThisMonth: countSubmissionsSince(startOfMonth(now)),
  }
}

export function saveDraftRecord(record: SubmittedMeetingForm): SubmittedMeetingForm {
  submittedForms.unshift(record)
  notifyAnnexure1StoreChange()
  return record
}

export function reloadAnnexure1StoreFromPersistence(): void {
  const loaded = unwrapRepository(getRepositories().execution.loadAnnexureForms(), [])
  submittedForms.length = 0
  submittedForms.push(...loaded)
  notifyAnnexure1StoreChange()
}

export function clearAnnexure1Store(): void {
  submittedForms.length = 0
  getRepositories().execution.clearAnnexureForms()
  notifyAnnexure1StoreChange()
}
