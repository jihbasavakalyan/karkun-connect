import { getPeopleStatistics } from '@/lib/peopleStore'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import { StatCard } from '@/components/dashboard/StatCard'

export function CommandCenterPeopleStats() {
  usePeopleStore()
  const stats = getPeopleStatistics()

  const cards = [
    { label: 'Total Rukns', value: stats.totalRukns },
    { label: 'Male Rukns', value: stats.maleRukns },
    { label: 'Female Rukns', value: stats.femaleRukns },
    { label: 'Male Karkuns', value: stats.totalMaleKarkuns },
    { label: 'Female Karkuns', value: stats.totalFemaleKarkuns },
    { label: 'Connected Karkuns', value: stats.assignedKarkuns },
    { label: 'Unconnected Karkuns', value: stats.unassignedKarkuns },
    { label: 'Active Users', value: stats.activeUsers },
    { label: 'Inactive Users', value: stats.inactiveUsers },
  ]

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-text-heading">People Overview</h2>
        <p className="mt-1 text-sm text-secondary">Rukn and Karkun registry statistics</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <StatCard key={card.label} stat={{ id: card.label, label: card.label, value: card.value }} />
        ))}
      </div>
    </section>
  )
}
