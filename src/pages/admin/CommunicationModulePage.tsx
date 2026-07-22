import { useSearchParams } from 'react-router-dom'
import {
  AutomationRulesPanel,
  BroadcastComposerPanel,
  CommunicationSectionNav,
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
import {
  AdminAudiencesPanel,
  AdminDeliveryPlaceholderPanel,
  AdminJourneysPanel,
  AdminQueuePanel,
  AdminReportsPlaceholderPanel,
  AdminSettingsPlaceholderPanel,
  AdminTemplatesPlaceholderPanel,
} from '@/components/communication/cos/AdminCosPanels'
import { MissionCenterPanel } from '@/components/communication/cos/MissionCenterPanel'
import { ActiveCampaignSubtitle } from '@/components/layout/CampaignStatusBar'
import {
  resolveCommunicationSection,
  type CommunicationSection,
} from '@/lib/communicationNavigation'
import { PageHeader, PageShell } from '@/components/ui'

/**
 * KC-0091 — Admin Communication Workspace foundation.
 * COS sections are primary; Messaging Tools preserve existing panels.
 */
export function CommunicationModulePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const section = resolveCommunicationSection(searchParams.get('section'))

  const setSection = (next: CommunicationSection) => {
    setSearchParams(next === 'mission-center' ? {} : { section: next })
  }

  return (
    <PageShell variant="wide">
      <PageHeader
        title="Communication"
        description="Mission-wide communication planning and management. Foundation workspace — messaging delivery is unchanged under Messaging Tools."
      />
      <ActiveCampaignSubtitle />

      <CommunicationSectionNav active={section} onChange={setSection} />

      {section === 'mission-center' && <MissionCenterPanel />}
      {section === 'queue' && <AdminQueuePanel />}
      {section === 'audiences' && <AdminAudiencesPanel />}
      {section === 'journeys' && <AdminJourneysPanel />}
      {section === 'template-library' && <AdminTemplatesPlaceholderPanel />}
      {section === 'delivery' && <AdminDeliveryPlaceholderPanel />}
      {section === 'reports' && <AdminReportsPlaceholderPanel />}
      {section === 'settings' && <AdminSettingsPlaceholderPanel />}

      {section === 'rukn' && <RuknCommunicationPanel />}
      {section === 'karkun' && <KarkunCommunicationPanel />}
      {section === 'daily-reports' && <DailyReportsPanel />}
      {section === 'individual' && <IndividualMessagesPanel />}
      {section === 'broadcast' && <BroadcastComposerPanel />}
      {section === 'templates' && <TemplateManagementPanel />}
      {section === 'scheduled' && <ScheduledMessagesPanel />}
      {section === 'automation' && <AutomationRulesPanel />}
      {section === 'history' && <DeliveryHistoryPanel />}
      {section === 'failed' && <FailedMessagesPanel />}
      {section === 'tool-settings' && <WhatsAppSettingsPanel />}
    </PageShell>
  )
}
