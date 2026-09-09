import { useMemo } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { MyConnectedKarkunsPanel } from '@/components/communication/cos/MyConnectedKarkunsPanel'
import { RuknCommunicationSectionNav } from '@/components/communication/cos/RuknCommunicationSectionNav'
import { RuknFollowUpsPanel } from '@/components/communication/cos/RuknCosPanels'
import { CommunicationDeferredSection } from '@/components/communication/cos/CommunicationDeferredSection'
import { PageHeader, PageShell, ListSkeleton, EmptyState } from '@/components/ui'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { ROUTES } from '@/constants/routes'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { useAuth } from '@/hooks/useAuth'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { useRepositoryHydrationStatus } from '@/hooks/useRepositoryHydration'
import {
  isRuknCommunicationPrimarySection,
  resolveRuknCommunicationSection,
  type RuknCommunicationPrimarySection,
} from '@/lib/ruknCommunicationNavigation'

/**
 * Increment 07 — Rukn Communication destination.
 * My Connected Karkuns + Follow-ups. Companion remains a person drill-in.
 */
export function RuknCommunicationPage() {
  const { user } = useAuth()
  const ruknId = useRequiredRuknId()
  const hydration = useRepositoryHydrationStatus()
  const { assignmentVersion, getAssignedKarkunanForRukn } = useAssignmentEngine()
  const [searchParams, setSearchParams] = useSearchParams()
  const section = resolveRuknCommunicationSection(searchParams.get('section'))

  const connected = useMemo(
    () => getAssignedKarkunanForRukn(ruknId ?? ''),
    [assignmentVersion, getAssignedKarkunanForRukn, ruknId],
  )

  const setSection = (next: RuknCommunicationPrimarySection) => {
    setSearchParams(next === 'my-karkuns' ? {} : { section: next })
  }

  if (!ruknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (user?.role !== 'rukn') {
    return <Navigate to={ROUTES.RUKN} replace />
  }

  if (hydration.failed) {
    return (
      <PageShell variant="narrow" className="app-screen">
        <PageHeader
          title="Communication"
          description="Call, WhatsApp, and next steps for Connected Karkuns."
        />
        <EmptyState
          icon="warning"
          title="Unable to load communication"
          description={hydration.error ?? 'Connected Karkuns could not be loaded.'}
        >
          <PrimaryButton type="button" className="mt-3" onClick={hydration.retry}>
            Retry
          </PrimaryButton>
        </EmptyState>
      </PageShell>
    )
  }

  return (
    <PageShell variant="narrow" className="app-screen">
      <PageHeader
        title="Communication"
        description="Call, WhatsApp, and next steps for Connected Karkuns."
      />

      <RuknCommunicationSectionNav active={section} onChange={setSection} />

      <div className="mt-4">
        {!hydration.ready ? (
          <ListSkeleton rows={5} />
        ) : !isRuknCommunicationPrimarySection(section) ? (
          <RuknDeferredBody section={section} />
        ) : section === 'follow-ups' ? (
          <RuknFollowUpsPanel ruknId={ruknId} karkuns={connected} />
        ) : (
          <MyConnectedKarkunsPanel ruknId={ruknId} karkuns={connected} />
        )}
      </div>
    </PageShell>
  )
}

function RuknDeferredBody({
  section,
}: {
  section: string
}) {
  if (section === 'visit-planning') {
    return (
      <CommunicationDeferredSection
        workspace="rukn"
        title="Visit is a separate destination"
        description="Visit planning is not part of Communication. Open a Connected Karkun and use Visit when you need the journey."
      />
    )
  }

  if (section === 'conversations') {
    return (
      <CommunicationDeferredSection
        workspace="rukn"
        title="Not a chat"
        description="Communication is Call, WhatsApp, and follow-up for Connected Karkuns. There is no conversation or thread list."
      />
    )
  }

  return (
    <CommunicationDeferredSection
      workspace="rukn"
      title="Not part of Communication"
      description="This address is kept so older links still open. Use My Connected Karkuns or Follow-ups."
    />
  )
}
