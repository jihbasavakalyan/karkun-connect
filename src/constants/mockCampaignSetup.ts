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
    label: 'JIH Registration',
    description: 'Identify and recommend eligible individuals for JIH registration.',
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

export const MOCK_KARKUN_LIST: MockKarkun[] = [
  { id: 'karkun-1', name: 'Mohammad Kareem', area: 'ABC Area' },
  { id: 'karkun-2', name: 'Ali Raza', area: 'DEF Area' },
  { id: 'karkun-3', name: 'Hamza Siddiqui', area: 'GHI Area' },
  { id: 'karkun-4', name: 'Bilal Hussain', area: 'JKL Area' },
  { id: 'karkun-5', name: 'Usman Farooq', area: 'MNO Area' },
  { id: 'karkun-6', name: 'Tariq Mahmood', area: 'PQR Area' },
  { id: 'karkun-7', name: 'Saeed Anwar', area: 'STU Area' },
  { id: 'karkun-8', name: 'Nadeem Akhtar', area: 'VWX Area' },
  { id: 'karkun-9', name: 'Farhan Qureshi', area: 'YZ Area' },
  { id: 'karkun-10', name: 'Imran Shah', area: 'Central Area' },
]

export const TOTAL_WIZARD_STEPS = WIZARD_STEPS.length
