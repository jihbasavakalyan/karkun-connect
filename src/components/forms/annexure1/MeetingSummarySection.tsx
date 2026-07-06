import { TextAreaField } from '@/components/forms/TextAreaField'
import { FormSectionCard } from '@/components/forms/annexure1/FormSectionCard'
import type { Annexure1FormState } from '@/types/annexure1.types'
import type { Annexure1FormFieldUpdater } from '@/hooks/useAnnexure1Form'

type MeetingSummarySectionProps = {
  form: Annexure1FormState
  setField: Annexure1FormFieldUpdater
}

export function MeetingSummarySection({ form, setField }: MeetingSummarySectionProps) {
  return (
    <FormSectionCard title="Meeting Summary">
      <TextAreaField
        id="discussion-summary"
        label="Discussion Summary"
        value={form.discussionSummary}
        onValueChange={(value) => setField('discussionSummary', value)}
        placeholder="Brief summary of the meeting..."
        rows={4}
      />
    </FormSectionCard>
  )
}
