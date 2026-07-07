import type { ReactNode } from 'react'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import {
  PEOPLE_TABLE_MOBILE_CLASS,
  PEOPLE_TABLE_NAME_CLASS,
} from '@/components/forms/people/peopleTableDisplay'
import { ComplianceStatusBadge } from '@/components/compliance/ComplianceStatusBadge'

type ComplianceListRowProps = {
  karkunId: string
  karkunName: string
  status: string
  meta?: string
  actions: ReactNode
}

export function ComplianceListRow({
  karkunId,
  karkunName,
  status,
  meta,
  actions,
}: ComplianceListRowProps) {
  const mobile = getKarkunById(karkunId)?.mobile

  return (
    <li className="flex flex-col gap-3 rounded-lg border border-border bg-surface-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={PEOPLE_TABLE_NAME_CLASS}>{karkunName}</p>
          <ComplianceStatusBadge status={status} />
        </div>
        {mobile && <p className={`mt-1 ${PEOPLE_TABLE_MOBILE_CLASS}`}>{mobile}</p>}
        {meta && <p className="mt-0.5 text-sm text-secondary">{meta}</p>}
      </div>
      <div className="flex flex-wrap gap-2 sm:shrink-0">{actions}</div>
    </li>
  )
}
