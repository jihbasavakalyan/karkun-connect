import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_JAMAAT } from '@/constants/app'
import { ROUTES } from '@/constants/routes'
import { getAuthDisplayLabel } from '@/lib/auth/roleResolver'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { useAuth } from '@/hooks/useAuth'
import { ruknMaster } from '@/data/ruknMaster'
import {
  SettingsReadonly,
  SettingsRow,
  SettingsSection,
  SettingsPlaceholder,
} from './SettingsPrimitives'

export function ProfileSettingsSection() {
  const { user, logout, resetPassword } = useAuth()
  const navigate = useNavigate()
  const [passwordNotice, setPasswordNotice] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)

  const rukn = user?.ruknId ? ruknMaster.find((item) => item.id === user.ruknId) : undefined
  const name =
    user?.displayName || rukn?.name || (user ? getAuthDisplayLabel(user) : '') || '—'
  const mobile = user?.phone || rukn?.mobile || '—'
  const email = user?.email || '—'
  const roleLabel = user?.role === 'administrator' ? 'Administrator' : 'Rukn'

  const handleChangePassword = async () => {
    setPasswordNotice('')
    if (!user?.email) {
      setPasswordNotice('Password change is available for email accounts.')
      return
    }
    setPasswordBusy(true)
    const result = await resetPassword(user.email)
    setPasswordBusy(false)
    setPasswordNotice(
      result.success
        ? 'A password reset link has been sent to your email.'
        : result.error || 'Unable to send password reset email.',
    )
  }

  const handleLogout = async () => {
    await logout()
    navigate(ROUTES.LOGIN, { replace: true })
  }

  return (
    <SettingsSection
      title="Profile"
      description="Personal information and account preferences."
    >
      <SettingsRow label="Name">
        <SettingsReadonly value={name} />
      </SettingsRow>
      <SettingsRow label="Mobile Number">
        <SettingsReadonly value={mobile} />
      </SettingsRow>
      <SettingsRow label="Email">
        <SettingsReadonly value={email} />
      </SettingsRow>
      <SettingsRow label="Role" hint="Assigned by the organisation">
        <SettingsReadonly value={roleLabel} />
      </SettingsRow>
      <SettingsRow label="Jamaat">
        <SettingsReadonly value={APP_JAMAAT} />
      </SettingsRow>
      <SettingsPlaceholder label="Profile Photo" note="Coming soon" />

      <div className="flex flex-wrap gap-2 pt-2">
        <SecondaryButton
          type="button"
          disabled={passwordBusy || user?.role === 'rukn'}
          onClick={() => void handleChangePassword()}
        >
          Change Password
        </SecondaryButton>
        <SecondaryButton type="button" onClick={() => void handleLogout()}>
          Logout
        </SecondaryButton>
      </div>
      {user?.role === 'rukn' ? (
        <p className="text-xs text-secondary">
          Rukn accounts sign in with mobile OTP. Password change applies to administrator email
          accounts.
        </p>
      ) : null}
      {passwordNotice ? <p className="text-sm text-secondary">{passwordNotice}</p> : null}
    </SettingsSection>
  )
}
