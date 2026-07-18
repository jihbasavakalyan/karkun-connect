import { useUserPreferences } from '@/hooks/useUserPreferences'
import type { AppearanceMode } from '@/types/userPreferences.types'
import {
  SettingsPlaceholder,
  SettingsRow,
  SettingsSection,
  SettingsSelect,
} from './SettingsPrimitives'

const APPEARANCE_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
] as const

export function AppearanceSettingsSection() {
  const { preferences, setAppearance } = useUserPreferences()

  return (
    <SettingsSection title="Appearance" description="Choose a calm visual preference.">
      <SettingsRow label="Theme">
        <SettingsSelect
          aria-label="Theme"
          value={preferences.appearance}
          options={APPEARANCE_OPTIONS}
          onChange={(value) => setAppearance(value as AppearanceMode)}
        />
      </SettingsRow>
      <div className="grid gap-2 sm:grid-cols-2">
        <SettingsPlaceholder label="Font Size" />
        <SettingsPlaceholder label="Urdu Font Style" />
      </div>
    </SettingsSection>
  )
}
