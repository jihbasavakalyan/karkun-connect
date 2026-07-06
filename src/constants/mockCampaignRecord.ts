import { ACTIVE_CAMPAIGN_NAME } from '@/constants/app'
import { updateKarkunMeetingOutcomes } from '@/constants/mockKarkunRegistry'
import type {
  Annexure1FormState,
  CampaignFollowUpRecord,
  SubmittedMeetingForm,
} from '@/types/annexure1.types'

const submittedForms: SubmittedMeetingForm[] = []
const followUpRecords: CampaignFollowUpRecord[] = []

const seedVisitHistory = [
  {
    id: 'vh-seed-1',
    karkunId: 'kr-002',
    workerName: 'Ali Raza',
    visitDate: '2026-03-11',
    summary: 'Routine check-in and progress review.',
  },
]

export function submitMeetingForm(
  karkunId: string,
  workerName: string,
  area: string,
  assignedRukn: string,
  form: Annexure1FormState,
): SubmittedMeetingForm {
  const record: SubmittedMeetingForm = {
    ...form,
    id: `form-${Date.now()}`,
    karkunId,
    workerName,
    area,
    assignedRukn,
    campaignName: ACTIVE_CAMPAIGN_NAME,
    submittedAt: new Date().toISOString(),
    status: 'submitted',
  }

  submittedForms.unshift(record)

  updateKarkunMeetingOutcomes(karkunId, {
    currentCommitment:
      form.commitmentMade && form.commitmentDetails.trim()
        ? form.commitmentDetails.trim()
        : undefined,
    jihAppRegistrationStatus: form.jihAppRegistrationStatus,
  })

  if (form.followUpRequired === 'yes' && form.followUpDate) {
    followUpRecords.unshift({
      id: `followup-${Date.now()}`,
      karkunId,
      workerName,
      followUpDate: form.followUpDate,
      note: form.followUpNote,
      sourceFormId: record.id,
    })
  }

  return record
}

export function saveDraftMeetingForm(
  karkunId: string,
  workerName: string,
  area: string,
  assignedRukn: string,
  form: Annexure1FormState,
): SubmittedMeetingForm {
  const record: SubmittedMeetingForm = {
    ...form,
    id: `draft-${Date.now()}`,
    karkunId,
    workerName,
    area,
    assignedRukn,
    campaignName: ACTIVE_CAMPAIGN_NAME,
    submittedAt: new Date().toISOString(),
    status: 'draft',
  }

  submittedForms.unshift(record)
  return record
}

export function getCampaignRecordData() {
  const meetingForms = submittedForms.filter((form) => form.status === 'submitted')
  const commitments = meetingForms
    .filter((form) => form.commitmentMade && form.commitmentDetails)
    .map((form) => ({
      id: `commit-${form.id}`,
      workerName: form.workerName,
      details: form.commitmentDetails,
      visitDate: form.visitDate,
    }))

  const jihRegistrations = meetingForms.map((form) => ({
    id: `jih-${form.id}`,
    workerName: form.workerName,
    status: form.jihAppRegistrationStatus,
    visitDate: form.visitDate,
  }))

  const visitHistory = [
    ...meetingForms.map((form) => ({
      id: `vh-${form.id}`,
      karkunId: form.karkunId,
      workerName: form.workerName,
      visitDate: form.visitDate,
      summary: form.visitConducted === 'yes' ? form.discussionSummary || 'Visit completed' : form.notConductedReason,
    })),
    ...seedVisitHistory,
  ]

  return {
    visitHistory,
    meetingForms,
    commitments,
    jihRegistrations,
    followUps: [...followUpRecords],
  }
}

export function getSubmittedForms(): SubmittedMeetingForm[] {
  return [...submittedForms]
}

export const DEFAULT_VISIT_KARKUN_ID = 'kr-001'
