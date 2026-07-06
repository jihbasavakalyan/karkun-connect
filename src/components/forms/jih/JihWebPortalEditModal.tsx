import { useState, type FormEvent } from 'react'
import { Modal } from '@/components/common/Modal'
import { InputField } from '@/components/forms/InputField'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import {
  updateJihMonthlyReport,
  updateJihRegistration,
} from '@/services/jihWebPortalService'
import type {
  JihMonthlyReportingStatus,
  JihWebPortalRegistrationStatus,
} from '@/types/jihWebPortal'

type JihWebPortalEditModalProps = {
  isOpen: boolean
  karkunId: string
  karkunName: string
  registrationStatus: JihWebPortalRegistrationStatus
  registrationNumber: string
  registrationDate: string
  registrationRemarks: string
  monthlyStatus: JihMonthlyReportingStatus
  submissionDate: string
  monthlyRemarks: string
  onClose: () => void
  onSaved: () => void
}

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export function JihWebPortalEditModal({
  isOpen,
  karkunId,
  karkunName,
  registrationStatus,
  registrationNumber,
  registrationDate,
  registrationRemarks,
  monthlyStatus,
  submissionDate,
  monthlyRemarks,
  onClose,
  onSaved,
}: JihWebPortalEditModalProps) {
  if (!isOpen) {
    return null
  }

  return (
    <JihWebPortalEditModalContent
      key={`${karkunId}-${registrationStatus}-${monthlyStatus}`}
      karkunId={karkunId}
      karkunName={karkunName}
      registrationStatus={registrationStatus}
      registrationNumber={registrationNumber}
      registrationDate={registrationDate}
      registrationRemarks={registrationRemarks}
      monthlyStatus={monthlyStatus}
      submissionDate={submissionDate}
      monthlyRemarks={monthlyRemarks}
      onClose={onClose}
      onSaved={onSaved}
    />
  )
}

function JihWebPortalEditModalContent({
  karkunId,
  karkunName,
  registrationStatus,
  registrationNumber,
  registrationDate,
  registrationRemarks,
  monthlyStatus,
  submissionDate,
  monthlyRemarks,
  onClose,
  onSaved,
}: Omit<JihWebPortalEditModalProps, 'isOpen'>) {
  const [status, setStatus] = useState<JihWebPortalRegistrationStatus>(registrationStatus)
  const [regNumber, setRegNumber] = useState(registrationNumber)
  const [regDate, setRegDate] = useState(registrationDate)
  const [regRemarks, setRegRemarks] = useState(registrationRemarks)
  const [reportStatus, setReportStatus] = useState<JihMonthlyReportingStatus>(monthlyStatus)
  const [reportDate, setReportDate] = useState(submissionDate)
  const [reportRemarks, setReportRemarks] = useState(monthlyRemarks)
  const [error, setError] = useState('')

  const canEditReporting = status === 'Registered'

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const registrationResult = updateJihRegistration({
      karkunId,
      status,
      registrationNumber: regNumber,
      registrationDate: regDate,
      remarks: regRemarks,
    })

    if (!registrationResult.success) {
      setError(registrationResult.error)
      return
    }

    if (canEditReporting) {
      const monthlyResult = updateJihMonthlyReport({
        karkunId,
        status: reportStatus,
        submissionDate: reportDate,
        remarks: reportRemarks,
      })

      if (!monthlyResult.success) {
        setError(monthlyResult.error)
        return
      }
    }

    onSaved()
    onClose()
  }

  return (
    <Modal isOpen title="Update JIH Web Portal" onClose={onClose}>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <p className="text-sm text-secondary">
          Update portal compliance for{' '}
          <strong className="text-text-heading">{karkunName}</strong>
        </p>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-text-heading">Registration</legend>

          <div className="flex flex-col gap-2">
            <label htmlFor="jih-registration-status" className="text-sm font-medium text-secondary">
              Registration Status
            </label>
            <select
              id="jih-registration-status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as JihWebPortalRegistrationStatus)
              }
              className={selectClassName}
            >
              <option value="Not Registered">Not Registered</option>
              <option value="Registered">Registered</option>
            </select>
          </div>

          <InputField
            id="jih-registration-number"
            label="Registration Number (optional)"
            value={regNumber}
            onValueChange={setRegNumber}
            placeholder="Portal registration number"
          />

          <InputField
            id="jih-registration-date"
            label="Registration Date"
            type="date"
            value={regDate}
            onValueChange={setRegDate}
            required={status === 'Registered'}
          />

          <div className="flex flex-col gap-2">
            <label htmlFor="jih-registration-remarks" className="text-sm font-medium text-secondary">
              Remarks (optional)
            </label>
            <textarea
              id="jih-registration-remarks"
              value={regRemarks}
              onChange={(event) => setRegRemarks(event.target.value)}
              rows={2}
              className={selectClassName}
            />
          </div>
        </fieldset>

        <fieldset className="space-y-4">
          <legend className="text-sm font-semibold text-text-heading">Monthly Reporting</legend>

          {!canEditReporting ? (
            <p className="text-sm text-secondary">
              Monthly reporting is available only after registration is marked Registered.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                <label htmlFor="jih-reporting-status" className="text-sm font-medium text-secondary">
                  Reporting Status
                </label>
                <select
                  id="jih-reporting-status"
                  value={reportStatus}
                  onChange={(event) =>
                    setReportStatus(event.target.value as JihMonthlyReportingStatus)
                  }
                  className={selectClassName}
                >
                  <option value="Pending">Pending</option>
                  <option value="Submitted">Submitted</option>
                </select>
              </div>

              <InputField
                id="jih-submission-date"
                label="Submission Date"
                type="date"
                value={reportDate}
                onValueChange={setReportDate}
              />

              <div className="flex flex-col gap-2">
                <label htmlFor="jih-reporting-remarks" className="text-sm font-medium text-secondary">
                  Remarks (optional)
                </label>
                <textarea
                  id="jih-reporting-remarks"
                  value={reportRemarks}
                  onChange={(event) => setReportRemarks(event.target.value)}
                  rows={2}
                  className={selectClassName}
                />
              </div>
            </>
          )}
        </fieldset>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit">Save</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
