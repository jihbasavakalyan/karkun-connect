import { useEffect, useState } from 'react'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import {
  getCurrentMonthReportingStatus,
  getRegistrationForKarkun,
} from '@/services/jihWebPortalService'
import { subscribeToJihWebPortalStore } from '@/stores/jihWebPortalStore'
import { ComplianceProfileField } from '@/components/forms/compliance/ComplianceProfileField'
import { JihWebPortalEditModal } from '@/components/forms/jih/JihWebPortalEditModal'

type JihWebPortalCardProps = {
  karkunId: string
  karkunName: string
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
      <div className="rounded-lg border border-border bg-surface-muted p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-text-heading">JIH Web Portal</h3>
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
            <h4 className="text-sm font-semibold text-text-heading">Registration</h4>
            <dl className="mt-3 grid gap-4 sm:grid-cols-2">
              <ComplianceProfileField label="Status" value={registration.status} />
              <ComplianceProfileField
                label="Registration Number"
                value={registration.registrationNumber ?? '—'}
              />
              <ComplianceProfileField
                label="Registration Date"
                value={registration.registrationDate ?? '—'}
              />
              {registration.remarks && (
                <ComplianceProfileField label="Remarks" value={registration.remarks} />
              )}
            </dl>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-heading">Monthly Reporting</h4>
            <dl className="mt-3 grid gap-4 sm:grid-cols-2">
              <ComplianceProfileField label="Current Month" value={monthly.monthLabel} />
              <ComplianceProfileField
                label="Status"
                value={
                  registration.status === 'Registered' ? monthly.status : 'Not applicable'
                }
              />
              <ComplianceProfileField
                label="Submission Date"
                value={
                  registration.status === 'Registered' ? (monthly.submissionDate ?? '—') : '—'
                }
              />
              {monthly.remarks && (
                <ComplianceProfileField label="Remarks" value={monthly.remarks} />
              )}
            </dl>
          </div>
        </div>
      </div>

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
