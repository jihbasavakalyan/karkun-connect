import { useEffect, useState } from 'react'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import {
  getCurrentMonthReportingStatus,
  getRegistrationForKarkun,
} from '@/services/jihWebPortalService'
import { subscribeToJihWebPortalStore } from '@/stores/jihWebPortalStore'
import { JihWebPortalEditModal } from '@/components/forms/jih/JihWebPortalEditModal'

type JihWebPortalCardProps = {
  karkunId: string
  karkunName: string
}

function ProfileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-4 py-3">
      <dt className="text-sm text-secondary">{label}</dt>
      <dd className="mt-1 font-medium text-text-heading">{value}</dd>
    </div>
  )
}

export function JihWebPortalCard({ karkunId, karkunName }: JihWebPortalCardProps) {
  const [, setVersion] = useState(0)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    return subscribeToJihWebPortalStore(() => setVersion((value) => value + 1))
  }, [])

  const registration = getRegistrationForKarkun(karkunId)
  const monthly = getCurrentMonthReportingStatus(karkunId)

  return (
    <>
      <section className="rounded-(--radius-card) border border-border bg-surface p-6 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-heading">JIH Web Portal</h2>
            <p className="mt-1 text-sm text-secondary">
              Portal registration and monthly report compliance.
            </p>
          </div>
          <SecondaryButton type="button" onClick={() => setIsEditing(true)}>
            Update
          </SecondaryButton>
        </div>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-text-heading">Registration</h3>
            <dl className="mt-3 grid gap-4 sm:grid-cols-2">
              <ProfileField label="Status" value={registration.status} />
              <ProfileField label="Registration Number" value={registration.registrationNumber ?? '—'} />
              <ProfileField
                label="Registration Date"
                value={registration.registrationDate ?? '—'}
              />
              {registration.remarks && (
                <ProfileField label="Remarks" value={registration.remarks} />
              )}
            </dl>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text-heading">Monthly Reporting</h3>
            <dl className="mt-3 grid gap-4 sm:grid-cols-2">
              <ProfileField label="Current Month" value={monthly.monthLabel} />
              <ProfileField
                label="Status"
                value={
                  registration.status === 'Registered' ? monthly.status : 'Not applicable'
                }
              />
              <ProfileField
                label="Submission Date"
                value={
                  registration.status === 'Registered' ? (monthly.submissionDate ?? '—') : '—'
                }
              />
              {monthly.remarks && (
                <ProfileField label="Remarks" value={monthly.remarks} />
              )}
            </dl>
          </div>
        </div>
      </section>

      <JihWebPortalEditModal
        isOpen={isEditing}
        karkunId={karkunId}
        karkunName={karkunName}
        registrationStatus={registration.status}
        registrationNumber={registration.registrationNumber ?? ''}
        registrationDate={registration.registrationDate ?? ''}
        registrationRemarks={registration.remarks ?? ''}
        monthlyStatus={monthly.status}
        submissionDate={monthly.submissionDate ?? ''}
        monthlyRemarks={monthly.remarks ?? ''}
        onClose={() => setIsEditing(false)}
        onSaved={() => setVersion((value) => value + 1)}
      />
    </>
  )
}
