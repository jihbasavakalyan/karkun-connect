import { useState } from 'react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { useAuth } from '@/hooks/useAuth'
import { downloadCampaignReportPdf } from '@/lib/reporting/campaignReportPdf'
import { URDU_REPORT } from '@/lib/reporting/campaignReportUrdu'

type GenerateCampaignReportButtonProps = {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * KC-0114 — Generates the official Urdu Campaign Report PDF.
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
    void downloadCampaignReportPdf({
      generatedBy: user?.displayName?.trim() || user?.email || user?.phone || 'منتظم',
    })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'مہم کی رپورٹ تیار نہیں ہو سکی۔')
      })
      .finally(() => {
        setBusy(false)
      })
  }

  return (
    <div className={className}>
      <PrimaryButton type="button" size={size} loading={busy} onClick={onClick}>
        {URDU_REPORT.button}
      </PrimaryButton>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  )
}
