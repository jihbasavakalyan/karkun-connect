/**
 * Contextual Digital Rafeeq guidance — public API (KC-006 Sprint 6.4).
 */

export { ExecutionGuidanceCard } from './ExecutionGuidanceCard'
export { MeetingGuidanceCard } from './MeetingGuidanceCard'
export { ComplianceGuidanceCard } from './ComplianceGuidanceCard'
export { ReportGuidanceCard } from './ReportGuidanceCard'

export {
  useComplianceGuidance,
  useExecutionGuidance,
  useMeetingGuidance,
  useReportGuidance,
} from './ContextualGuidanceHooks'

export {
  buildComplianceGuidanceView,
  buildExecutionGuidanceView,
  buildMeetingGuidanceView,
  buildReportGuidanceView,
  resolveContextualRequest,
  type ComplianceGuidanceView,
  type ContextualGuidanceRequest,
  type ContextualLineItem,
  type ContextualSurface,
  type ContextualVisibility,
  type ExecutionGuidanceView,
  type MeetingGuidanceView,
  type ReportGuidanceView,
} from './ContextualPresentation'
