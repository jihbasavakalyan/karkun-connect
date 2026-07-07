import { InputField } from '@/components/forms/InputField'
import { TextAreaField } from '@/components/forms/TextAreaField'
import { FormFieldGroup, LargeRadioOption } from '@/components/forms/annexure1/FormSectionCard'
import { todayIsoDate } from '@/lib/annexure1Dates'
import { JIH_APP_REGISTRATION_FORM_OPTIONS } from '@/types/annexure1.types'
import type { Annexure1FormState, JihAppRegistrationStatus } from '@/types/annexure1.types'
import type { Annexure1FormFieldUpdater } from '@/hooks/useAnnexure1Form'

type Annexure1ExecutionFormProps = {
  form: Annexure1FormState
  setField: Annexure1FormFieldUpdater
  showFullForm: boolean
}

const selectClassName =
  'min-h-[52px] w-full rounded-lg border border-border bg-surface px-4 py-3 text-base text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

export function Annexure1ExecutionForm({
  form,
  setField,
  showFullForm,
}: Annexure1ExecutionFormProps) {
  return (
    <section
      className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5"
      aria-label="Visit details form"
    >
      <FormFieldGroup title="Visit" first>
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
          <InputField
            id="not-conducted-reason"
            label="Reason"
            value={form.notConductedReason}
            onValueChange={(value) => setField('notConductedReason', value)}
            placeholder="Why was the visit not conducted?"
          />
        )}
      </FormFieldGroup>

      {showFullForm && (
        <>
          <FormFieldGroup title="Meeting">
            <TextAreaField
              id="discussion-summary"
              label="Discussion Summary"
              value={form.discussionSummary}
              onValueChange={(value) => setField('discussionSummary', value)}
              placeholder="Brief summary of the meeting..."
              rows={2}
            />
          </FormFieldGroup>

          <FormFieldGroup title="JIH App Registration">
            <div className="flex flex-col gap-2">
              <label htmlFor="jih-app-registration" className="text-sm font-medium text-text-heading">
                Registration Status
              </label>
              <select
                id="jih-app-registration"
                value={form.jihAppRegistrationStatus}
                onChange={(event) =>
                  setField(
                    'jihAppRegistrationStatus',
                    event.target.value as JihAppRegistrationStatus,
                  )
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
          </FormFieldGroup>

          <FormFieldGroup title="Commitment">
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
              <>
                <InputField
                  id="commitment-details"
                  label="Commitment Details"
                  value={form.commitmentDetails}
                  onValueChange={(value) => setField('commitmentDetails', value)}
                  placeholder="Describe the commitment..."
                />

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
              </>
            )}
          </FormFieldGroup>
        </>
      )}
    </section>
  )
}
