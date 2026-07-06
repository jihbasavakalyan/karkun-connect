import { FormSectionCard } from '@/components/forms/annexure1/FormSectionCard'
import { JIH_APP_REGISTRATION_FORM_OPTIONS } from '@/types/annexure1.types'
import type { Annexure1FormState, JihAppRegistrationStatus } from '@/types/annexure1.types'
import type { Annexure1FormFieldUpdater } from '@/hooks/useAnnexure1Form'

type JIHRegistrationSectionProps = {
  form: Annexure1FormState
  setField: Annexure1FormFieldUpdater
}

const selectClassName =
  'w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export function JIHRegistrationSection({ form, setField }: JIHRegistrationSectionProps) {
  return (
    <FormSectionCard title="JIH App Registration">
      <div className="space-y-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="jih-app-registration" className="text-sm font-medium text-text-heading">
            JIH App Registration
          </label>
          <select
            id="jih-app-registration"
            value={form.jihAppRegistrationStatus}
            onChange={(event) =>
              setField('jihAppRegistrationStatus', event.target.value as JihAppRegistrationStatus)
            }
            className={selectClassName}
          >
            {JIH_APP_REGISTRATION_FORM_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
    </FormSectionCard>
  )
}
