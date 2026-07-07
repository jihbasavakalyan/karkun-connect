import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import { getActiveCampaignName } from '@/services/campaignService'

type VisitFormHeaderProps = {
  karkun: KarkunRegistryRecord
  assignmentNumber?: string
}

export function VisitFormHeader({ karkun, assignmentNumber }: VisitFormHeaderProps) {
  const campaignName = getActiveCampaignName()

  return (
    <header className="space-y-1">
      <p className="text-sm font-medium text-primary">Visit Details</p>
      {campaignName && (
        <p className="text-sm text-secondary">{campaignName}</p>
      )}
      <h1 className="text-xl font-semibold text-text-heading sm:text-2xl">{karkun.name}</h1>
      <p className="text-sm text-secondary">
        {assignmentNumber && <span>{assignmentNumber} · </span>}
        {karkun.area} · Rukn: {karkun.assignedRukn}
      </p>
    </header>
  )
}
