type ComplianceProfileFieldProps = {
  label: string
  value: string
}

export function ComplianceProfileField({ label, value }: ComplianceProfileFieldProps) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <dt className="text-sm text-secondary">{label}</dt>
      <dd className="mt-1 font-medium text-text-heading">{value}</dd>
    </div>
  )
}
