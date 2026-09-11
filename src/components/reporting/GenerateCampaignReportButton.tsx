import { useNavigate } from 'react-router-dom'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { ROUTES } from '@/constants/routes'
import { URDU_REPORT } from '@/lib/reporting/campaignReportUrdu'

type GenerateCampaignReportButtonProps = {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * KC-0114 / KC-037B / Increment 13 — Opens Reports Composer for executive campaign.
 * Navigates to رپورٹس with type preselected. Does not download a PDF by itself.
 */
export function GenerateCampaignReportButton({
  className = '',
  size = 'md',
}: GenerateCampaignReportButtonProps) {
  const navigate = useNavigate()

  return (
    <div className={className}>
      <PrimaryButton
        type="button"
        size={size}
        onClick={() => navigate(`${ROUTES.ADMIN_REPORTS}?type=executive_campaign`)}
      >
        {URDU_REPORT.button}
      </PrimaryButton>
    </div>
  )
}
