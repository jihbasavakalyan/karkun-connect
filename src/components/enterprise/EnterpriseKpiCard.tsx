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
        className="enterprise-card-interactive group flex min-h-32 flex-col p-5"
      >
        <div className="flex items-start justify-between gap-2">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-muted text-lg transition-transform group-hover:scale-105"
            aria-hidden="true"
          >
            {icon}
          </span>
          <span className="text-xs font-medium text-primary">{trend}</span>
        </div>
        <span className="mt-3 text-sm font-medium text-secondary">{label}</span>
        <span className="mt-1 text-3xl font-bold tracking-tight text-text-heading">
          {value}
          {suffix}
        </span>
        <span className="mt-auto pt-2 text-xs text-secondary-light">{subtitle}</span>
      </Link>
    </li>
  )
}
