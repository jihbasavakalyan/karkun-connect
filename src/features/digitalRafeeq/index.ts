/**
 * Digital Rafeeq feature surfaces (KC-006).
 */

export {
  AdminAssistantCard,
  AdminAssistantPanel,
  EMPTY_ADMIN_ASSISTANT_VIEW,
  buildAdminAssistantViewModel,
  useAdminAssistant,
  type AdminAssistantHealthLabel,
  type AdminAssistantRecommendationItem,
  type AdminAssistantViewModel,
  type AdminAssistantVisibility,
} from './admin'

export {
  EMPTY_CONNECT_QUEUE,
  EMPTY_PERSONAL_PROGRESS,
  EMPTY_RUKN_ASSISTANT_VIEW,
  RuknAssistantCard,
  RuknAssistantPanel,
  buildRuknAssistantViewModel,
  useRuknAssistant,
  type RuknAssistantRecommendationItem,
  type RuknAssistantViewModel,
  type RuknAssistantVisibility,
  type RuknConnectQueueView,
  type RuknPersonalProgressView,
} from './rukn'

export {
  ComplianceGuidanceCard,
  ExecutionGuidanceCard,
  MeetingGuidanceCard,
  ReportGuidanceCard,
  buildComplianceGuidanceView,
  buildExecutionGuidanceView,
  buildMeetingGuidanceView,
  buildReportGuidanceView,
  resolveContextualRequest,
  useComplianceGuidance,
  useExecutionGuidance,
  useMeetingGuidance,
  useReportGuidance,
  type ComplianceGuidanceView,
  type ContextualGuidanceRequest,
  type ContextualSurface,
  type ContextualVisibility,
  type ExecutionGuidanceView,
  type MeetingGuidanceView,
  type ReportGuidanceView,
} from './contextual'

export { PlanningConversationModal } from './planning'
