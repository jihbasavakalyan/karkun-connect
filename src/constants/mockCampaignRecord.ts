export {
  getCampaignRecordData,
  getSubmittedForms,
  submitAnnexure1,
  saveAnnexure1Draft,
  getAnnexure1ExecutionMetrics,
  getPendingReportKarkuns,
  getTodaysMeetingAssignments,
  getCampaignHealthFromAnnexure1,
  getPerformanceMetricsFromAnnexure1,
} from '@/services/annexure1Service'

export { DEFAULT_VISIT_KARKUN_ID } from '@/constants/demoAnnexure1'

/** @deprecated Use submitAnnexure1 from annexure1Service */
export { submitAnnexure1 as submitMeetingForm } from '@/services/annexure1Service'

/** @deprecated Use saveAnnexure1Draft from annexure1Service */
export { saveAnnexure1Draft as saveDraftMeetingForm } from '@/services/annexure1Service'
