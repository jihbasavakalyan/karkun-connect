import { InputField } from '@/components/forms/InputField'
import { FormSectionCard, LargeRadioOption } from '@/components/forms/annexure1/FormSectionCard'
import type { Annexure1FormState } from '@/types/annexure1.types'
import type { Annexure1FormFieldUpdater } from '@/hooks/useAnnexure1Form'

type FollowUpSectionProps = {
  form: Annexure1FormState
  setField: Annexure1FormFieldUpdater
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10)
}

export function FollowUpSection({ form, setField }: FollowUpSectionProps) {
  return (
    <FormSectionCard title="Follow-up">
      <div className="space-y-4">
        <p className="text-sm text-secondary">
          Most meetings need no follow-up. Create one only when another interaction is required.
        </p>

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-text-heading">Follow-up Required?</legend>
          <LargeRadioOption
            name="follow-up-required"
            value="yes"
            checked={form.followUpRequired === 'yes'}
            label="Yes"
            onChange={(value) => setField('followUpRequired', value as 'yes')}
          />
          <LargeRadioOption
            name="follow-up-required"
            value="no"
            checked={form.followUpRequired === 'no'}
            label="No"
            onChange={(value) => setField('followUpRequired', value as 'no')}
          />
        </fieldset>

        {form.followUpRequired === 'yes' && (
          <div className="space-y-4">
            <InputField
              id="follow-up-date"
              label="Follow-up Date"
              type="date"
              min={todayIsoDate()}
              value={form.followUpDate}
              onValueChange={(value) => setField('followUpDate', value)}
            />
            <InputField
              id="follow-up-purpose"
              label="Follow-up Purpose"
              value={form.followUpPurpose}
              onValueChange={(value) => setField('followUpPurpose', value)}
              placeholder="e.g. Weekly Ijtema Reminder"
            />
          </div>
        )}
      </div>
    </FormSectionCard>
  )
}
