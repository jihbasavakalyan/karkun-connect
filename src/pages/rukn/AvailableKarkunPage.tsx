import { Navigate } from 'react-router-dom'
import { DEFAULT_DEMO_RUKN_ID } from '@/constants/demoRukn'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { AvailableKarkunCard } from '@/components/forms/rukn/AvailableKarkunCard'

export function AvailableKarkunPage() {
  const { user } = useAuth()
  const ruknId = user?.ruknId ?? DEFAULT_DEMO_RUKN_ID
  const { getAvailableKarkunan } = useAssignmentEngine()
  const availableKarkunan = getAvailableKarkunan()

  if (user?.role !== 'rukn') {
    return <Navigate to={ROUTES.RUKN} replace />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Available Karkun</h1>
        <p className="mt-2 text-secondary">
          Self-assign Karkun from the available pool. {availableKarkunan.length} available.
        </p>
      </div>

      {availableKarkunan.length === 0 ? (
        <div className="rounded-(--radius-card) border border-border bg-surface p-8 text-center shadow-card">
          <p className="text-secondary">No Karkun available right now.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {availableKarkunan.map((karkun) => (
            <li key={karkun.id}>
              <AvailableKarkunCard karkun={karkun} ruknId={ruknId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
