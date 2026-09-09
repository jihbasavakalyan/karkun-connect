import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { RuknMeqatiActivitiesPanel } from '@/components/rukn/RuknMeqatiActivitiesPanel'
import { CardSkeleton, PageShell } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useBackgroundHydration } from '@/hooks/useBackgroundHydration'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'

/**
 * Read-only Meeqati Mansooba / میقاتی ذمہ داری destination.
 * Data: localProgrammes.responsibleRuknId via buildRuknMeqatiActivities.
 */
export function RuknMeqatiMansoobaPage() {
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
      <header className="app-screen-header">
        <h1 className="app-screen-title" dir="rtl" lang="ur">
          میقاتی منصوبہ
        </h1>
        <p className="app-screen-subtitle">Meeqati Mansooba · میقاتی ذمہ داری</p>
      </header>
      {backgroundReady ? <RuknMeqatiActivitiesPanel ruknId={ruknId} /> : <CardSkeleton count={2} />}
    </PageShell>
  )
}
