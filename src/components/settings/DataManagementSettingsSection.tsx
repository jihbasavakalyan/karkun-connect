import { Link } from 'react-router-dom'
import { DangerZone } from '@/components/admin/DangerZone'
import { DataIntegrityReportPanel } from '@/components/admin/DataIntegrityReportPanel'
import { DuplicateResolutionWizard } from '@/components/admin/DuplicateResolutionWizard'
import { DataMigrationWizard } from '@/components/migration/DataMigrationWizard'
import { ROUTES } from '@/constants/routes'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import {
  SettingsReadonly,
  SettingsRow,
  SettingsSection,
  SettingsPlaceholder,
} from './SettingsPrimitives'

export function DataManagementSettingsSection() {
  return (
    <SettingsSection
      title="Data Management"
      description="Exports, backups, integrity audit, duplicate resolution, and migration tools for administrators."
    >
      <SettingsRow label="Export Reports" hint="Use module reports for campaign exports">
        <Link to={ROUTES.ADMIN_EXECUTION}>
          <SecondaryButton type="button">Open Execution Reports</SecondaryButton>
        </Link>
      </SettingsRow>
      <SettingsRow label="Backup Status">
        <SettingsReadonly value="Local browser backups available via migration tools" />
      </SettingsRow>
      <SettingsRow label="Import History">
        <SettingsReadonly value="Tracked in migration version history" />
      </SettingsRow>
      <SettingsPlaceholder label="Restore Backup" note="Coming soon" />

      <div className="pt-2">
        <DuplicateResolutionWizard />
      </div>
      <div className="pt-2">
        <DataIntegrityReportPanel />
      </div>
      <div className="pt-2">
        <DataMigrationWizard />
      </div>
      <div className="pt-2">
        <DangerZone />
      </div>
    </SettingsSection>
  )
}
