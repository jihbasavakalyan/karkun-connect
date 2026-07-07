import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ruknVisitPath } from '@/constants/routes'
import { ExecutionStatusBadge } from '@/components/execution/ExecutionStatusBadge'
import {
  getAnnexureActionLabel,
  getExecutionStatusForAssignment,
} from '@/lib/executionStatus'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import { getNextFollowUpForKarkun } from '@/services/followUpService'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { ReleaseKarkunModal, ReplaceKarkunModal } from '@/components/forms/assignment'
import { ContactActionBar } from '@/components/common/ContactActionBar'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

type MyKarkunCardProps = {
  karkun: KarkunRegistryRecord
  ruknId: string
}

export function MyKarkunCard({ karkun, ruknId }: MyKarkunCardProps) {
  const { releaseKarkun } = useAssignmentEngine()
  const [releaseOpen, setReleaseOpen] = useState(false)
  const [replaceOpen, setReplaceOpen] = useState(false)

  const assignment = getActiveAssignmentsForKarkun(karkun.id).find(
    (record) => record.ruknId === ruknId,
  )
  const executionStatus = assignment
    ? getExecutionStatusForAssignment(assignment.assignmentId, karkun.id)
    : 'Pending'
  const nextFollowUp = getNextFollowUpForKarkun(karkun.id)
  const actionLabel = getAnnexureActionLabel(executionStatus)

  const handleRelease = (reason: Parameters<typeof releaseKarkun>[2]) => {
    releaseKarkun(karkun.id, ruknId, reason)
    setReleaseOpen(false)
  }

  return (
    <>
      <article className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-text-heading">{karkun.name}</h2>
            {karkun.fatherHusbandName?.trim() && (
              <p className="mt-1 text-sm text-secondary">
                {karkun.gender === 'Female' ? 'Husband' : 'Father'}: {karkun.fatherHusbandName}
              </p>
            )}
            <p className="mt-1 text-sm text-secondary">{karkun.area}</p>
          </div>
          <ExecutionStatusBadge status={executionStatus} />
        </div>

        {nextFollowUp && (
          <p className="mt-3 text-sm text-secondary">
            Next follow-up: {nextFollowUp.formattedDate} · {nextFollowUp.purpose}
          </p>
        )}

        {karkun.mobile.trim() && (
          <div className="mt-3">
            <ContactActionBar
              name={karkun.name}
              mobile={karkun.mobile}
              whatsapp={karkun.whatsapp}
              size="sm"
            />
          </div>
        )}

        <div className="mt-4 grid gap-2">
          <Link to={ruknVisitPath(karkun.id)}>
            <PrimaryButton type="button" fullWidth>
              {actionLabel}
            </PrimaryButton>
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <SecondaryButton type="button" fullWidth onClick={() => setReleaseOpen(true)}>
              Release
            </SecondaryButton>
            <SecondaryButton type="button" fullWidth onClick={() => setReplaceOpen(true)}>
              Replace
            </SecondaryButton>
          </div>
        </div>
      </article>

      <ReleaseKarkunModal
        isOpen={releaseOpen}
        karkunName={karkun.name}
        onClose={() => setReleaseOpen(false)}
        onConfirm={handleRelease}
      />

      <ReplaceKarkunModal
        isOpen={replaceOpen}
        currentKarkunId={karkun.id}
        currentKarkunName={karkun.name}
        ruknId={ruknId}
        onClose={() => setReplaceOpen(false)}
        onComplete={() => setReplaceOpen(false)}
      />
    </>
  )
}
