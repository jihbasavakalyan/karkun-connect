/**
 * KC-0131.8 — Confirmation Orchestrator Foundation verification.
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  CONFIRMATION_DECISION_STATES,
  CONFIRMATION_ERROR_CODES,
  CONFIRMATION_POLICY_KINDS,
  CONFIRMATION_RISK_CLASSIFICATIONS,
  assertConfirmationPolicyCoverage,
  createConfirmationOrchestratorFoundation,
  createInvalidConfirmationRequestError,
  createMissingConfirmationContextError,
  createUnsupportedConfirmationPolicyError,
  createConfirmationConfigurationError,
  isExecutionEligible,
  validateConfirmationRequest,
  validateDecisionState,
} from '../src/conversation/confirmation'

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

function testContractIntegrity(): void {
  const { orchestrator } = createConfirmationOrchestratorFoundation()
  const request = orchestrator.createRequest({
    summary: 'Approve visit update',
    policyKind: 'single_business_action',
    capability: 'VISIT',
    context: { planId: 'plan-1', sessionId: 'sess-1', riskClassification: 'medium' },
  })
  assert(request.immutable === true, 'immutable request')
  assert(validateConfirmationRequest(request).valid, 'valid request')

  const result = orchestrator.evaluate(request)
  assert(result.isPlaceholder === true, 'placeholder')
  assert(result.invokedService === false, 'no service')
  assert(result.performedExecution === false, 'no execution')
  assert(result.decision.performedExecution === false, 'decision no exec')
  assert(result.immutable === true, 'immutable result')
}

function testDecisionModels(): void {
  for (const state of [
    'AUTO_APPROVED',
    'USER_CONFIRMATION_REQUIRED',
    'DENIED',
    'MORE_INFORMATION_REQUIRED',
    'DEFERRED',
  ] as const) {
    assert(CONFIRMATION_DECISION_STATES.includes(state), state)
    assert(validateDecisionState(state), `validate ${state}`)
  }
  assert(isExecutionEligible('AUTO_APPROVED') === true, 'eligible')
  assert(isExecutionEligible('DENIED') === false, 'not eligible')
  assert(isExecutionEligible('USER_CONFIRMATION_REQUIRED') === false, 'needs user')

  const { orchestrator } = createConfirmationOrchestratorFoundation()
  const request = orchestrator.createRequest({
    summary: 'Read-only listing',
    policyKind: 'read_only_action',
    context: { planId: 'p1' },
  })
  const decision = orchestrator.decide(request)
  assert(decision.state === 'AUTO_APPROVED', 'read-only hint')
  assert(decision.eligibleForExecution === true, 'eligible flag')

  const mutate = orchestrator.createRequest({
    summary: 'Send WhatsApp',
    policyKind: 'external_communication',
    context: { sessionId: 's1' },
  })
  const mutateDecision = orchestrator.decide(mutate)
  assert(mutateDecision.state === 'USER_CONFIRMATION_REQUIRED', 'comms confirm')
  const mutateResult = orchestrator.evaluate(mutate)
  assert(mutateResult.prompt != null, 'prompt contract')
  assert(mutateResult.prompt?.generatesUserFacingText === false, 'no UI text')
}

function testPolicyModels(): void {
  assertConfirmationPolicyCoverage()
  for (const kind of [
    'read_only_action',
    'informational_response',
    'single_business_action',
    'multiple_business_actions',
    'external_communication',
    'high_impact_operation',
  ] as const) {
    assert(CONFIRMATION_POLICY_KINDS.includes(kind), kind)
  }
  const { orchestrator } = createConfirmationOrchestratorFoundation()
  assert(orchestrator.listPolicies().length === CONFIRMATION_POLICY_KINDS.length, 'coverage')
  assert(orchestrator.listPolicies().every((p) => p.isPlaceholder), 'placeholder policies')
}

function testConfirmationStatesAndRisk(): void {
  assert(CONFIRMATION_RISK_CLASSIFICATIONS.includes('critical'), 'critical')
  assert(CONFIRMATION_RISK_CLASSIFICATIONS.includes('none'), 'none')
  for (const code of CONFIRMATION_ERROR_CODES) {
    assert(typeof code === 'string', code)
  }
  assert(createInvalidConfirmationRequestError('x').code === 'invalid_request', 'invalid')
  assert(createMissingConfirmationContextError('x').code === 'missing_context', 'missing')
  assert(createUnsupportedConfirmationPolicyError('x').code === 'unsupported_policy', 'unsup')
  assert(createConfirmationConfigurationError('x').code === 'configuration_error', 'cfg')
}

function testDocumentation(): void {
  const doc = resolve(
    process.cwd(),
    'docs/architecture/confirmation-orchestrator-foundation.md',
  )
  const gate = resolve(process.cwd(), 'docs/architecture/kc-0131-8-arch009-gate.md')
  assert(existsSync(doc), 'foundation doc')
  assert(existsSync(gate), 'arch009 gate')
}

function testNoPlatformServiceImports(): void {
  const root = resolve(process.cwd(), 'src/conversation/confirmation')
  const files = [
    'index.ts',
    'contracts/index.ts',
    'policies/index.ts',
    'decisions/index.ts',
    'services/index.ts',
    'validators/index.ts',
  ]
  const forbidden = [
    /from\s+['"]@\/services/,
    /from\s+['"]@\/repositories/,
    /from\s+['"]firebase/,
    /from\s+['"]react/,
    /from\s+['"][^'"]*firestore[^'"]*['"]/,
  ]
  for (const rel of files) {
    const text = readFileSync(resolve(root, rel), 'utf8')
    for (const pattern of forbidden) {
      assert(!pattern.test(text), `forbidden in ${rel}: ${pattern}`)
    }
  }
}

function testNoExecution(): void {
  const { service } = createConfirmationOrchestratorFoundation()
  const result = service.createSessionGate({
    summary: 'High impact gate',
    planId: 'plan-x',
    capability: 'DOCUMENT',
    policyKind: 'high_impact_operation',
  })
  assert(result.performedExecution === false, 'no exec')
  assert(result.invokedService === false, 'no svc')
  assert(result.decision.performedExecution === false, 'decision sealed')
  assert(result.decision.state === 'USER_CONFIRMATION_REQUIRED', 'high impact')
}

const results = [
  run('contract integrity', testContractIntegrity),
  run('decision models', testDecisionModels),
  run('policy models', testPolicyModels),
  run('confirmation states', testConfirmationStatesAndRisk),
  run('documentation', testDocumentation),
  run('no platform service imports', testNoPlatformServiceImports),
  run('no execution', testNoExecution),
]

let failed = 0
for (const result of results) {
  const mark = result.passed ? 'PASS' : 'FAIL'
  console.log(`[${mark}] ${result.name} — ${result.detail}`)
  if (!result.passed) failed += 1
}

console.log(
  `\nKC-0131.8 confirmation orchestrator foundation verify: ${results.length - failed}/${results.length} passed`,
)
process.exit(failed === 0 ? 0 : 1)
