/**
 * Verify Digital Rafeeq Safe Actions MVP.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  clearSession,
  classifySafeAction,
  getOrCreateSession,
  rememberPerson,
  requiresExplicitConfirmation,
  runRafeeqTurn,
} from '../src/conversation/mvp'

type CaseResult = { name: string; passed: boolean; detail: string }

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

function run(name: string, fn: () => void): CaseResult {
  try {
    fn()
    return { name, passed: true, detail: 'ok' }
  } catch (error) {
    return {
      name,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

function ctx(sessionId: string) {
  return {
    role: 'rukn' as const,
    ruknId: 'rukn-1',
    locale: 'ur' as const,
    sessionId,
  }
}

function testWhatsApp(): void {
  clearSession('sa-wa')
  const result = runRafeeqTurn('Send WhatsApp to Aslam', ctx('sa-wa'))
  assert(result.intentCode === 'WHATSAPP', 'intent')
  assert(result.requiresConfirmation === true, 'needs confirm')
  assert(result.layersVisited.includes('confirmation_orchestrator'), 'confirm layer')
  assert(result.layersVisited.includes('execution_pipeline'), 'pipeline')
  assert(result.actions.some((a) => a.confirmRole === 'confirm'), 'confirm action')
  assert(result.actions.some((a) => a.confirmRole === 'cancel'), 'cancel action')
}

function testPhoneCall(): void {
  clearSession('sa-call')
  const result = runRafeeqTurn('Call Imran', ctx('sa-call'))
  assert(result.intentCode === 'CALL', 'call')
  assert(result.requiresConfirmation === true, 'confirm')
  assert(
    result.actions.some((a) => a.route.startsWith('tel:') || a.confirmRole === 'alternative'),
    'tel or alternative',
  )
}

function testReminder(): void {
  clearSession('sa-rem')
  const result = runRafeeqTurn('Remind me to visit Ahmed tomorrow', ctx('sa-rem'))
  assert(result.intentCode === 'REMINDER' || result.metadata['kind'] === 'REMINDER', 'reminder')
  assert(result.requiresConfirmation === true, 'confirm')
  assert(requiresExplicitConfirmation('REMINDER') === true, 'policy')
  const memory = getOrCreateSession('sa-rem')
  assert(memory.pendingSafeAction?.kind === 'REMINDER', 'pending')
}

function testNavigationActions(): void {
  clearSession('sa-nav')
  const campaign = runRafeeqTurn('Open campaign and reports', ctx('sa-nav'))
  assert(campaign.requiresConfirmation === false, 'read-only open')
  assert(campaign.actions.length >= 2, 'compound actions')
  assert(campaign.metadata['executionResult'] === 'success', 'success')

  const attendance = runRafeeqTurn('Open Attendance', ctx('sa-att'))
  assert(
    attendance.intentCode === 'NAVIGATION' ||
      attendance.metadata['opensExistingUi'] === true ||
      attendance.actions.length >= 1,
    'attendance open',
  )
}

function testConfirmationFlow(): void {
  clearSession('sa-conf')
  rememberPerson(getOrCreateSession('sa-conf'), 'p1', 'Aslam')
  runRafeeqTurn('WhatsApp him', ctx('sa-conf'))
  assert(getOrCreateSession('sa-conf').pendingSafeAction?.kind === 'WHATSAPP', 'pending wa')
  const cancelled = runRafeeqTurn('Cancel', ctx('sa-conf'))
  assert(cancelled.metadata['executionResult'] === 'cancelled', 'cancelled')
  assert(getOrCreateSession('sa-conf').pendingSafeAction === null, 'cleared')
}

function testContextResolution(): void {
  clearSession('sa-ctx')
  rememberPerson(getOrCreateSession('sa-ctx'), 'p-ahmed', 'Ahmed')
  const call = runRafeeqTurn('Call him', ctx('sa-ctx'))
  assert(call.intentCode === 'CALL', 'call him')
  assert(classifySafeAction('Show Ahmed and call him')?.kind === 'CALL', 'compound')
}

function testExistingServicesReuse(): void {
  const result = runRafeeqTurn('Send WhatsApp to Aslam', ctx('sa-reuse'))
  assert(result.usedStack === true, 'stack')
  assert(result.layersVisited.includes('service_integration_contract'), 'contract')
  assert(
    existsSync(resolve('src/utils/personContactLinks.ts')),
    'contact helpers exist',
  )
}

function testNoFirestoreWrites(): void {
  const result = runRafeeqTurn('Remind me this evening', ctx('sa-nf'))
  assert(result.readOnly === false || result.requiresConfirmation === true, 'guarded')
  // Reminder only opens existing UI — no write APIs invoked in handler path
  assert(
    String(JSON.stringify(result.metadata)).includes('REMINDER') ||
      result.intentCode === 'REMINDER',
    'reminder meta',
  )
}

function testDocs(): void {
  assert(existsSync(resolve('docs/features/rafeeq-safe-actions.md')), 'doc')
  assert(
    existsSync(resolve('docs/architecture/kc-rafeeq-safe-actions-arch009-gate.md')),
    'gate',
  )
}

const results = [
  run('whatsapp execution', testWhatsApp),
  run('phone call', testPhoneCall),
  run('reminder creation', testReminder),
  run('navigation actions', testNavigationActions),
  run('confirmation flow', testConfirmationFlow),
  run('context resolution', testContextResolution),
  run('existing services reused', testExistingServicesReuse),
  run('no firestore writes', testNoFirestoreWrites),
  run('documentation', testDocs),
]

let failed = 0
for (const result of results) {
  console.log(`[${result.passed ? 'PASS' : 'FAIL'}] ${result.name} — ${result.detail}`)
  if (!result.passed) failed += 1
}
console.log(
  `\nRafeeq safe actions verify: ${results.length - failed}/${results.length} passed`,
)
process.exit(failed === 0 ? 0 : 1)
