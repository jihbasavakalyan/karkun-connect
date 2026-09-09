import { useSearchParams } from 'react-router-dom'
import {
  BroadcastComposerPanel,
  CommunicationDashboard,
  CommunicationSectionNav,
  CommunicationWorkspaceSubnav,
  DailyReportsPanel,
  DeliveryHistoryPanel,
  FailedMessagesPanel,
  IndividualMessagesPanel,
  KarkunCommunicationPanel,
  RuknCommunicationPanel,
  ScheduledMessagesPanel,
  TemplateManagementPanel,
  WhatsAppSettingsPanel,
} from '@/components/communication'
import { OfficialCommunicationsPanel } from '@/components/communication/cos/OfficialCommunicationsPanel'
import { CommunicationDeferredSection } from '@/components/communication/cos/CommunicationDeferredSection'
import { ActiveCampaignSubtitle } from '@/components/layout/CampaignStatusBar'
import {
  isCommunicationCosPlaceholderSection,
  resolveCommunicationSection,
  type CommunicationPrimarySection,
  type CommunicationSection,
} from '@/lib/communicationNavigation'
import { EmptyState, ListSkeleton, PageHeader, PageShell } from '@/components/ui'
import { useRepositoryHydrationStatus } from '@/hooks/useRepositoryHydration'
import { PrimaryButton } from '@/components/ui/PrimaryButton'

const COMPOSE_SUBNAV = [
  { id: 'individual', label: 'Individual' },
  { id: 'broadcast', label: 'Broadcast' },
] as const

const HISTORY_SUBNAV = [
  { id: 'history', label: 'History' },
  { id: 'failed', label: 'Failed' },
  { id: 'scheduled', label: 'Scheduled' },
] as const

/**
 * Increment 07 — Admin مواصلات destination.
 * Live Overview landing; existing messaging panels reused; COS placeholders demoted.
 */
export function CommunicationModulePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const section = resolveCommunicationSection(searchParams.get('section'))
  const hydration = useRepositoryHydrationStatus()

  const setSection = (next: CommunicationSection) => {
    setSearchParams(next === 'overview' ? {} : { section: next })
  }

  const setPrimary = (next: CommunicationPrimarySection) => {
    setSection(next)
  }

  if (hydration.failed) {
    return (
      <PageShell variant="wide">
        <PageHeader title="مواصلات" description="Organisational communication for Connected work." />
        <EmptyState
          icon="warning"
          title="Unable to load communication"
          description={hydration.error ?? 'Communication records could not be loaded.'}
        >
          <PrimaryButton type="button" className="mt-3" onClick={hydration.retry}>
            Retry
          </PrimaryButton>
        </EmptyState>
      </PageShell>
    )
  }

  return (
    <PageShell variant="wide">
      <PageHeader
        title="مواصلات"
        description="Official communications, WhatsApp, and delivery history for the organisation."
      />
      <ActiveCampaignSubtitle />

      <CommunicationSectionNav active={section} onChange={setPrimary} />

      {!hydration.ready ? (
        <ListSkeleton rows={6} />
      ) : (
        <CommunicationSectionBody section={section} onSectionChange={setSection} />
      )}
    </PageShell>
  )
}

function CommunicationSectionBody({
  section,
  onSectionChange,
}: {
  section: CommunicationSection
  onSectionChange: (next: CommunicationSection) => void
}) {
  if (isCommunicationCosPlaceholderSection(section)) {
    return (
      <CommunicationDeferredSection
        workspace="admin"
        title="Not part of Communication"
        description="This address is kept so older links still open. It is not a live Communication workspace. Use Overview for current communication work."
      />
    )
  }

  if (section === 'automation') {
    return (
      <CommunicationDeferredSection
        workspace="admin"
        title="Automation rules"
        description="Automation rules are stored with Communication settings but are not dispatched. They are not a primary Communication destination."
      />
    )
  }

  if (section === 'individual' || section === 'broadcast') {
    return (
      <div>
        <CommunicationWorkspaceSubnav
          labelledBy="Individual or Broadcast"
          items={[...COMPOSE_SUBNAV]}
          active={section}
          onChange={(id) => onSectionChange(id as CommunicationSection)}
        />
        {section === 'broadcast' ? <BroadcastComposerPanel /> : <IndividualMessagesPanel />}
      </div>
    )
  }

  if (section === 'history' || section === 'failed' || section === 'scheduled') {
    return (
      <div>
        <CommunicationWorkspaceSubnav
          labelledBy="History, Failed, or Scheduled"
          items={[...HISTORY_SUBNAV]}
          active={section}
          onChange={(id) => onSectionChange(id as CommunicationSection)}
        />
        {section === 'failed' ? (
          <FailedMessagesPanel />
        ) : section === 'scheduled' ? (
          <ScheduledMessagesPanel />
        ) : (
          <DeliveryHistoryPanel />
        )}
      </div>
    )
  }

  if (section === 'overview') return <CommunicationDashboard ready />
  if (section === 'rukn') return <RuknCommunicationPanel />
  if (section === 'karkun') return <KarkunCommunicationPanel />
  if (section === 'daily-reports') return <DailyReportsPanel />
  if (section === 'template-library') return <OfficialCommunicationsPanel />
  if (section === 'templates') return <TemplateManagementPanel />
  if (section === 'tool-settings') return <WhatsAppSettingsPanel />

  return (
    <CommunicationDeferredSection
      workspace="admin"
      title="Communication"
      description="This Communication link is no longer a primary destination. Return to Overview."
    />
  )
}
