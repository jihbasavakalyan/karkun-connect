export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6

export type CampaignSetupState = {
  step: WizardStep
  name: string
  startDate: string
  endDate: string
  description: string
  enabledObjectives: Record<string, boolean>
  selectedRuknIds: string[]
  selectedKarkunIds: string[]
  assignments: Record<string, string[]>
  karkunSearch: string
  isLaunched: boolean
}

export type CampaignSetupAction =
  | { type: 'SET_STEP'; step: WizardStep }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'SET_FIELD'; field: 'name' | 'startDate' | 'endDate' | 'description'; value: string }
  | { type: 'TOGGLE_OBJECTIVE'; objectiveId: string }
  | { type: 'TOGGLE_RUKN'; ruknId: string }
  | { type: 'TOGGLE_KARKUN'; karkunId: string }
  | { type: 'SET_KARKUN_SEARCH'; value: string }
  | { type: 'PREPARE_ASSIGNMENTS' }
  | { type: 'LAUNCH_CAMPAIGN' }

export const initialCampaignSetupState = (): CampaignSetupState => ({
  step: 1,
  name: '',
  startDate: '',
  endDate: '',
  description: '',
  enabledObjectives: {},
  selectedRuknIds: [],
  selectedKarkunIds: [],
  assignments: {},
  karkunSearch: '',
  isLaunched: false,
})
