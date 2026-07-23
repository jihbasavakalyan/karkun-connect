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
} from '@/components/communication/cos/AdminCosPanels'
import { OfficialCommunicationsPanel } from '@/components/communication/cos/OfficialCommunicationsPanel'
import { MissionCenterPanel } from '@/components/communication/cos/MissionCenterPanel'
import { ActiveCampaignSubtitle } from '@/components/layout/CampaignStatusBar'
import {
  resolveCommunicationSection,
  type CommunicationSection,
} from '@/lib/communicationNavigation'
import { PageHeader, PageShell } from '@/components/ui'

/**
 * KC-0091 / KC-0099 — Admin Communication Workspace.
 * Official Communication System is primary; Messaging Tools preserve delivery panels.
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
        description="Official Communication System — respectful, mission-centric language for اقامتِ دین. Existing messaging delivery remains under Messaging Tools."
      />
      <ActiveCampaignSubtitle />

      <CommunicationSectionNav active={section} onChange={setSection} />

      {section === 'mission-center' && <MissionCenterPanel />}
      {section === 'queue' && <AdminQueuePanel />}
      {section === 'audiences' && <AdminAudiencesPanel />}
      {section === 'journeys' && <AdminJourneysPanel />}
      {section === 'template-library' && <OfficialCommunicationsPanel />}
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
