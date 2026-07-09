import { StatusBadge, type StatusBadgeVariant } from '@/components/ui/StatusBadge'

type ComplianceStatusBadgeProps = {
  status: string
}

const STATUS_VARIANT: Record<string, StatusBadgeVariant> = {
  Present: 'success',
  Absent: 'neutral',
  Informed: 'info',
  'Not recorded': 'warning',
  Registered: 'success',
  'Not Registered': 'warning',
  Submitted: 'success',
  Pending: 'pending',
  Paid: 'success',
}

export function ComplianceStatusBadge({ status }: ComplianceStatusBadgeProps) {
  return (
    <StatusBadge variant={STATUS_VARIANT[status] ?? 'neutral'}>{status}</StatusBadge>
  )
}
