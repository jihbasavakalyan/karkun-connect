type RuknHomeOrgMetricProps = {
  label: string
  value: string
  hint?: string
}

export function RuknHomeOrgMetric({ label, value, hint }: RuknHomeOrgMetricProps) {
  return (
    <li className="rukn-org-metric">
      <p className="rukn-org-metric-label">{label}</p>
      <p className="rukn-org-metric-value">{value}</p>
      {hint ? <p className="rukn-org-metric-hint">{hint}</p> : null}
    </li>
  )
}
