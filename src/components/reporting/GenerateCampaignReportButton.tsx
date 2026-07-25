import { useState } from 'react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { useAuth } from '@/hooks/useAuth'
import { downloadCampaignReportPdf } from '@/lib/reporting/campaignReportPdf'

type GenerateCampaignReportButtonProps = {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * KC-0114 — Generates the comprehensive Campaign Report PDF for leadership review.
 */
export function GenerateCampaignReportButton({
  className = '',
  size = 'md',
}: GenerateCampaignReportButtonProps) {
  const { user } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const onClick = () => {
    setError('')
    setBusy(true)
    try {
      downloadCampaignReportPdf({
        generatedBy: user?.displayName?.trim() || user?.email || user?.phone || 'Administrator',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to generate Campaign Report PDF.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={className}>
      <PrimaryButton type="button" size={size} loading={busy} onClick={onClick}>
        Generate Campaign Report (PDF)
      </PrimaryButton>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  )
}
