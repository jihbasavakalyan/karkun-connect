import type { ExecutionStatusDisplay } from '@/lib/executionStatus'
import { StatusBadge, type StatusBadgeVariant } from '@/components/ui/StatusBadge'

const STATUS_VARIANT: Record<ExecutionStatusDisplay, StatusBadgeVariant> = {
  Pending: 'pending',
  'In Progress': 'info',
  'Follow-up Required': 'warning',
  Completed: 'success',
}

type ExecutionStatusBadgeProps = {
  status: ExecutionStatusDisplay
}

export function ExecutionStatusBadge({ status }: ExecutionStatusBadgeProps) {
  return <StatusBadge variant={STATUS_VARIANT[status]}>{status}</StatusBadge>
}
