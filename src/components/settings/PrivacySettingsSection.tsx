import { useState } from 'react'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { useAuth } from '@/hooks/useAuth'
import {
  SettingsPlaceholder,
  SettingsReadonly,
  SettingsRow,
  SettingsSection,
} from './SettingsPrimitives'

export function PrivacySettingsSection() {
  const { user, resetPassword } = useAuth()
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)

  const lastLogin =
    typeof sessionStorage !== 'undefined'
      ? sessionStorage.getItem('karkun-connect.last-login') || 'This session'
      : 'This session'

  const handleChangePassword = async () => {
    setNotice('')
    if (!user?.email) {
      setNotice('Password change is available for email accounts.')
      return
    }
    setBusy(true)
    const result = await resetPassword(user.email)
    setBusy(false)
    setNotice(
      result.success
        ? 'A password reset link has been sent to your email.'
        : result.error || 'Unable to send password reset email.',
    )
  }

  return (
    <SettingsSection
      title="Privacy & Security"
      description="Account safety without technical clutter."
    >
      <SettingsRow label="Active Sessions" hint="Current device session">
        <SettingsReadonly value="This device" />
      </SettingsRow>
      <SettingsRow label="Last Login">
        <SettingsReadonly value={lastLogin} />
      </SettingsRow>
      <div className="flex flex-wrap gap-2">
        <SecondaryButton
          type="button"
          disabled={busy || user?.role === 'rukn'}
          onClick={() => void handleChangePassword()}
        >
          Change Password
        </SecondaryButton>
      </div>
      {notice ? <p className="text-sm text-secondary">{notice}</p> : null}
      <SettingsPlaceholder label="Two-factor Authentication" />
      <SettingsRow label="Privacy Policy">
        <a className="text-sm font-medium text-primary hover:underline" href="/help">
          View policy summary
        </a>
      </SettingsRow>
    </SettingsSection>
  )
}
