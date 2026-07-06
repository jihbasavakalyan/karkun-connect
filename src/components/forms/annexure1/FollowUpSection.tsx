import { InputField } from '@/components/forms/InputField'
import { TextAreaField } from '@/components/forms/TextAreaField'
import { FormSectionCard, LargeRadioOption } from '@/components/forms/annexure1/FormSectionCard'
import type { Annexure1FormState } from '@/types/annexure1.types'
import type { Annexure1FormFieldUpdater } from '@/hooks/useAnnexure1Form'

type FollowUpSectionProps = {
  form: Annexure1FormState
  setField: Annexure1FormFieldUpdater
}

export function FollowUpSection({ form, setField }: FollowUpSectionProps) {
  return (
    <FormSectionCard title="Follow-up">
      <div className="space-y-4">
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
              value={form.followUpDate}
              onValueChange={(value) => setField('followUpDate', value)}
            />
            <TextAreaField
              id="follow-up-note"
              label="Follow-up Note"
              value={form.followUpNote}
              onValueChange={(value) => setField('followUpNote', value)}
              placeholder="Follow-up instructions..."
              rows={3}
            />
          </div>
        )}
      </div>
    </FormSectionCard>
  )
}
