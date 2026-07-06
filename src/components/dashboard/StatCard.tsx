import type { DashboardStat } from '@/constants/mockDashboard'

type StatCardProps = {
  stat: DashboardStat
}

export function StatCard({ stat }: StatCardProps) {
  return (
    <article className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card transition-shadow hover:shadow-card-hover">
      <p className="text-sm font-medium text-secondary">{stat.label}</p>
      <p className="mt-2 text-3xl font-semibold text-text-heading">
        {stat.value}
        {stat.unit && (
          <span className="ml-1 text-lg font-medium text-secondary">{stat.unit}</span>
        )}
      </p>
    </article>
  )
}
