/**
 * KC-029 — Smoke-verify diagnostics collector (no business mutations).
 * Run: npx vite-node scripts/verify-kc029-runtime-diagnostics.ts
 */

import { isRuntimeDiagnosticsEnabled } from '../src/lib/debug/isRuntimeDiagnosticsEnabled'
import { collectRuntimeTruth } from '../src/lib/debug/collectRuntimeTruth'
import { getFeatureFlagService } from '../src/runtime/featureFlags'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

// Force flag on for script context (DEV may be false under vite-node).
getFeatureFlagService().setFlag('runtimeDiagnostics.enabled', true)
assert(isRuntimeDiagnosticsEnabled(), 'diagnostics flag must be enableable')

const snapshot = await collectRuntimeTruth({
  authStatus: 'script',
  user: null,
  diagnosticsFlag: true,
})

assert(Boolean(snapshot.capturedAt), 'capturedAt required')
assert(snapshot.counts.length >= 8, 'expected connection count layers')
assert(Array.isArray(snapshot.startup.lifecycle.events), 'lifecycle events required')

const canonical = snapshot.counts.find((c) => c.layer === 'Canonical Connected Count')
const dashboard = snapshot.counts.find((c) => c.layer === 'Dashboard Connected KPI')
const automation = snapshot.counts.find((c) => c.layer === 'Automation Engine Count')
const people = snapshot.counts.find((c) => c.layer === 'People Registry Connected Count')

assert(canonical !== undefined, 'canonical layer missing')
assert(dashboard !== undefined, 'dashboard layer missing')
assert(automation !== undefined, 'automation layer missing')
assert(people !== undefined, 'people layer missing')
assert(Boolean(snapshot.dashboardReconciliation?.rule), 'KC-003 dashboard reconciliation required')
assert(
  Array.isArray(snapshot.dashboardReconciliation.exclusions),
  'KC-003 exclusions list required',
)

console.log('PASS  diagnostics flag gate + collector')
console.log('PASS  environment', {
  buildSha: snapshot.environment.buildSha,
  provider: snapshot.environment.repositoryProvider,
  projectId: snapshot.environment.firebaseProjectId,
})
console.log('PASS  counts', {
  firestore: snapshot.counts.find((c) => c.layer.startsWith('Firestore'))?.count,
  repository: snapshot.counts.find((c) => c.layer === 'Repository count')?.count,
  store: snapshot.counts.find((c) => c.layer === 'assignmentStore count')?.count,
  canonical: canonical?.count,
  people: people?.count,
  dashboard: dashboard?.count,
  automation: automation?.count,
})
console.log('PASS  divergences', snapshot.divergences.length)
console.log('PASS  selectedConnection', snapshot.selectedConnectionId)
console.log('')
console.log('KC-029 verify: PASS')
console.log('')
console.log('NOTE: Authenticated Create→Refresh and live Firestore parity require')
console.log('opening /admin/debug/runtime as Admin with runtimeDiagnostics.enabled.')
