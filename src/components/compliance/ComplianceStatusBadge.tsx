import { getComplianceStatusStyle } from '@/lib/complianceStatusStyles'

type ComplianceStatusBadgeProps = {
  status: string
}

export function ComplianceStatusBadge({ status }: ComplianceStatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        getComplianceStatusStyle(status),
      ].join(' ')}
    >
      {status}
    </span>
  )
}
