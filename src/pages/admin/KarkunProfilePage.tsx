import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { ROUTES } from '@/constants/routes'
import { changeKarkunRuknAssignment } from '@/lib/assignmentEngine'
import { updateKarkun } from '@/lib/peopleStore'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import { getCurrentBaitulMaalStatus, updateBaitulMaal } from '@/services/baitulMaalService'
import { getCurrentIjtemaAttendance, updateIjtemaAttendance } from '@/services/ijtemaAttendanceService'
import {
  getCurrentMonthReportingStatus,
  getRegistrationForKarkun,
  updateJihMonthlyReport,
  updateJihRegistration,
} from '@/services/jihWebPortalService'
import { InputField } from '@/components/forms/InputField'
import { PersonContactActions } from '@/components/forms/people/PersonContactActions'
import { CommunicationActions } from '@/components/communication/CommunicationActions'
import { useCommunication } from '@/hooks/useCommunication'
import { RuknAssignmentSelect } from '@/components/forms/people/RuknAssignmentSelect'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import type { KarkunRegistryRecord, PersonGender, PersonStatus } from '@/types/karkun-registry.types'
import type { IjtemaAttendanceStatus } from '@/types/ijtemaAttendance'
import { DEFAULT_PLACE, getFatherHusbandLabel } from '@/types/people.types'
import { formatPersonNameForDisplay } from '@/utils/formatPersonDisplay'
import { MOBILE_INPUT_PLACEHOLDER } from '@/utils/personContactLinks'

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

const compactInputClass = 'px-3 py-2 text-sm'

type ComplianceToggleProps = {
  id: string
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function ComplianceToggle({ id, label, checked, onChange }: ComplianceToggleProps) {
  return (
    <label
      htmlFor={id}
      className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2.5 hover:border-primary/40"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="size-4 rounded border-border text-primary focus:ring-primary/20"
      />
      <span className="text-sm font-medium text-text-heading">{label}</span>
    </label>
  )
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function IjtemaStatusField({
  value,
  onChange,
}: {
  value: IjtemaAttendanceStatus | null
  onChange: (status: IjtemaAttendanceStatus) => void
}) {
  const options: IjtemaAttendanceStatus[] = ['Present', 'Absent', 'Informed']

  return (
    <fieldset className="rounded-lg border border-border bg-surface px-3 py-3 sm:col-span-2">
      <legend className="text-sm font-semibold text-text-heading">Weekly Ijtema</legend>
      <div className="mt-2 flex flex-wrap gap-3">
        {options.map((option) => (
          <label
            key={option}
            className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 text-sm font-medium has-[:checked]:border-primary/30 has-[:checked]:bg-primary/5"
          >
            <input
              type="radio"
              name="ijtema-status"
              checked={value === option}
              onChange={() => onChange(option)}
              className="size-4 border-border text-primary focus:ring-primary/20"
            />
            <span className="text-text-heading">{option}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function readComplianceState(karkunId: string) {
  const ijtema = getCurrentIjtemaAttendance(karkunId)
  const registration = getRegistrationForKarkun(karkunId)
  const monthly = getCurrentMonthReportingStatus(karkunId)
  const baitulMaal = getCurrentBaitulMaalStatus(karkunId)

  const ijtemaStatus: IjtemaAttendanceStatus | null =
    ijtema.status === 'Not recorded' ? null : ijtema.status

  return {
    ijtemaStatus,
    jihPortalRegistered: registration.status === 'Registered',
    monthlyReportSubmitted: monthly.status === 'Submitted',
    baitulMaalPaid: baitulMaal.status === 'Paid',
  }
}

type KarkunProfileFormProps = {
  karkun: KarkunRegistryRecord
  karkunId: string
}

function KarkunProfileForm({ karkun, karkunId }: KarkunProfileFormProps) {
  const navigate = useNavigate()
  const { sendIndividualMessage } = useCommunication()
  const initialCompliance = readComplianceState(karkunId)

  const [name, setName] = useState(karkun.name)
  const [gender, setGender] = useState<PersonGender>(karkun.gender)
  const [mobile, setMobile] = useState(karkun.mobile)
  const [whatsapp, setWhatsapp] = useState(karkun.whatsapp ?? '')
  const [status, setStatus] = useState<PersonStatus>(karkun.status)
  const [fatherHusbandName, setFatherHusbandName] = useState(karkun.fatherHusbandName ?? '')
  const [assignedRuknId, setAssignedRuknId] = useState(karkun.assignedRuknId)
  const [ijtemaStatus, setIjtemaStatus] = useState<IjtemaAttendanceStatus | null>(
    initialCompliance.ijtemaStatus,
  )
  const [jihPortalRegistered, setJihPortalRegistered] = useState(
    initialCompliance.jihPortalRegistered,
  )
  const [monthlyReportSubmitted, setMonthlyReportSubmitted] = useState(
    initialCompliance.monthlyReportSubmitted,
  )
  const [baitulMaalPaid, setBaitulMaalPaid] = useState(initialCompliance.baitulMaalPaid)
  const [error, setError] = useState('')

  const handleJihPortalChange = (checked: boolean) => {
    setJihPortalRegistered(checked)
    if (!checked) {
      setMonthlyReportSubmitted(false)
    }
  }

  const handleMonthlyReportChange = (checked: boolean) => {
    setMonthlyReportSubmitted(checked)
    if (checked) {
      setJihPortalRegistered(true)
    }
  }

  const handleCancel = () => {
    navigate(ROUTES.ADMIN_KARKUN)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    const karkunResult = updateKarkun(karkunId, {
      name,
      gender,
      mobile,
      whatsapp: whatsapp || undefined,
      place: DEFAULT_PLACE,
      status,
      fatherHusbandName: fatherHusbandName || undefined,
    })

    if (!karkunResult.success) {
      setError(karkunResult.error ?? 'Unable to save Karkun details.')
      return
    }

    const assignmentResult = changeKarkunRuknAssignment(karkunId, assignedRuknId)
    if (!assignmentResult.success) {
      setError(assignmentResult.error ?? 'Unable to update assignment.')
      return
    }

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
        return
      }

      const monthlyResult = updateJihMonthlyReport({
        karkunId,
        status: monthlyReportSubmitted ? 'Submitted' : 'Pending',
        submissionDate: monthlyReportSubmitted ? todayDate() : undefined,
      })

      if (!monthlyResult.success) {
        setError(monthlyResult.error)
        return
      }
    } else {
      const registrationResult = updateJihRegistration({
        karkunId,
        status: 'Not Registered',
      })

      if (!registrationResult.success) {
        setError(registrationResult.error)
        return
      }
    }

    if (ijtemaStatus !== null) {
      const ijtemaResult = updateIjtemaAttendance({
        karkunId,
        status: ijtemaStatus,
      })

      if (!ijtemaResult.success) {
        setError(ijtemaResult.error)
        return
      }
    }

    const baitulMaalResult = updateBaitulMaal({
      karkunId,
      status: baitulMaalPaid ? 'Paid' : 'Pending',
      paymentDate: baitulMaalPaid ? todayDate() : undefined,
    })

    if (!baitulMaalResult.success) {
      setError(baitulMaalResult.error)
      return
    }

    navigate(ROUTES.ADMIN_KARKUN)
  }

  return (
    <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
      <div className="flex shrink-0 items-start justify-between gap-4">
        <div className="min-w-0">
          <Link
            to={ROUTES.ADMIN_KARKUN}
            className="text-sm font-medium text-primary hover:underline"
          >
            ← Back to Karkun
          </Link>
          <h1 className="mt-1 truncate text-xl font-semibold text-text-heading">
            {formatPersonNameForDisplay(name)}
          </h1>
        </div>

        <div className="flex shrink-0 gap-2">
          <SecondaryButton type="button" className="px-4 py-2 text-sm" onClick={handleCancel}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit" className="px-4 py-2 text-sm">
            Save
          </PrimaryButton>
        </div>
      </div>

      <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
        <h2 className="text-sm font-semibold text-text-heading">Basic Information</h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <InputField
            id="profile-name"
            label="Full Name"
            value={name}
            onValueChange={setName}
            className={compactInputClass}
            required
          />

          <div className="flex flex-col gap-2">
            <label htmlFor="profile-assigned-rukn" className="text-sm font-medium text-text-heading">
              Assigned Rukn
            </label>
            <RuknAssignmentSelect
              karkunId={karkunId}
              value={assignedRuknId}
              compact
              onChange={setAssignedRuknId}
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="profile-gender" className="text-sm font-medium text-text-heading">
              Gender
            </label>
            <select
              id="profile-gender"
              value={gender}
              onChange={(event) => setGender(event.target.value as PersonGender)}
              className={selectClassName}
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="profile-status" className="text-sm font-medium text-text-heading">
              Status
            </label>
            <select
              id="profile-status"
              value={status}
              onChange={(event) => setStatus(event.target.value as PersonStatus)}
              className={selectClassName}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <InputField
            id="profile-mobile"
            label="Mobile Number"
            type="tel"
            value={mobile}
            onValueChange={setMobile}
            className={compactInputClass}
            placeholder={MOBILE_INPUT_PLACEHOLDER}
            required
          />

          <InputField
            id="profile-whatsapp"
            label="WhatsApp Number"
            type="tel"
            value={whatsapp}
            onValueChange={setWhatsapp}
            className={compactInputClass}
            placeholder={MOBILE_INPUT_PLACEHOLDER}
          />

          <InputField
            id="profile-father-husband"
            label={`${getFatherHusbandLabel(gender)} (optional)`}
            value={fatherHusbandName}
            onValueChange={setFatherHusbandName}
            className={compactInputClass}
            placeholder={getFatherHusbandLabel(gender)}
          />
        </div>

        <PersonContactActions mobile={mobile} whatsapp={whatsapp} />
        <div className="mt-3">
          <p className="mb-2 text-sm font-medium text-text-heading">Communication</p>
          <CommunicationActions
            personId={karkunId}
            personKind="karkun"
            name={name}
            mobile={mobile}
            whatsapp={whatsapp}
            onSend={async (input) => {
              const result = await sendIndividualMessage({
                channel: 'whatsapp',
                recipient: {
                  personId: karkunId,
                  personKind: 'karkun',
                  name,
                  mobile,
                  whatsapp: whatsapp || undefined,
                },
                templateId: input.templateId,
                message: input.message,
              })
              return result.success
                ? { success: true }
                : { success: false, error: result.error }
            }}
          />
        </div>
      </section>

      <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card">
        <h2 className="text-sm font-semibold text-text-heading">Compliance</h2>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <IjtemaStatusField value={ijtemaStatus} onChange={setIjtemaStatus} />
          <ComplianceToggle
            id="compliance-jih-portal"
            label="JIH Portal Registered"
            checked={jihPortalRegistered}
            onChange={handleJihPortalChange}
          />
          {jihPortalRegistered && (
            <ComplianceToggle
              id="compliance-monthly-report"
              label="Monthly Report Submitted"
              checked={monthlyReportSubmitted}
              onChange={handleMonthlyReportChange}
            />
          )}
          <ComplianceToggle
            id="compliance-baitul-maal"
            label="Bait-ul-Maal Paid"
            checked={baitulMaalPaid}
            onChange={setBaitulMaalPaid}
          />
        </div>
      </section>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  )
}

export function KarkunProfilePage() {
  const { karkunId } = useParams<{ karkunId: string }>()
  useAssignmentEngine()
  usePeopleStore()

  const karkun = karkunId ? getKarkunById(karkunId) : undefined

  if (!karkun || !karkunId) {
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

  return (
    <div className="mx-auto max-w-4xl overflow-hidden">
      <KarkunProfileForm key={karkunId} karkun={karkun} karkunId={karkunId} />
    </div>
  )
}
