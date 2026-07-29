/**
 * Digital Rafeeq Intent Engine Foundation — KC-0131.3 public API.
 *
 * Converts conversation domain inputs into standardized intent batches.
 * Architecture only: no AI, NLP, voice, Firestore, repositories, or execution.
 *
 * @see docs/architecture/intent-engine-foundation.md
 */

export * from './models'
export * from './contracts'
export * from './registry'
export * from './classifiers'
export * from './normalizers'
export * from './validators'
export * from './resolvers'
export * from './pipeline'
export * from './services'

import { createIntentDefinitionRegistry } from './registry'
import { createIntentEngineService } from './services'

/** Compose default intent engine foundation for tests and future wiring. */
export function createIntentEngineFoundation() {
  const registry = createIntentDefinitionRegistry()
  const engine = createIntentEngineService({ registry })
  return { registry, engine, pipeline: engine.pipeline }
}

export type IntentEngineFoundation = ReturnType<typeof createIntentEngineFoundation>
