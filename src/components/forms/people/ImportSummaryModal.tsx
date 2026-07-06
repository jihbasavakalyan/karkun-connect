import type { ImportSummary } from '@/types/people.types'
import { Modal } from '@/components/common/Modal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { exportDuplicateReport } from '@/lib/peopleImportExport'
import type { PersonKind } from '@/types/people.types'

type ImportSummaryModalProps = {
  isOpen: boolean
  summary: ImportSummary | null
  kind: PersonKind
  onClose: () => void
}

export function ImportSummaryModal({ isOpen, summary, kind, onClose }: ImportSummaryModalProps) {
  if (!summary) {
    return null
  }

  const allDuplicates = [...summary.duplicateMobiles, ...summary.existingRecords]

  return (
    <Modal isOpen={isOpen} title="Import Summary" onClose={onClose}>
      <div className="space-y-4 text-sm">
        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-secondary">Imported</dt>
            <dd className="font-semibold text-green-700">{summary.imported}</dd>
          </div>
          <div>
            <dt className="text-secondary">Skipped</dt>
            <dd className="font-semibold text-text-heading">{summary.skipped}</dd>
          </div>
          <div>
            <dt className="text-secondary">Duplicate Mobiles</dt>
            <dd className="font-semibold text-amber-700">{summary.duplicateMobiles.length}</dd>
          </div>
          <div>
            <dt className="text-secondary">Invalid Mobiles</dt>
            <dd className="font-semibold text-red-700">{summary.invalidMobiles.length}</dd>
          </div>
          <div>
            <dt className="text-secondary">Existing Records</dt>
            <dd className="font-semibold text-amber-700">{summary.existingRecords.length}</dd>
          </div>
          <div>
            <dt className="text-secondary">Possible Duplicate Names</dt>
            <dd className="font-semibold text-amber-700">{summary.possibleNameDuplicates.length}</dd>
          </div>
        </dl>

        {summary.invalidMobiles.length > 0 && (
          <div>
            <h3 className="font-semibold text-text-heading">Invalid Mobiles</h3>
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-secondary">
              {summary.invalidMobiles.slice(0, 10).map((error) => (
                <li key={`invalid-${error.row}-${error.mobile}`}>
                  Row {error.row}: {error.name || '—'} — {error.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.existingRecords.length > 0 && (
          <div>
            <h3 className="font-semibold text-text-heading">Existing Records</h3>
            <p className="mt-1 text-secondary">
              These mobile numbers already exist. Records were not overwritten.
            </p>
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-secondary">
              {summary.existingRecords.slice(0, 10).map((row) => (
                <li key={`existing-${row.row}-${row.mobile}`}>
                  Row {row.row}: {row.name} — matches {row.existingPerson}
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.duplicateMobiles.length > 0 && (
          <div>
            <h3 className="font-semibold text-text-heading">Duplicate Mobiles in File</h3>
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-secondary">
              {summary.duplicateMobiles.slice(0, 10).map((row) => (
                <li key={`dup-${row.row}-${row.mobile}`}>
                  Row {row.row}: {row.name} — {row.existingPerson}
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.possibleNameDuplicates.length > 0 && (
          <div>
            <h3 className="font-semibold text-text-heading">Possible Duplicate Names</h3>
            <p className="mt-1 text-secondary">
              These names look similar to existing records. Import was not blocked — review
              recommended.
            </p>
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-secondary">
              {summary.possibleNameDuplicates.slice(0, 10).map((row, index) => (
                <li key={`name-${row.row}-${index}`}>
                  Row {row.row}: {row.name} — similar to {row.similarTo}
                </li>
              ))}
            </ul>
          </div>
        )}

        {summary.otherErrors.length > 0 && (
          <div>
            <h3 className="font-semibold text-text-heading">Other Errors</h3>
            <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-secondary">
              {summary.otherErrors.slice(0, 10).map((error) => (
                <li key={`other-${error.row}-${error.mobile}`}>
                  Row {error.row}: {error.name || '—'} — {error.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {allDuplicates.length > 0 && (
          <SecondaryButton
            type="button"
            className="mt-2"
            onClick={() => exportDuplicateReport(allDuplicates, kind)}
          >
            Download Duplicate Report
          </SecondaryButton>
        )}

        <PrimaryButton type="button" fullWidth onClick={onClose}>
          Done
        </PrimaryButton>
      </div>
    </Modal>
  )
}
