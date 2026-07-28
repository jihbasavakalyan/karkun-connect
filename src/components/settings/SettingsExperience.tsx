import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { lazyWithChunkReload } from '@/lib/lazyWithChunkReload'
import type { UserRole } from '@/types/auth.types'
import type { SettingsSectionId } from '@/types/userPreferences.types'
import { AboutSettingsSection } from './AboutSettingsSection'
import { AppearanceSettingsSection } from './AppearanceSettingsSection'
import { CampaignSettingsSection } from './CampaignSettingsSection'
import { IntegrationsSettingsSection } from './IntegrationsSettingsSection'
import { NotificationSettingsSection } from './NotificationSettingsSection'
import { PrivacySettingsSection } from './PrivacySettingsSection'
import { ProfileSettingsSection } from './ProfileSettingsSection'
import { RafeeqSettingsSection } from './RafeeqSettingsSection'

// KC-0078 — Defer xlsx migration wizard and registry scans until the section opens.
const DataManagementSettingsSection = lazyWithChunkReload(() =>
  import('./DataManagementSettingsSection').then((m) => ({
    default: m.DataManagementSettingsSection,
  })),
)
const MaintenanceSettingsSection = lazyWithChunkReload(() =>
  import('./MaintenanceSettingsSection').then((m) => ({
    default: m.MaintenanceSettingsSection,
  })),
)

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
  { id: 'maintenance', label: 'Maintenance', adminOnly: true },
  { id: 'about', label: 'About' },
  { id: 'integrations', label: 'Integrations' },
]

type SettingsExperienceProps = {
  role: UserRole
}

function SettingsSectionFallback() {
  return (
    <p className="text-sm text-secondary" aria-busy="true">
      Loading section…
    </p>
  )
}

function isSettingsSectionId(value: string | null): value is SettingsSectionId {
  return (
    value === 'profile' ||
    value === 'rafeeq' ||
    value === 'notifications' ||
    value === 'appearance' ||
    value === 'privacy' ||
    value === 'campaign' ||
    value === 'data' ||
    value === 'maintenance' ||
    value === 'about' ||
    value === 'integrations'
  )
}

export function SettingsExperience({ role }: SettingsExperienceProps) {
  const [searchParams, setSearchParams] = useSearchParams()
  const items = useMemo(
    () => NAV_ITEMS.filter((item) => (item.adminOnly ? role === 'administrator' : true)),
    [role],
  )
  const sectionFromUrl = searchParams.get('section')
  const [localActive, setLocalActive] = useState<SettingsSectionId>(items[0]?.id ?? 'profile')

  const resolvedActive = (() => {
    if (isSettingsSectionId(sectionFromUrl) && items.some((item) => item.id === sectionFromUrl)) {
      return sectionFromUrl
    }
    return items.some((item) => item.id === localActive) ? localActive : items[0]?.id ?? 'profile'
  })()

  const selectSection = (id: SettingsSectionId) => {
    setLocalActive(id)
    const next = new URLSearchParams(searchParams)
    next.set('section', id)
    setSearchParams(next, { replace: true })
  }

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
              onClick={() => selectSection(item.id)}
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
          <Suspense fallback={<SettingsSectionFallback />}>
            <DataManagementSettingsSection />
          </Suspense>
        ) : null}
        {resolvedActive === 'maintenance' && role === 'administrator' ? (
          <Suspense fallback={<SettingsSectionFallback />}>
            <MaintenanceSettingsSection />
          </Suspense>
        ) : null}
        {resolvedActive === 'about' ? <AboutSettingsSection role={role} /> : null}
        {resolvedActive === 'integrations' ? <IntegrationsSettingsSection /> : null}
      </div>
    </div>
  )
}
