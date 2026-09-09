/**
 * Collapsed Organisational / Reporting on Person Detail.
 * Reuses existing Weekly Ijtema, JIH, and Bait-ul-Maal write adapters (KC-0110 / KC-0112).
 */

import { useState, type FormEvent } from 'react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { getMonthlyBaitulMaalComplianceStatusView } from '@/lib/operations/monthlyBaitulMaalReadAdapter'
import { updateMonthlyBaitulMaalContribution } from '@/lib/operations/monthlyBaitulMaalWriteAdapter'
import { getWeeklyIjtemaCurrentAttendanceView } from '@/lib/operations/weeklyIjtemaReadAdapter'
import { markWeeklyIjtemaAttendance } from '@/lib/operations/weeklyIjtemaWriteAdapter'
import {
  getCurrentMonthReportingStatus,
  getRegistrationForKarkun,
  updateJihMonthlyReport,
  updateJihRegistration,
} from '@/services/jihWebPortalService'
import type { IjtemaAttendanceStatus } from '@/types/ijtemaAttendance'

type PersonOrganisationalReportingProps = {
  karkunId: string
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function readComplianceState(karkunId: string) {
  const ijtema = getWeeklyIjtemaCurrentAttendanceView(karkunId)
  const registration = getRegistrationForKarkun(karkunId)
  const monthly = getCurrentMonthReportingStatus(karkunId)
  const baitulMaal = getMonthlyBaitulMaalComplianceStatusView(karkunId)

  const ijtemaStatus: IjtemaAttendanceStatus | null =
    ijtema.status === 'Not recorded' ? null : ijtema.status

  return {
    ijtemaStatus,
    jihPortalRegistered: registration.status === 'Registered',
    monthlyReportSubmitted: monthly.status === 'Submitted',
    baitulMaalPaid: baitulMaal.status === 'Paid',
  }
}

export function PersonOrganisationalReporting({ karkunId }: PersonOrganisationalReportingProps) {
  const initial = readComplianceState(karkunId)
  const [ijtemaStatus, setIjtemaStatus] = useState<IjtemaAttendanceStatus | null>(
    initial.ijtemaStatus,
  )
  const [jihPortalRegistered, setJihPortalRegistered] = useState(initial.jihPortalRegistered)
  const [monthlyReportSubmitted, setMonthlyReportSubmitted] = useState(
    initial.monthlyReportSubmitted,
  )
  const [baitulMaalPaid, setBaitulMaalPaid] = useState(initial.baitulMaalPaid)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const handleJihPortalChange = (checked: boolean) => {
    setJihPortalRegistered(checked)
    if (!checked) setMonthlyReportSubmitted(false)
  }

  const handleMonthlyReportChange = (checked: boolean) => {
    setMonthlyReportSubmitted(checked)
    if (checked) setJihPortalRegistered(true)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    const existingRegistration = getRegistrationForKarkun(karkunId)

    if (jihPortalRegistered) {
      const registrationResult = updateJihRegistration({
        karkunId,
        status: 'Registered',
        registrationDate: existingRegistration.registrationDate ?? todayDate(),
        registrationNumber: existingRegistration.registrationNumber,
      })
      if (!registrationResult.success) {
        setError(registrationResult.error)
        setSaving(false)
        return
      }
      const monthlyResult = updateJihMonthlyReport({
        karkunId,
        status: monthlyReportSubmitted ? 'Submitted' : 'Pending',
        submissionDate: monthlyReportSubmitted ? todayDate() : undefined,
      })
      if (!monthlyResult.success) {
        setError(monthlyResult.error)
        setSaving(false)
        return
      }
    } else {
      const registrationResult = updateJihRegistration({
        karkunId,
        status: 'Not Registered',
      })
      if (!registrationResult.success) {
        setError(registrationResult.error)
        setSaving(false)
        return
      }
    }

    if (ijtemaStatus !== null) {
      const ijtemaResult = markWeeklyIjtemaAttendance({
        karkunId,
        status: ijtemaStatus,
      })
      if (!ijtemaResult.success) {
        setError(ijtemaResult.error)
        setSaving(false)
        return
      }
    }

    const baitulMaalResult = updateMonthlyBaitulMaalContribution({
      karkunId,
      status: baitulMaalPaid ? 'Paid' : 'Pending',
      paymentDate: baitulMaalPaid ? todayDate() : undefined,
    })
    if (!baitulMaalResult.success) {
      setError(baitulMaalResult.error)
      setSaving(false)
      return
    }

    setSaving(false)
    setSuccess('Reporting saved.')
  }

  const options: IjtemaAttendanceStatus[] = ['Present', 'Absent', 'Excused']

  return (
    <details className="kc-person-detail-disclosure">
      <summary>Organisational / Reporting</summary>
      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <fieldset>
          <legend className="text-sm font-semibold text-text-heading">Weekly Ijtema</legend>
          <div className="mt-2 flex flex-wrap gap-3">
            {options.map((option) => (
              <label
                key={option}
                className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 text-sm font-medium has-[:checked]:border-primary/30 has-[:checked]:bg-primary/5"
              >
                <input
                  type="radio"
                  name={`ijtema-status-${karkunId}`}
                  checked={ijtemaStatus === option}
                  onChange={() => setIjtemaStatus(option)}
                  className="size-4 border-border text-primary focus:ring-primary/20"
                />
                <span className="text-text-heading">{option}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5">
          <input
            type="checkbox"
            checked={jihPortalRegistered}
            onChange={(event) => handleJihPortalChange(event.target.checked)}
            className="size-4 rounded border-border text-primary focus:ring-primary/20"
          />
          <span className="text-sm font-medium text-text-heading">JIH Portal Registered</span>
        </label>

        {jihPortalRegistered ? (
          <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5">
            <input
              type="checkbox"
              checked={monthlyReportSubmitted}
              onChange={(event) => handleMonthlyReportChange(event.target.checked)}
              className="size-4 rounded border-border text-primary focus:ring-primary/20"
            />
            <span className="text-sm font-medium text-text-heading">Monthly Report Submitted</span>
          </label>
        ) : null}

        <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5">
          <input
            type="checkbox"
            checked={baitulMaalPaid}
            onChange={(event) => setBaitulMaalPaid(event.target.checked)}
            className="size-4 rounded border-border text-primary focus:ring-primary/20"
          />
          <span className="text-sm font-medium text-text-heading">Bait-ul-Maal Paid</span>
        </label>

        {error ? (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="text-sm text-primary" role="status">
            {success}
          </p>
        ) : null}

        <PrimaryButton type="submit" className="px-4 py-2 text-sm" loading={saving} disabled={saving}>
          Save reporting
        </PrimaryButton>
      </form>
    </details>
  )
}
