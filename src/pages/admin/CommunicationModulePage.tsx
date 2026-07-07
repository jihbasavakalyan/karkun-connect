import { useSearchParams } from 'react-router-dom'
import {
  AutomationRulesPanel,
  BroadcastComposerPanel,
  CommunicationDashboard,
  CommunicationSectionNav,
  DeliveryHistoryPanel,
  FailedMessagesPanel,
  IndividualMessagesPanel,
  ScheduledMessagesPanel,
  TemplateManagementPanel,
  WhatsAppSettingsPanel,
} from '@/components/communication'
import { ActiveCampaignSubtitle } from '@/components/layout/CampaignStatusBar'
import {
  resolveCommunicationSection,
  type CommunicationSection,
} from '@/lib/communicationNavigation'

export function CommunicationModulePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const section = resolveCommunicationSection(searchParams.get('section'))

  const setSection = (next: CommunicationSection) => {
    setSearchParams(next === 'dashboard' ? {} : { section: next })
  }

  return (
    <div className="mx-auto max-w-7xl space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-text-heading">Communication Center</h1>
        <ActiveCampaignSubtitle />
        <p className="mt-2 text-secondary">
          Campaign communication via WhatsApp Business Platform. Messages are queued through the
          backend — no credentials are stored in the browser.
        </p>
      </div>

      <CommunicationSectionNav active={section} onChange={setSection} />

      {section === 'dashboard' && <CommunicationDashboard />}
      {section === 'individual' && <IndividualMessagesPanel />}
      {section === 'broadcast' && <BroadcastComposerPanel recipients={[]} />}
      {section === 'templates' && <TemplateManagementPanel />}
      {section === 'scheduled' && <ScheduledMessagesPanel />}
      {section === 'automation' && <AutomationRulesPanel />}
      {section === 'history' && <DeliveryHistoryPanel />}
      {section === 'failed' && <FailedMessagesPanel />}
      {section === 'settings' && <WhatsAppSettingsPanel />}
    </div>
  )
}
