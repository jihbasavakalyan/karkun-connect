export {
  runProductionDataMigration,
  getProductionMigrationSummary,
  formatProductionMigrationReport,
} from './productionDataMigrationService'

export {
  getCampaignLibrary,
  getActiveCampaign,
  getActiveCampaignName,
  getActiveCampaignTheme,
  getActiveCampaignObjective,
  getActiveCampaignNextMilestone,
  getActiveCampaigns,
  getArchivedCampaigns,
  getActiveCampaignSummary,
  getCampaignTimeline,
  getCampaignProgress,
  formatActiveCampaignDuration,
  formatCampaignDate,
} from './campaignService'
export type { CampaignTimeline, CampaignTimelineStatus } from './campaignService'

export {
  assignRukn,
  replaceAssignment,
  removeAssignment,
  restoreAssignment,
  getRuknAssignmentSummary,
  getKarkunWorkloadSummary,
  getAssignmentDashboardMetrics,
  getKarkunsForRuknAssignment,
  getUnassignedRukns,
  getAssignedRukns,
  getKarkunWithWorkload,
  getAllAssignments,
  getAssignmentHistoryForRukn,
  getAssignmentHistoryForKarkun,
} from './assignmentService'

export {
  submitAnnexure1,
  saveAnnexure1Draft,
  getCampaignRecordData,
  getSubmittedForms,
  getAnnexure1ExecutionMetrics,
  getPendingReportKarkuns,
  getTodaysMeetingAssignments,
  getCampaignHealthFromAnnexure1,
  getPerformanceMetricsFromAnnexure1,
} from './annexure1Service'

export {
  createFollowUp,
  completeFollowUpsForAssignment,
  handleFollowUpOnAnnexureSubmit,
  getFollowUpDashboardMetrics,
  getPendingFollowUps,
  getTodaysFollowUps,
  getCompletedFollowUps,
  getNextFollowUpForKarkun,
  getFollowUpCompletionRate,
  getFollowUpsForCampaignRecord,
} from './followUpService'

export {
  initializeJihWebPortalCompliance,
  ensureRegistration,
  getRegistrationForKarkun,
  getCurrentMonthReportingStatus,
  updateJihRegistration,
  updateJihMonthlyReport,
  bulkUpdateJihRegistration,
  bulkUpdateJihMonthlyReport,
  getJihWebPortalDashboardMetrics,
  getAllJihWebPortalSummaries,
  matchesJihPortalFilters,
  getCurrentMonthKey,
} from './jihWebPortalService'

export {
  initializeBaitulMaalCompliance,
  ensureBaitulMaalRecord,
  getCurrentBaitulMaalStatus,
  getBaitulMaalStatusForKarkun,
  updateBaitulMaal,
  bulkUpdateBaitulMaal,
  getBaitulMaalDashboardMetrics,
  getAllBaitulMaalSummaries,
  matchesBaitulMaalFilters,
  getFilterMonthKey,
} from './baitulMaalService'

export {
  initializeIjtemaAttendanceCompliance,
  ensureIjtemaAttendanceRecord,
  getCurrentIjtemaAttendance,
  getIjtemaAttendanceForKarkun,
  updateIjtemaAttendance,
  bulkUpdateIjtemaAttendance,
  getIjtemaAttendanceDashboardMetrics,
  getAllIjtemaAttendanceSummaries,
  matchesIjtemaAttendanceFilters,
  getFilterWeekEndingDate,
} from './ijtemaAttendanceService'

export {
  CampaignAutomationEngine,
  getAdminCommandCenterSnapshot,
  getRuknCommandCenterSnapshot,
} from './campaignAutomationEngine'
