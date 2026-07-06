import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ruknVisitPath } from '@/constants/routes'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { ReleaseKarkunModal, ReplaceKarkunModal } from '@/components/forms/assignment'
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

  const commitmentLabel = karkun.currentCommitment.trim()
    ? karkun.currentCommitment
    : 'No commitment recorded'

  const handleRelease = (reason: Parameters<typeof releaseKarkun>[2]) => {
    releaseKarkun(karkun.id, ruknId, reason)
    setReleaseOpen(false)
  }

  return (
    <>
      <article className="rounded-(--radius-card) border border-border bg-surface p-5 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">{karkun.name}</h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div>
            <dt className="text-secondary">Area</dt>
            <dd className="font-medium text-text-heading">{karkun.area}</dd>
          </div>
          <div>
            <dt className="text-secondary">Last Meeting</dt>
            <dd className="font-medium text-text-heading">{karkun.lastVisit ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-secondary">Current Commitment</dt>
            <dd className="font-medium text-text-heading">{commitmentLabel}</dd>
          </div>
          <div>
            <dt className="text-secondary">JIH App Status</dt>
            <dd className="font-medium text-text-heading">{karkun.jihAppRegistrationStatus}</dd>
          </div>
        </dl>

        <div className="mt-4 grid gap-2">
          <Link to={ruknVisitPath(karkun.id)}>
            <PrimaryButton type="button" fullWidth>
              Open
            </PrimaryButton>
          </Link>
          <SecondaryButton type="button" fullWidth onClick={() => setReleaseOpen(true)}>
            Release
          </SecondaryButton>
          <SecondaryButton type="button" fullWidth onClick={() => setReplaceOpen(true)}>
            Replace
          </SecondaryButton>
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
