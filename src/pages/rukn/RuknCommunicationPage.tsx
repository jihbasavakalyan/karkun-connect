import { useMemo } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { MyConnectedKarkunsPanel } from '@/components/communication/cos/MyConnectedKarkunsPanel'
import { RuknCommunicationSectionNav } from '@/components/communication/cos/RuknCommunicationSectionNav'
import {
  RuknCompanionLedgerPanel,
  RuknConversationsPanel,
  RuknFollowUpsPanel,
  RuknNotesPanel,
  RuknRafeeqSectionPanel,
  RuknVisitPlanningPanel,
} from '@/components/communication/cos/RuknCosPanels'
import { PageHeader, PageShell } from '@/components/ui'
import { ROUTES } from '@/constants/routes'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { useAuth } from '@/hooks/useAuth'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import {
  resolveRuknCommunicationSection,
  type RuknCommunicationSection,
} from '@/lib/ruknCommunicationNavigation'

/**
 * KC-0091 / KC-0094 / KC-0096 — Rukn Communication Workspace.
 * Organized around Connected Karkuns — not channels.
 * Phase 3: Follow-ups tab → outcome-driven Today's Actions.
 */
export function RuknCommunicationPage() {
  const { user } = useAuth()
  const ruknId = useRequiredRuknId()
  const { assignmentVersion, getAssignedKarkunanForRukn } = useAssignmentEngine()
  const [searchParams, setSearchParams] = useSearchParams()
  const section = resolveRuknCommunicationSection(searchParams.get('section'))

  const connected = useMemo(
    () => getAssignedKarkunanForRukn(ruknId ?? ''),
    [assignmentVersion, getAssignedKarkunanForRukn, ruknId],
  )

  const setSection = (next: RuknCommunicationSection) => {
    setSearchParams(next === 'my-karkuns' ? {} : { section: next })
  }

  if (!ruknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (user?.role !== 'rukn') {
    return <Navigate to={ROUTES.RUKN} replace />
  }

  return (
    <PageShell variant="narrow" className="app-screen">
      <PageHeader
        title="Communication"
        description="Who needs your attention today — relationship intelligence for Connected Karkuns."
      />

      <RuknCommunicationSectionNav active={section} onChange={setSection} />

      <div className="mt-4">
        {section === 'my-karkuns' && (
          <MyConnectedKarkunsPanel ruknId={ruknId} karkuns={connected} />
        )}
        {section === 'conversations' && <RuknConversationsPanel />}
        {section === 'follow-ups' && (
          <RuknFollowUpsPanel ruknId={ruknId} karkuns={connected} />
        )}
        {section === 'companion-ledger' && <RuknCompanionLedgerPanel />}
        {section === 'visit-planning' && <RuknVisitPlanningPanel />}
        {section === 'notes' && <RuknNotesPanel />}
        {section === 'rafeeq' && <RuknRafeeqSectionPanel />}
      </div>
    </PageShell>
  )
}
