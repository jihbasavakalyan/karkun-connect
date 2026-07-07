import { getAllKarkuns } from '@/lib/peopleStore'

export type CampaignChecklistItem = {
  id: string
  label: string
}

export const CAMPAIGN_CHECKLIST_ITEMS: CampaignChecklistItem[] = [
  { id: 'created', label: 'Campaign Created' },
  { id: 'team', label: 'Campaign Team Selected' },
  { id: 'karkunan', label: 'Karkunan Added' },
  { id: 'assignments', label: 'Assignments Prepared' },
  { id: 'launched', label: 'Campaign Launched' },
]

export const WIZARD_STEPS = [
  { number: 1, label: 'Information' },
  { number: 2, label: 'Campaign Team' },
  { number: 3, label: 'Karkunan' },
  { number: 4, label: 'Assignments' },
  { number: 5, label: 'Review' },
  { number: 6, label: 'Launch' },
] as const

export type CampaignObjective = {
  id: string
  label: string
  description: string
}

export type MockKarkun = {
  id: string
  name: string
  area: string
}

export const APPROVED_CAMPAIGN_OBJECTIVES: CampaignObjective[] = [
  {
    id: 'visits',
    label: 'Field Visits',
    description: 'Conduct assigned visits with Karkunan across the local Jamaat.',
  },
  {
    id: 'visit-reports',
    label: 'Visit Reports',
    description: 'Submit a visit report for every completed visit.',
  },
  {
    id: 'jih-registration',
    label: 'JIH Web Portal',
    description: 'Track portal registration and monthly report compliance for eligible Karkuns.',
  },
  {
    id: 'daily-progress',
    label: 'Daily Progress Reports',
    description: 'Submit one daily progress report per active field day.',
  },
  {
    id: 'follow-ups',
    label: 'Follow-ups',
    description: 'Complete follow-up tasks generated from visits and commitments.',
  },
]

export function getCampaignKarkunList(): MockKarkun[] {
  return getAllKarkuns().map((karkun) => ({
    id: karkun.id,
    name: karkun.name,
    area: karkun.area || 'Basavakalyan',
  }))
}

/** @deprecated Use getCampaignKarkunList() for live registry data. */
export const MOCK_KARKUN_LIST: MockKarkun[] = []

export const TOTAL_WIZARD_STEPS = WIZARD_STEPS.length
