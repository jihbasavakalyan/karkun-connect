import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { getAllAssignments } from '@/services/assignmentService'
import { StatCard } from '@/components/dashboard/StatCard'

export function CommandCenterPeopleStats() {
  const { assignmentVersion } = useAssignmentEngine()
  void assignmentVersion

  const connectedAssignments = getAllAssignments().filter((assignment) => assignment.status === 'Active')
  const connectedKarkuns = connectedAssignments
    .map((assignment) => getKarkunById(assignment.karkunId))
    .filter((karkun): karkun is NonNullable<typeof karkun> => Boolean(karkun))

  const maleConnected = connectedKarkuns.filter((karkun) => karkun.gender === 'Male').length
  const femaleConnected = connectedKarkuns.filter((karkun) => karkun.gender === 'Female').length
  const totalConnected = maleConnected + femaleConnected

  const cards = [
    { label: 'Male Karkuns', value: maleConnected },
    { label: 'Female Karkuns', value: femaleConnected },
    { label: 'Total Connected', value: totalConnected },
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
