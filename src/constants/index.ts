export { ROUTES, ruknVisitPath, type AppRoute } from './routes'
export {
  submitMeetingForm,
  saveDraftMeetingForm,
  getCampaignRecordData,
  getSubmittedForms,
  DEFAULT_VISIT_KARKUN_ID,
} from './mockCampaignRecord'
export { APP_NAME, APP_TAGLINE, APP_DESCRIPTION, APP_VERSION, ACTIVE_CAMPAIGN_NAME } from './app'
export { authenticateMock, getHomeRouteForRole } from './mockAuth'
export {
  adminDashboardStats,
  ruknDashboardStats,
  adminTodayMission,
  ruknTodayMission,
  type DashboardStat,
} from './mockDashboard'
export {
  APPROVED_CAMPAIGN_OBJECTIVES,
  MOCK_RUKN_LIST,
  MOCK_KARKUN_LIST,
  WIZARD_STEPS,
  CAMPAIGN_CHECKLIST_ITEMS,
  TOTAL_WIZARD_STEPS,
  type CampaignObjective,
  type MockRukn,
  type MockKarkun,
} from './mockCampaignSetup'
export {
  MOCK_KARKUN_REGISTRY,
  getKarkunById,
  getRegistryFilterOptions,
  adminKarkunProfilePath,
} from './mockKarkunRegistry'
export {
  ADMIN_MISSION_QUEUE,
  RUKN_MISSION_QUEUE,
  MOCK_ACTIVE_CAMPAIGN,
  MOCK_NEEDS_ATTENTION,
  MOCK_CAMPAIGNS,
  RUKN_COMPLETED_TODAY,
  type AdminMission,
  type RuknMission,
  type MissionStatus,
  type ActiveCampaignSummary,
  type NeedsAttentionSummary,
  type CampaignListItem,
} from './mockMissions'
