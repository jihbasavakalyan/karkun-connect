/**
 * KC-035E — Compose recommendation engine.
 */

import { RecommendationEngine } from './RecommendationEngine'

export type RecommendationEngineFacade = {
  readonly engine: RecommendationEngine
}

export function createRecommendationEngine(): RecommendationEngineFacade {
  return { engine: new RecommendationEngine() }
}

let singleton: RecommendationEngineFacade | null = null

export function getRecommendationEngine(): RecommendationEngineFacade {
  if (!singleton) singleton = createRecommendationEngine()
  return singleton
}

export function resetRecommendationEngineForTests(): void {
  singleton = null
}
