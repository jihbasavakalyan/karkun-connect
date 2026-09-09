import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { ROUTES, ruknKarkunPath } from '@/constants/routes'
import { RuknAddPersonQuickActions } from '@/components/relationship/RuknAddPersonQuickActions'
import { PageShell } from '@/components/ui'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { useAuth } from '@/hooks/useAuth'
import { AvailableKarkunPage } from '@/pages/rukn/AvailableKarkunPage'
import { MyKarkunPage } from '@/pages/rukn/MyKarkunPage'

/**
 * UX merge of Connect + Connected. Existing pages/data remain the source of truth.
 */
export function RuknKarkunPage() {
  const { user } = useAuth()
  const ruknId = useRequiredRuknId()
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view') === 'available' ? 'available' : 'mine'

  if (!ruknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (user?.role !== 'rukn') {
    return <Navigate to={ROUTES.RUKN} replace />
  }

  return (
    <PageShell variant="narrow" className="app-screen">
      <header className="app-screen-header">
        <h1 className="app-screen-title">Karkun</h1>
        <p className="app-screen-subtitle">Your Karkuns and who you can connect</p>
      </header>

      <RuknAddPersonQuickActions ruknId={ruknId} className="rukn-karkun-add mb-2" />

      <div className="rukn-karkun-tabs" role="tablist" aria-label="Karkun lists">
        <Link
          to={ruknKarkunPath('mine')}
          role="tab"
          aria-selected={view === 'mine'}
          className={view === 'mine' ? 'rukn-karkun-tab rukn-karkun-tab-current' : 'rukn-karkun-tab'}
        >
          My Karkuns
        </Link>
        <Link
          to={ruknKarkunPath('available')}
          role="tab"
          aria-selected={view === 'available'}
          className={
            view === 'available' ? 'rukn-karkun-tab rukn-karkun-tab-current' : 'rukn-karkun-tab'
          }
        >
          Available
        </Link>
      </div>

      {view === 'available' ? <AvailableKarkunPage embedded /> : <MyKarkunPage embedded />}
    </PageShell>
  )
}
