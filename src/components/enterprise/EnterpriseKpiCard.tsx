import { Link } from 'react-router-dom'

type EnterpriseKpiCardProps = {
  label: string
  value: number | string
  route: string
  icon: string
  subtitle: string
  trend: string
  suffix?: string
}

export function EnterpriseKpiCard({
  label,
  value,
  route,
  icon,
  subtitle,
  trend,
  suffix = '',
}: EnterpriseKpiCardProps) {
  return (
    <li>
      <Link
        to={route}
        className="campaign-glass-card-interactive group flex min-h-36 flex-col p-5"
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-muted text-2xl shadow-sm transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3"
            aria-hidden="true"
          >
            {icon}
          </span>
          {trend && (
            <span className="rounded-full bg-primary-muted/70 px-2.5 py-1 text-[11px] font-semibold text-primary">
              {trend}
            </span>
          )}
        </div>
        <span className="mt-4 text-sm font-medium text-secondary">{label}</span>
        <span className="campaign-count-up mt-0.5 text-4xl font-bold tracking-tight text-text-heading">
          {value}
          {suffix}
        </span>
        <span className="mt-auto flex items-center gap-1 pt-2 text-xs text-secondary-light">
          {subtitle}
          <span className="ml-auto text-primary opacity-0 transition-opacity group-hover:opacity-100">
            →
          </span>
        </span>
      </Link>
    </li>
  )
}
