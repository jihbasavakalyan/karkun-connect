import { RegistryHealthPanel } from '@/components/admin/RegistryHealthPanel'
import { SettingsSection } from './SettingsPrimitives'

/** KC-0073 — Admin maintenance tools (monitoring only). */
export function MaintenanceSettingsSection() {
  return (
    <SettingsSection
      title="Maintenance"
      description="Registry health monitoring for administrators. Scans are read-only and never modify production data."
    >
      <RegistryHealthPanel />
    </SettingsSection>
  )
}
