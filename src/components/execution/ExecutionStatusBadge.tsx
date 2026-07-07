import type { ExecutionStatusDisplay } from '@/lib/executionStatus'
import { getExecutionStatusStyle } from '@/lib/executionStatus'

type ExecutionStatusBadgeProps = {
  status: ExecutionStatusDisplay
}

export function ExecutionStatusBadge({ status }: ExecutionStatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium',
        getExecutionStatusStyle(status),
      ].join(' ')}
    >
      {status}
    </span>
  )
}
