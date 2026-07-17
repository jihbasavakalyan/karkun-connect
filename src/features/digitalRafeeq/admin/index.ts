/**
 * Administrator Digital Rafeeq assistant — public API (KC-006 Sprint 6.2).
 */

export { AdminAssistantPanel } from './AdminAssistantPanel'
export { AdminAssistantCard } from './AdminAssistantCard'
export { useAdminAssistant } from './AdminAssistantHooks'
export {
  EMPTY_ADMIN_ASSISTANT_VIEW,
  type AdminAssistantHealthLabel,
  type AdminAssistantRecommendationItem,
  type AdminAssistantViewModel,
  type AdminAssistantVisibility,
} from './AdminAssistantTypes'
export { buildAdminAssistantViewModel } from './adminAssistantPresentation'
