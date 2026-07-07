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
        className="group flex h-[100px] items-center gap-2 rounded-xl border border-border/80 bg-surface p-3 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-card-hover"
      >
        <span className="shrink-0 text-xl leading-none" aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-secondary">{label}</span>
          <span className="campaign-count-up block text-[2rem] font-bold leading-none tracking-tight text-text-heading">
            {value}
            {suffix}
          </span>
        </div>
        {trend && (
          <span className="max-w-[4rem] shrink-0 truncate rounded-full bg-primary-muted/70 px-1.5 py-0.5 text-center text-[9px] font-semibold leading-tight text-primary">
            {trend}
          </span>
        )}
        <span className="sr-only">{subtitle}</span>
      </Link>
    </li>
  )
}
