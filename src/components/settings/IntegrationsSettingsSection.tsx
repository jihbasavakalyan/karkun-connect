import { SettingsPlaceholder, SettingsSection } from './SettingsPrimitives'

/** Future-ready placeholders — not implemented. */
export function IntegrationsSettingsSection() {
  return (
    <SettingsSection
      title="Integrations"
      description="Reserved for future connections. Nothing here is active yet."
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <SettingsPlaceholder label="AI Providers" />
        <SettingsPlaceholder label="Voice Providers" />
        <SettingsPlaceholder label="WhatsApp Integration" />
        <SettingsPlaceholder label="Calendar Integration" />
        <SettingsPlaceholder label="Offline Mode" />
        <SettingsPlaceholder label="Advanced Automation" />
      </div>
    </SettingsSection>
  )
}
