import { TextAreaField } from '@/components/forms/TextAreaField'
import { FormSectionCard, LargeRadioOption } from '@/components/forms/annexure1/FormSectionCard'
import { JIH_REGISTRATION_OPTIONS } from '@/types/annexure1.types'
import type { Annexure1FormState, JihRegistrationChoice } from '@/types/annexure1.types'
import type { Annexure1FormFieldUpdater } from '@/hooks/useAnnexure1Form'

type JIHRegistrationSectionProps = {
  form: Annexure1FormState
  setField: Annexure1FormFieldUpdater
}

export function JIHRegistrationSection({ form, setField }: JIHRegistrationSectionProps) {
  return (
    <FormSectionCard title="JIH Registration">
      <div className="space-y-4">
        <p className="text-sm text-secondary">Registered in JIH Portal?</p>

        <fieldset className="space-y-3">
          {JIH_REGISTRATION_OPTIONS.map((option) => (
            <LargeRadioOption
              key={option.value}
              name="jih-registration"
              value={option.value}
              checked={form.jihRegistration === option.value}
              label={option.label}
              onChange={(value) => setField('jihRegistration', value as JihRegistrationChoice)}
            />
          ))}
        </fieldset>

        {form.jihRegistration === 'recommended_to_administrator' && (
          <TextAreaField
            id="jih-recommendation-note"
            label="Recommendation Note"
            value={form.jihRecommendationNote}
            onValueChange={(value) => setField('jihRecommendationNote', value)}
            placeholder="Notes for the administrator..."
            rows={3}
          />
        )}
      </div>
    </FormSectionCard>
  )
}
