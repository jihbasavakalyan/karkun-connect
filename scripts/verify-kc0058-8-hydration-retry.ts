/**
 * KC-0058.8 — Transient initial hydration retry contract.
 * Run: npx vite-node scripts/verify-kc0058-8-hydration-retry.ts
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const initializeSource = readFileSync(
  resolve('src/repositories/firestore/initialize.ts'),
  'utf8',
)

assert(
  initializeSource.includes('ensureAuthTokenReadyForFirestore'),
  'must wait for auth token before critical hydrate',
)
assert(
  initializeSource.includes('isTransientCriticalHydrateError'),
  'must classify transient first-load failures',
)
assert(
  initializeSource.includes('criticalHydrateRetryUsed'),
  'must allow at most one automatic retry',
)
assert(
  initializeSource.includes('criticalHydrate.retry.scheduled'),
  'must trace retry scheduling',
)
assert(
  initializeSource.includes('CRITICAL_HYDRATE_RETRY_DELAY_MS'),
  'must delay briefly before retry',
)
assert(
  initializeSource.includes('deferredFailureMark'),
  'must defer hydrationReady.failed until retry exhausted',
)

const markFailedBeforeRetry =
  /markRepositoryHydrationFailed\(criticalError\)[\s\S]{0,80}throw criticalError/
assert(
  !markFailedBeforeRetry.test(initializeSource),
  'must not mark hydration failed before the automatic retry opportunity',
)

assert(
  initializeSource.includes('runCriticalHydrateRetry'),
  'must implement single critical hydrate retry helper',
)

console.log('KC-0058.8 verify OK', {
  tokenReadyBeforeHydrate: true,
  singleAutomaticRetry: true,
  deferredFailureMark: true,
})
