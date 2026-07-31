import { useNavigate } from 'react-router-dom'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { ROUTES } from '@/constants/routes'
import { URDU_REPORT } from '@/lib/reporting/campaignReportUrdu'

type GenerateCampaignReportButtonProps = {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

/**
 * KC-0114 / KC-037B — Opens Report Center configuration workflow
 * (replaces direct one-click PDF export).
 */
export function GenerateCampaignReportButton({
  className = '',
  size = 'md',
}: GenerateCampaignReportButtonProps) {
  const navigate = useNavigate()

  return (
    <div className={className}>
      <PrimaryButton type="button" size={size} onClick={() => navigate(ROUTES.ADMIN_REPORTS)}>
        {URDU_REPORT.button}
      </PrimaryButton>
    </div>
  )
}
