import { Link, Navigate, useParams } from 'react-router-dom'
import { CompanionWorkspaceView } from '@/components/communication/cos/CompanionWorkspaceView'
import { PageShell } from '@/components/ui'
import { ROUTES } from '@/constants/routes'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { useAuth } from '@/hooks/useAuth'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { ruknCommunicationPath } from '@/lib/ruknCommunicationNavigation'

/**
 * KC-0091 / KC-0095 — Companion Workspace for one Connected Karkun.
 * Mission-oriented relationship page — no messaging or new persistence.
 */
export function CompanionWorkspacePage() {
  const { karkunId = '' } = useParams<{ karkunId: string }>()
  const { user } = useAuth()
  const ruknId = useRequiredRuknId()
  const { getAssignedKarkunanForRukn, assignmentVersion } = useAssignmentEngine()
  void assignmentVersion

  if (!ruknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (user?.role !== 'rukn') {
    return <Navigate to={ROUTES.RUKN} replace />
  }

  const connected = getAssignedKarkunanForRukn(ruknId)
  const karkun = connected.find((item) => item.id === karkunId)

  if (!karkun) {
    return (
      <PageShell variant="narrow">
        <p className="text-sm text-secondary">
          This person is not in your Connected Karkuns.
        </p>
        <Link
          to={ruknCommunicationPath()}
          className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
        >
          ← Back to Communication
        </Link>
      </PageShell>
    )
  }

  return (
    <PageShell variant="narrow" className="app-screen">
      <div className="mb-3">
        <Link
          to={ruknCommunicationPath()}
          className="text-sm font-medium text-primary hover:underline"
        >
          ← My Connected Karkuns
        </Link>
      </div>
      <CompanionWorkspaceView ruknId={ruknId} karkun={karkun} />
    </PageShell>
  )
}
