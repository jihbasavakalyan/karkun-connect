import { useReducer } from 'react'
import { APPROVED_CAMPAIGN_OBJECTIVES } from '@/constants/mockCampaignSetup'
import {
  initialCampaignSetupState,
  type CampaignSetupAction,
  type CampaignSetupState,
  type WizardStep,
} from '@/types/campaign-setup.types'

function buildDefaultObjectives(): Record<string, boolean> {
  return Object.fromEntries(
    APPROVED_CAMPAIGN_OBJECTIVES.map((objective) => [objective.id, true]),
  )
}

function distributeAssignments(
  ruknIds: string[],
  karkunIds: string[],
): Record<string, string[]> {
  const assignments = Object.fromEntries(ruknIds.map((ruknId) => [ruknId, [] as string[]]))

  if (ruknIds.length === 0) {
    return assignments
  }

  karkunIds.forEach((karkunId, index) => {
    const ruknId = ruknIds[index % ruknIds.length]
    assignments[ruknId]?.push(karkunId)
  })

  return assignments
}

function campaignSetupReducer(
  state: CampaignSetupState,
  action: CampaignSetupAction,
): CampaignSetupState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, step: action.step }

    case 'NEXT_STEP':
      return {
        ...state,
        step: Math.min(state.step + 1, 6) as WizardStep,
      }

    case 'PREV_STEP':
      return {
        ...state,
        step: Math.max(state.step - 1, 1) as WizardStep,
      }

    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }

    case 'TOGGLE_OBJECTIVE':
      return {
        ...state,
        enabledObjectives: {
          ...state.enabledObjectives,
          [action.objectiveId]: !state.enabledObjectives[action.objectiveId],
        },
      }

    case 'TOGGLE_RUKN': {
      const isSelected = state.selectedRuknIds.includes(action.ruknId)
      return {
        ...state,
        selectedRuknIds: isSelected
          ? state.selectedRuknIds.filter((id) => id !== action.ruknId)
          : [...state.selectedRuknIds, action.ruknId],
      }
    }

    case 'TOGGLE_KARKUN': {
      const isSelected = state.selectedKarkunIds.includes(action.karkunId)
      return {
        ...state,
        selectedKarkunIds: isSelected
          ? state.selectedKarkunIds.filter((id) => id !== action.karkunId)
          : [...state.selectedKarkunIds, action.karkunId],
      }
    }

    case 'SET_KARKUN_SEARCH':
      return { ...state, karkunSearch: action.value }

    case 'PREPARE_ASSIGNMENTS':
      return {
        ...state,
        assignments: distributeAssignments(state.selectedRuknIds, state.selectedKarkunIds),
      }

    case 'LAUNCH_CAMPAIGN':
      return { ...state, isLaunched: true }

    default:
      return state
  }
}

export function useCampaignSetupWizard() {
  const [state, dispatch] = useReducer(campaignSetupReducer, undefined, () => ({
    ...initialCampaignSetupState(),
    enabledObjectives: buildDefaultObjectives(),
  }))

  const goNext = () => {
    if (state.step === 3) {
      dispatch({ type: 'PREPARE_ASSIGNMENTS' })
    }
    dispatch({ type: 'NEXT_STEP' })
  }

  const goBack = () => dispatch({ type: 'PREV_STEP' })

  const launchCampaign = () => dispatch({ type: 'LAUNCH_CAMPAIGN' })

  return { state, dispatch, goNext, goBack, launchCampaign }
}

export function getTotalAssignments(state: CampaignSetupState): number {
  return Object.values(state.assignments).reduce((total, ids) => total + ids.length, 0)
}

export function formatCampaignDuration(startDate: string, endDate: string): string {
  if (startDate && endDate) {
    return `${startDate} — ${endDate}`
  }
  if (startDate) {
    return `From ${startDate}`
  }
  if (endDate) {
    return `Until ${endDate}`
  }
  return '—'
}

export function getChecklistCompletion(
  state: CampaignSetupState,
): Record<string, boolean> {
  return {
    created: state.step >= 2,
    team: state.step >= 3 && state.selectedRuknIds.length > 0,
    karkunan: state.step >= 4 && state.selectedKarkunIds.length > 0,
    assignments: state.step >= 5,
    launched: state.isLaunched,
  }
}
