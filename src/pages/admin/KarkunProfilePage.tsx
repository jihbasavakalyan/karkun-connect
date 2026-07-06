import { Link, useParams } from 'react-router-dom'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { ROUTES } from '@/constants/routes'
import {
  CAMPAIGN_STATUS_LABELS,
  JIH_STATUS_LABELS,
  VISIT_STATUS_LABELS,
} from '@/types/karkun-registry.types'
import { CampaignStatusBadge } from '@/components/forms/karkunan/CampaignStatusBadge'
import { SecondaryButton } from '@/components/ui/SecondaryButton'

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-4 py-3">
      <dt className="text-sm text-secondary">{label}</dt>
      <dd className="mt-1 font-medium text-text-heading">{value}</dd>
    </div>
  )
}

export function KarkunProfilePage() {
  const { karkunId } = useParams<{ karkunId: string }>()
  const karkun = karkunId ? getKarkunById(karkunId) : undefined

  if (!karkun) {
    return (
      <div className="mx-auto max-w-3xl rounded-(--radius-card) border border-border bg-surface p-8 text-center shadow-card">
        <h1 className="text-xl font-semibold text-text-heading">Karkun Not Found</h1>
        <p className="mt-2 text-secondary">This profile does not exist in the registry.</p>
        <Link to={ROUTES.ADMIN_KARKUN} className="mt-6 inline-block">
          <SecondaryButton type="button">Back to Karkun</SecondaryButton>
        </Link>
      </div>
    )
  }

  const commitmentDisplay = karkun.currentCommitment.trim()
    ? karkun.currentCommitment
    : 'No commitment recorded.'

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            to={ROUTES.ADMIN_KARKUN}
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Back to Karkun
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-text-heading">{karkun.name}</h1>
          <div className="mt-3">
            <CampaignStatusBadge status={karkun.campaignStatus} />
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <SecondaryButton type="button">Edit</SecondaryButton>
          <SecondaryButton type="button">Visit History</SecondaryButton>
        </div>
      </div>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Profile</h2>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <ProfileField label="Name" value={karkun.name} />
          <ProfileField label="Mobile" value={karkun.mobile} />
          <ProfileField label="Address" value={karkun.address || '—'} />
          <ProfileField label="Area" value={karkun.area} />
          <ProfileField label="Assigned Rukn" value={karkun.assignedRukn} />
          <ProfileField
            label="Campaign Status"
            value={CAMPAIGN_STATUS_LABELS[karkun.campaignStatus]}
          />
          <ProfileField
            label="Administrator JIH Review"
            value={JIH_STATUS_LABELS[karkun.jihRegistration]}
          />
          <ProfileField label="Visit Status" value={VISIT_STATUS_LABELS[karkun.visitStatus]} />
          <ProfileField label="Last Meeting" value={karkun.lastVisit ?? '—'} />
        </dl>

        <div className="mt-4">
          <ProfileField label="Notes" value={karkun.notes || '—'} />
        </div>
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Assignment</h2>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <ProfileField label="Assignment Status" value={karkun.assignmentStatus} />
          <ProfileField
            label="Assigned Rukn"
            value={karkun.assignedRukn.trim() ? karkun.assignedRukn : '—'}
          />
          <ProfileField
            label="Assignment Date"
            value={karkun.assignmentDate ?? '—'}
          />
        </dl>
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <h2 className="text-lg font-semibold text-text-heading">Meeting Outcomes</h2>
        <p className="mt-1 text-sm text-secondary">
          Latest commitment and JIH App registration from field meetings.
        </p>

        <dl className="mt-4 space-y-4">
          <ProfileField label="Current Commitment" value={commitmentDisplay} />
          <ProfileField
            label="JIH App Registration"
            value={karkun.jihAppRegistrationStatus}
          />
        </dl>
      </section>
    </div>
  )
}
