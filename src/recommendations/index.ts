/**
 * KC-035E — Operational Recommendation Engine.
 * Advises only — never executes or writes.
 *
 * @see docs/architecture/kc-035-digital-rafeeq-2.md
 * @see docs/architecture/kc-035e-arch009-gate.md
 */

export * from './models'
export { RECOMMENDATION_URDU } from './responses/recommendationUrduCopy'
export {
  mapSeverity,
  readPersonRemaining,
  readPriorityExposure,
} from './adapters/readAdapters'
export {
  RecommendationEngine,
  type AdvisePersonInput,
  type AdviseRoleInput,
} from './engine/RecommendationEngine'
export {
  createRecommendationEngine,
  getRecommendationEngine,
  resetRecommendationEngineForTests,
  type RecommendationEngineFacade,
} from './engine/createRecommendationEngine'
