import {
  APP_BUILD,
  APP_DESCRIPTION,
  APP_NAME,
  APP_RELEASE_DATE,
  APP_TAGLINE,
  APP_VERSION,
} from '@/constants/app'
import { ROUTES } from '@/constants/routes'
import { Link } from 'react-router-dom'
import type { UserRole } from '@/types/auth.types'
import { SettingsReadonly, SettingsRow, SettingsSection } from './SettingsPrimitives'

function resolveEnvironment(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) return 'Production'
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) return 'Development'
  return 'Unknown'
}

type AboutSettingsSectionProps = {
  role: UserRole
}

export function AboutSettingsSection({ role }: AboutSettingsSectionProps) {
  const docsTo = role === 'administrator' ? ROUTES.ADMIN_HELP : ROUTES.RUKN

  return (
    <SettingsSection title="About" description="Application identity and support links.">
      <SettingsRow label="Application Name">
        <SettingsReadonly value={APP_NAME} />
      </SettingsRow>
      <SettingsRow label="Tagline">
        <SettingsReadonly value={APP_TAGLINE} />
      </SettingsRow>
      <SettingsRow label="Version">
        <SettingsReadonly value={`${APP_VERSION} ${APP_BUILD.toUpperCase()}`} />
      </SettingsRow>
      <SettingsRow label="Build Number">
        <SettingsReadonly value={APP_BUILD} />
      </SettingsRow>
      <SettingsRow label="Release Date">
        <SettingsReadonly value={APP_RELEASE_DATE} />
      </SettingsRow>
      <SettingsRow label="Environment">
        <SettingsReadonly value={resolveEnvironment()} />
      </SettingsRow>
      <p className="text-sm text-secondary">{APP_DESCRIPTION}</p>
      <div className="flex flex-wrap gap-3 text-sm font-medium">
        <Link className="text-primary hover:underline" to={docsTo}>
          Documentation
        </Link>
        <a className="text-primary hover:underline" href="mailto:jihbasavakalyan1@gmail.com">
          Support
        </a>
        <Link className="text-primary hover:underline" to={docsTo}>
          Privacy Policy
        </Link>
        <Link className="text-primary hover:underline" to={docsTo}>
          Terms
        </Link>
      </div>
    </SettingsSection>
  )
}
