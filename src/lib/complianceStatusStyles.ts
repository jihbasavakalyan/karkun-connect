export type ComplianceStatusLabel =
  | 'Present'
  | 'Absent'
  | 'Informed'
  | 'Excused'
  | 'Not recorded'
  | 'Registered'
  | 'Not Registered'
  | 'Submitted'
  | 'Pending'
  | 'Paid'
  | 'Exempt'

const STATUS_STYLES: Record<ComplianceStatusLabel, string> = {
  Present: 'bg-green-50 text-green-800 border-green-200',
  Absent: 'bg-slate-50 text-slate-700 border-slate-200',
  Informed: 'bg-blue-50 text-blue-800 border-blue-200',
  Excused: 'bg-blue-50 text-blue-800 border-blue-200',
  'Not recorded': 'bg-amber-50 text-amber-800 border-amber-200',
  Registered: 'bg-green-50 text-green-800 border-green-200',
  'Not Registered': 'bg-amber-50 text-amber-800 border-amber-200',
  Submitted: 'bg-green-50 text-green-800 border-green-200',
  Pending: 'bg-amber-50 text-amber-800 border-amber-200',
  Paid: 'bg-green-50 text-green-800 border-green-200',
  Exempt: 'bg-slate-50 text-slate-700 border-slate-200',
}

export function getComplianceStatusStyle(status: string): string {
  if (status in STATUS_STYLES) {
    return STATUS_STYLES[status as ComplianceStatusLabel]
  }
  return 'bg-surface-muted text-secondary border-border'
}
