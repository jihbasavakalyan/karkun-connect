/**
 * KC-0100 — Verify Rukn connection consistency contracts (static).
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const root = resolve(process.cwd())
const auth = readFileSync(resolve(root, 'src/services/authenticationService.ts'), 'utf8')
const firestore = readFileSync(
  resolve(root, 'src/repositories/firestore/firestoreRepositories.ts'),
  'utf8',
)
const initialize = readFileSync(resolve(root, 'src/repositories/firestore/initialize.ts'), 'utf8')
const layout = readFileSync(resolve(root, 'src/layouts/RuknLayout.tsx'), 'utf8')
const trace = readFileSync(
  resolve(root, 'src/lib/debug/kc0100ConnectionConsistencyTrace.ts'),
  'utf8',
)

assert(auth.includes('MISSING_RUKN_JWT_CLAIMS_ERROR'), 'auth rejects missing Rukn JWT claims')
assert(auth.includes('KC-0100'), 'auth has KC-0100 gate')
assert(firestore.includes('isScopedRuknClient'), 'scoped Rukn client helper exists')
assert(
  firestore.includes('readConnectionsForClient blocked — missing ruknId claim'),
  'connections read blocks incomplete Rukn JWT',
)
assert(initialize.includes('maybeRescopeHydrateAfterAuth'), 'post-auth Rukn rescope exists')
assert(layout.includes('Unable to load your connections'), 'Rukn layout gates hydrate failure')
assert(layout.includes('traceKc0100ConnectionConsistency'), 'Rukn layout emits KC-0100 trace')
assert(trace.includes('connection consistency'), 'KC-0100 tracer present')

console.log('KC-0100 verify-kc0100-connection-consistency: OK')
