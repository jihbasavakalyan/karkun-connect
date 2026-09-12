import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { RuknResponsibilitiesHomePanel } from '@/components/rukn/RuknResponsibilitiesHomePanel'
import { CardSkeleton, PageShell } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useBackgroundHydration } from '@/hooks/useBackgroundHydration'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'

/**
 * Read-only Responsibilities destination.
 * Same localProgrammes.responsibleRuknId path as Meeqati Mansooba. Not Phase 4 Work.
 */
export function RuknResponsibilitiesPage() {
  const { user } = useAuth()
  const ruknId = useRequiredRuknId()
  const backgroundReady = useBackgroundHydration()

  if (!ruknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (user?.role !== 'rukn') {
    return <Navigate to={ROUTES.RUKN} replace />
  }

  return (
    <PageShell variant="narrow" className="app-screen">
      <header className="app-screen-header" dir="rtl" lang="ur">
        <h1 className="app-screen-title">میری ذمہ داریاں</h1>
        <p className="app-screen-subtitle">Responsibilities · میقاتی ذمہ داری</p>
      </header>
      {backgroundReady ? (
        <RuknResponsibilitiesHomePanel ruknId={ruknId} />
      ) : (
        <CardSkeleton count={2} />
      )}
    </PageShell>
  )
}
