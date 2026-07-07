export type IjtemaAttendanceStatus = 'Present' | 'Absent' | 'Informed'

export type IjtemaAttendanceRecord = {
  karkunId: string
  weekEndingDate: string
  status: IjtemaAttendanceStatus
  remarks?: string
  updatedAt: string
  updatedBy: string
}

export type IjtemaAttendanceDashboardMetrics = {
  present: number
  absent: number
  informed: number
}

export type IjtemaAttendanceKarkunSummary = {
  karkunId: string
  karkunName: string
  weekEndingDate: string
  weekLabel: string
  status: IjtemaAttendanceStatus | 'Not recorded'
  remarks?: string
  updatedAt?: string
}

export type UpdateIjtemaAttendanceInput = {
  karkunId: string
  weekEndingDate?: string
  status: IjtemaAttendanceStatus
  remarks?: string
  updatedBy?: string
}

export type BulkUpdateIjtemaAttendanceInput = {
  karkunIds: string[]
  weekEndingDate?: string
  status: IjtemaAttendanceStatus
  remarks?: string
  updatedBy?: string
}

export const IJTEMA_ATTENDANCE_STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'Present', label: 'Present' },
  { value: 'Absent', label: 'Absent' },
  { value: 'Informed', label: 'Informed' },
] as const

export function getIjtemaWeekFilterOptions(
  date = new Date(),
  weeksBack = 12,
): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [
    { value: '', label: 'Current Week' },
  ]

  const currentWeekEnding = getWeekEndingDate(date)
  const end = new Date(`${currentWeekEnding}T12:00:00`)

  for (let index = 0; index < weeksBack; index += 1) {
    const weekDate = new Date(end)
    weekDate.setDate(end.getDate() - index * 7)
    const weekEnding = formatDateKey(weekDate)
    options.push({
      value: weekEnding,
      label: `Week ending ${formatWeekLabel(weekEnding)}`,
    })
  }

  return options
}

export function getWeekEndingDate(date = new Date()): string {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? 0 : 7 - day
  d.setDate(d.getDate() + diff)
  return formatDateKey(d)
}

function formatDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function formatWeekLabel(weekEndingDate: string): string {
  const date = new Date(`${weekEndingDate}T12:00:00`)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
