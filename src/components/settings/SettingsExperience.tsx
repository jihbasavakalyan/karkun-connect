import { useMemo, useState } from 'react'
import type { UserRole } from '@/types/auth.types'
import type { SettingsSectionId } from '@/types/userPreferences.types'
import { AboutSettingsSection } from './AboutSettingsSection'
import { AppearanceSettingsSection } from './AppearanceSettingsSection'
import { CampaignSettingsSection } from './CampaignSettingsSection'
import { DataManagementSettingsSection } from './DataManagementSettingsSection'
import { IntegrationsSettingsSection } from './IntegrationsSettingsSection'
import { NotificationSettingsSection } from './NotificationSettingsSection'
import { PrivacySettingsSection } from './PrivacySettingsSection'
import { ProfileSettingsSection } from './ProfileSettingsSection'
import { RafeeqSettingsSection } from './RafeeqSettingsSection'

type NavItem = {
  id: SettingsSectionId
  label: string
  adminOnly?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'rafeeq', label: 'Digital Rafeeq' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'campaign', label: 'Campaign', adminOnly: true },
  { id: 'data', label: 'Data', adminOnly: true },
  { id: 'about', label: 'About' },
  { id: 'integrations', label: 'Integrations' },
]

type SettingsExperienceProps = {
  role: UserRole
}

export function SettingsExperience({ role }: SettingsExperienceProps) {
  const items = useMemo(
    () => NAV_ITEMS.filter((item) => (item.adminOnly ? role === 'administrator' : true)),
    [role],
  )
  const [active, setActive] = useState<SettingsSectionId>(items[0]?.id ?? 'profile')

  const resolvedActive = items.some((item) => item.id === active) ? active : items[0]?.id ?? 'profile'

  return (
    <div className="settings-experience grid gap-4 lg:grid-cols-[12rem_minmax(0,1fr)]">
      <nav
        className="settings-nav ds-tab-pill-nav flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
        aria-label="Settings sections"
      >
        {items.map((item) => {
          const isActive = item.id === resolvedActive
          return (
            <button
              key={item.id}
              type="button"
              className={[
                'ds-tab shrink-0 whitespace-nowrap px-3 py-2 text-left text-sm font-semibold',
                isActive ? 'ds-tab-active' : '',
              ].join(' ')}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => setActive(item.id)}
            >
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="min-w-0">
        {resolvedActive === 'profile' ? <ProfileSettingsSection /> : null}
        {resolvedActive === 'rafeeq' ? <RafeeqSettingsSection /> : null}
        {resolvedActive === 'notifications' ? <NotificationSettingsSection /> : null}
        {resolvedActive === 'appearance' ? <AppearanceSettingsSection /> : null}
        {resolvedActive === 'privacy' ? <PrivacySettingsSection /> : null}
        {resolvedActive === 'campaign' && role === 'administrator' ? (
          <CampaignSettingsSection />
        ) : null}
        {resolvedActive === 'data' && role === 'administrator' ? (
          <DataManagementSettingsSection />
        ) : null}
        {resolvedActive === 'about' ? <AboutSettingsSection role={role} /> : null}
        {resolvedActive === 'integrations' ? <IntegrationsSettingsSection /> : null}
      </div>
    </div>
  )
}
