import { Navigate } from 'react-router-dom'
import { DEMO_RUKN_PORTAL_ID } from '@/constants/demoRukn'
import { ROUTES } from '@/constants/routes'
import { useAuth } from '@/hooks/useAuth'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { MyKarkunCard } from '@/components/forms/rukn/MyKarkunCard'

export function MyKarkunPage() {
  const { user } = useAuth()
  const ruknId = user?.ruknId ?? DEMO_RUKN_PORTAL_ID
  const { getAssignedKarkunanForRukn } = useAssignmentEngine()
  const myKarkunan = getAssignedKarkunanForRukn(ruknId)

  if (user?.role !== 'rukn') {
    return <Navigate to={ROUTES.RUKN} replace />
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">My Karkun</h1>
        <p className="mt-2 text-secondary">
          Your assigned Karkun for this campaign. {myKarkunan.length} assigned.
        </p>
      </div>

      {myKarkunan.length === 0 ? (
        <div className="rounded-(--radius-card) border border-border bg-surface p-8 text-center shadow-card">
          <p className="text-secondary">You have no assigned Karkun yet.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {myKarkunan.map((karkun) => (
            <li key={karkun.id}>
              <MyKarkunCard karkun={karkun} ruknId={ruknId} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
