import { InputField } from '@/components/forms/InputField'
import { FormSectionCard } from '@/components/forms/annexure1/FormSectionCard'
import type { Annexure1FormState } from '@/types/annexure1.types'
import type { Annexure1FormFieldUpdater } from '@/hooks/useAnnexure1Form'

type CommitmentSectionProps = {
  form: Annexure1FormState
  setField: Annexure1FormFieldUpdater
}

export function CommitmentSection({ form, setField }: CommitmentSectionProps) {
  return (
    <FormSectionCard title="Commitment">
      <div className="space-y-4">
        <label className="flex min-h-[52px] cursor-pointer items-center gap-3 rounded-lg border border-border px-4 py-3">
          <input
            type="checkbox"
            checked={form.commitmentMade}
            onChange={(event) => setField('commitmentMade', event.target.checked)}
            className="h-5 w-5 rounded border-border text-primary focus:ring-primary/20"
          />
          <span className="text-base font-medium text-text-heading">Commitment Made</span>
        </label>

        {form.commitmentMade && (
          <InputField
            id="commitment-details"
            label="Commitment Details"
            value={form.commitmentDetails}
            onValueChange={(value) => setField('commitmentDetails', value)}
            placeholder="Describe the commitment..."
          />
        )}
      </div>
    </FormSectionCard>
  )
}
