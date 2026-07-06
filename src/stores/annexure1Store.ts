import type { SubmittedMeetingForm } from '@/types/annexure1.types'

const submittedForms: SubmittedMeetingForm[] = []

type Annexure1StoreListener = () => void
const listeners = new Set<Annexure1StoreListener>()

export function subscribeToAnnexure1Store(listener: Annexure1StoreListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function notifyAnnexure1StoreChange(): void {
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
