import type { Dispatch } from 'react'
import { InputField } from '@/components/forms/InputField'
import { TextAreaField } from '@/components/forms/TextAreaField'
import { getActiveCampaignName } from '@/services/campaignService'
import type { CampaignSetupAction, CampaignSetupState } from '@/types/campaign-setup.types'

type StepCampaignInfoProps = {
  state: CampaignSetupState
  dispatch: Dispatch<CampaignSetupAction>
}

export function StepCampaignInfo({ state, dispatch }: StepCampaignInfoProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-semibold text-text-heading">Campaign Information</h2>
        <p className="mt-1 text-sm text-secondary">
          Enter the basic details for this campaign.
        </p>
      </div>

      <InputField
        id="campaign-name"
        label="Campaign Name"
        placeholder={`e.g. ${getActiveCampaignName()}`}
        value={state.name}
        onValueChange={(value) => dispatch({ type: 'SET_FIELD', field: 'name', value })}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <InputField
          id="campaign-start"
          label="Campaign Start Date"
          type="date"
          value={state.startDate}
          onValueChange={(value) => dispatch({ type: 'SET_FIELD', field: 'startDate', value })}
        />
        <InputField
          id="campaign-end"
          label="Campaign End Date"
          type="date"
          value={state.endDate}
          onValueChange={(value) => dispatch({ type: 'SET_FIELD', field: 'endDate', value })}
        />
      </div>

      <TextAreaField
        id="campaign-description"
        label="Campaign Description"
        placeholder="Describe the purpose and scope of this campaign..."
        value={state.description}
        onValueChange={(value) => dispatch({ type: 'SET_FIELD', field: 'description', value })}
      />
    </div>
  )
}
