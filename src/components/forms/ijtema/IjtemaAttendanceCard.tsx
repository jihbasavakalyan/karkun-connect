import { useEffect, useState } from 'react'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { getCurrentIjtemaAttendance } from '@/services/ijtemaAttendanceService'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { ComplianceProfileField } from '@/components/forms/compliance/ComplianceProfileField'
import { IjtemaAttendanceEditModal } from '@/components/forms/ijtema/IjtemaAttendanceEditModal'

type IjtemaAttendanceCardProps = {
  karkunId: string
  karkunName: string
}

function formatLastUpdated(updatedAt?: string): string {
  if (!updatedAt) return '—'
  return updatedAt.slice(0, 16).replace('T', ' ')
}

export function IjtemaAttendanceCard({ karkunId, karkunName }: IjtemaAttendanceCardProps) {
  const [, setVersion] = useState(0)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    return subscribeToIjtemaAttendanceStore(() => setVersion((value) => value + 1))
  }, [])

  const attendance = getCurrentIjtemaAttendance(karkunId)

  return (
    <>
      <div className="rounded-lg border border-border bg-surface-muted p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-text-heading">Weekly Ijtema</h3>
            <p className="mt-1 text-sm text-secondary">
              Weekly attendance compliance — not an event management system.
            </p>
          </div>
          <SecondaryButton type="button" onClick={() => setIsEditing(true)}>
            Update
          </SecondaryButton>
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <ComplianceProfileField
            label="Current Week"
            value={`Week ending ${attendance.weekLabel}`}
          />
          <ComplianceProfileField label="Attendance Status" value={attendance.status} />
          <ComplianceProfileField
            label="Last Updated"
            value={formatLastUpdated(attendance.updatedAt)}
          />
          {attendance.remarks && (
            <ComplianceProfileField label="Remarks" value={attendance.remarks} />
          )}
        </dl>
      </div>

      <IjtemaAttendanceEditModal
        isOpen={isEditing}
        karkunId={karkunId}
        karkunName={karkunName}
        status={attendance.status}
        remarks={attendance.remarks ?? ''}
        onClose={() => setIsEditing(false)}
        onSaved={() => setVersion((value) => value + 1)}
      />
    </>
  )
}
