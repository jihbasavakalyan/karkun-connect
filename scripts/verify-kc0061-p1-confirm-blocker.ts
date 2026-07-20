/**
 * KC-0061-P1 — Verify Confirm Connection step instrumentation is present.
 * Run: npm run verify:kc0061.p1
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const tracer = readFileSync(resolve('src/lib/debug/kc0061ConnectTrace.ts'), 'utf8')
assert(tracer.includes('connectStepEnter'), 'ENTER helper required')
assert(tracer.includes('connectStepExit'), 'EXIT helper required')
assert(tracer.includes('EARLY_RETURN'), 'early return phase required')
assert(tracer.includes('EXCEPTION'), 'exception phase required')

const modal = readFileSync(resolve('src/components/common/ModalFormLayout.tsx'), 'utf8')
assert(modal.includes("primaryLabel === 'Confirm Connection'"), 'button onClick instrumented')

const page = readFileSync(resolve('src/pages/rukn/AvailableKarkunPage.tsx'), 'utf8')
assert(page.includes('ui.handleConfirmConnect'), 'handleConfirm instrumented')
assert(page.includes('ui.toOperatorAssignmentError'), 'remap step instrumented')

const assign = readFileSync(resolve('src/services/assignmentService.ts'), 'utf8')
assert(assign.includes('service.validateAssignInput'), 'validation instrumented')
assert(assign.includes('service.assignRukn'), 'assign service instrumented')

const store = readFileSync(resolve('src/stores/assignmentStore.ts'), 'utf8')
assert(store.includes('firestore.connectionMeta.transaction'), 'ASN/firestore step instrumented')
assert(store.includes('repo.allocateNextAssignmentNumber'), 'repository allocate instrumented')

const prove = readFileSync(
  resolve('scripts/admin/kc0061-p1-prove-confirm-blocker.mjs'),
  'utf8',
)
assert(prove.includes('permission-denied'), 'proof script asserts permission-denied')
assert(prove.includes('settings/connectionMeta'), 'proof targets connectionMeta')

console.log('KC-0061-P1 verify OK', {
  instrumentation: true,
  proofScript: true,
})
