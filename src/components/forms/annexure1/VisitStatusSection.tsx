import { Link } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { InputField } from '@/components/forms/InputField'
import { FormSectionCard, LargeRadioOption } from '@/components/forms/annexure1/FormSectionCard'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import type { Annexure1FormState } from '@/types/annexure1.types'
import type { Annexure1FormFieldUpdater } from '@/hooks/useAnnexure1Form'

type VisitStatusSectionProps = {
  form: Annexure1FormState
  setField: Annexure1FormFieldUpdater
}

export function VisitStatusSection({ form, setField }: VisitStatusSectionProps) {
  return (
    <FormSectionCard title="Visit Status">
      <div className="space-y-4">
        <InputField
          id="visit-date"
          label="Visit Date"
          type="date"
          value={form.visitDate}
          onValueChange={(value) => setField('visitDate', value)}
        />

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-text-heading">Visit Conducted?</legend>
          <LargeRadioOption
            name="visit-conducted"
            value="yes"
            checked={form.visitConducted === 'yes'}
            label="Yes"
            onChange={(value) => setField('visitConducted', value as 'yes')}
          />
          <LargeRadioOption
            name="visit-conducted"
            value="no"
            checked={form.visitConducted === 'no'}
            label="No"
            onChange={(value) => setField('visitConducted', value as 'no')}
          />
        </fieldset>

        {form.visitConducted === 'no' && (
          <div className="space-y-4 rounded-lg border border-border bg-surface-muted p-4">
            <InputField
              id="not-conducted-reason"
              label="Reason"
              value={form.notConductedReason}
              onValueChange={(value) => setField('notConductedReason', value)}
              placeholder="Why was the visit not conducted?"
            />
            <Link to={ROUTES.RUKN}>
              <PrimaryButton type="button" fullWidth>
                Return
              </PrimaryButton>
            </Link>
          </div>
        )}
      </div>
    </FormSectionCard>
  )
}
