import { useEffect, useState } from 'react'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { getCurrentBaitulMaalStatus } from '@/services/baitulMaalService'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'
import { ComplianceProfileField } from '@/components/forms/compliance/ComplianceProfileField'
import { BaitulMaalEditModal } from '@/components/forms/baitulMaal/BaitulMaalEditModal'

type BaitulMaalCardProps = {
  karkunId: string
  karkunName: string
}

export function BaitulMaalCard({ karkunId, karkunName }: BaitulMaalCardProps) {
  const [, setVersion] = useState(0)
  const [isEditing, setIsEditing] = useState(false)

  useEffect(() => {
    return subscribeToBaitulMaalStore(() => setVersion((value) => value + 1))
  }, [])

  const compliance = getCurrentBaitulMaalStatus(karkunId)
  const amountDisplay =
    compliance.amount !== undefined ? String(compliance.amount) : '—'

  return (
    <>
      <div className="rounded-lg border border-border bg-surface-muted p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-text-heading">Monthly Bait-ul-Maal</h3>
            <p className="mt-1 text-sm text-secondary">
              Monthly contribution compliance — not a financial ledger.
            </p>
          </div>
          <SecondaryButton type="button" onClick={() => setIsEditing(true)}>
            Update
          </SecondaryButton>
        </div>

        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <ComplianceProfileField label="Current Month" value={compliance.monthLabel} />
          <ComplianceProfileField label="Status" value={compliance.status} />
          <ComplianceProfileField label="Payment Date" value={compliance.paymentDate ?? '—'} />
          <ComplianceProfileField label="Amount" value={amountDisplay} />
          {compliance.remarks && (
            <ComplianceProfileField label="Remarks" value={compliance.remarks} />
          )}
        </dl>
      </div>

      <BaitulMaalEditModal
        isOpen={isEditing}
        karkunId={karkunId}
        karkunName={karkunName}
        status={compliance.status}
        paymentDate={compliance.paymentDate ?? ''}
        amount={compliance.amount !== undefined ? String(compliance.amount) : ''}
        remarks={compliance.remarks ?? ''}
        onClose={() => setIsEditing(false)}
        onSaved={() => setVersion((value) => value + 1)}
      />
    </>
  )
}
