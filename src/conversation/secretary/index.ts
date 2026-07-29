/**
 * Digital Rafeeq Secretary Engine Foundation — KC-0131.4 public API.
 *
 * Converts resolved intent batches into immutable execution plans.
 * Planning only — never executes, never writes, never calls platform services.
 *
 * @see docs/architecture/secretary-engine-foundation.md
 */

export * from './plans'
export * from './contracts'
export * from './policies'
export * from './sequencing'
export * from './dependencies'
export * from './confirmation'
export * from './planner'
export * from './validators'
export * from './services'

import { createSecretaryEngineService } from './services'
import { createSecretaryPlanner } from './planner'

export function createSecretaryEngineFoundation() {
  const planner = createSecretaryPlanner()
  const engine = createSecretaryEngineService({ planner })
  return { planner, engine }
}

export type SecretaryEngineFoundation = ReturnType<typeof createSecretaryEngineFoundation>
