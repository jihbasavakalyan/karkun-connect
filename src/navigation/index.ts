/**
 * KC-035F — Voice Navigation & Voice Operation (UI routing only).
 *
 * @see docs/architecture/kc-035-digital-rafeeq-2.md
 * @see docs/architecture/kc-035f-arch009-gate.md
 */

export type {
  NavigationRole,
  NavigationTargetKey,
  VoiceNavigationResult,
} from './models/NavigationTypes'
export { intentToNavigationTarget } from './intentToTarget'
export {
  resolveVoiceNavigation,
  type ResolveVoiceNavigationInput,
} from './resolveVoiceNavigation'
export { NAVIGATION_URDU } from './responses/navigationUrduCopy'
export {
  createVoiceNavigationEngine,
  getVoiceNavigationEngine,
  resetVoiceNavigationEngineForTests,
  type VoiceNavigationEngine,
} from './engine/createVoiceNavigationEngine'
