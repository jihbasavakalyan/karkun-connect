/**
 * KC-0131.3 — Intent Engine Foundation verification.
 */

import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  createConversationFoundation,
  createEmptyConversationContext,
} from '../src/conversation/foundation'
import {
  INTENT_CONFIDENCE_LEVELS,
  INTENT_CONFLICT_KINDS,
  INTENT_TYPE_CODES,
  assertRegistryIntegrity,
  createIntentDefinitionRegistry,
  createIntentEngineFoundation,
  createIntentParameter,
  createIntentPipelineInput,
  createIntentTarget,
  createPlaceholderIntentClassifier,
  createPlaceholderIntentConflictResolver,
  createPlaceholderIntentNormalizer,
  createPlaceholderIntentValidator,
  intentBatchToFoundationCollection,
  isIntentTypeCode,
  resolveIntentTypeCode,
} from '../src/conversation/intent'

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

function testRegistryIntegrity(): void {
  const registry = createIntentDefinitionRegistry()
  const issues = assertRegistryIntegrity(registry)
  assert(issues.length === 0, issues.join('; '))
  assert(registry.getAll().length === INTENT_TYPE_CODES.length, 'definition count')
  for (const code of INTENT_TYPE_CODES) {
    assert(registry.getByCode(code)?.code === code, `missing ${code}`)
  }
  assert(registry.isSupported('CALL'), 'CALL supported')
  assert(!registry.isSupported('UNKNOWN'), 'UNKNOWN not supported')
  assert(isIntentTypeCode('WHATSAPP'), 'type guard')
  assert(resolveIntentTypeCode('follow-up') === 'FOLLOW_UP', 'alias normalize')
}

function testIntentModelIntegrity(): void {
  assert(INTENT_CONFIDENCE_LEVELS.includes('UNKNOWN'), 'confidence levels')
  assert(INTENT_CONFLICT_KINDS.includes('ambiguous_people'), 'conflict kinds')

  const { engine } = createIntentEngineFoundation()
  const result = engine.resolveFromDomainInput(
    createIntentPipelineInput({
      locale: 'ur',
      text: null,
      domainIntentCodes: ['CALL', 'SEARCH'],
    }),
  )
  assert(result.batch.intents.length === 2, 'two resolved intents')
  assert(result.batch.isMultiIntent, 'multi intent')
  assert(result.batch.planningInputReady, 'planning input ready')
  assert(result.batch.intents.every((i) => i.confidence.level === 'UNKNOWN'), 'no calc')
}

function testPipelineIntegrity(): void {
  const { pipeline, engine } = createIntentEngineFoundation()
  const input = createIntentPipelineInput({
    domainIntentCodes: ['VISIT_UPDATE', 'VISIT_UPDATE', 'CALL'],
  })
  const result = pipeline.run(input)
  assert(result.candidates.length >= 1, 'candidates produced')
  assert(result.batch.conflicts.some((c) => c.kind === 'duplicate'), 'duplicate conflict')
  assert(
    result.batch.conflicts.some((c) => c.kind === 'conflicting_actions'),
    'conflicting actions',
  )
  const codes = engine.toPlanningCodes(result.batch)
  assert(codes.includes('VISIT_UPDATE') && codes.includes('CALL'), 'planning codes')
}

function testPlaceholderClassifiers(): void {
  const classifier = createPlaceholderIntentClassifier()
  const normalizer = createPlaceholderIntentNormalizer()
  const validator = createPlaceholderIntentValidator()
  const registry = createIntentDefinitionRegistry()

  const classified = classifier.classify(
    createIntentPipelineInput({ domainIntentCodes: ['navigation'] }),
  )
  assert(classified[0]?.code === 'NAVIGATION' || classified[0]?.code === 'navigation', 'classify')
  const normalized = normalizer.normalize(classified)
  assert(normalized[0]?.code === 'NAVIGATION', 'normalize')
  assert(normalized[0]?.status.engine === 'normalized', 'normalized status')

  const withMissing = [
    {
      ...normalized[0]!,
      parameters: [
        createIntentParameter({ name: 'route', required: true, present: false }),
      ],
    },
  ]
  const validated = validator.validate(withMissing, registry.getAll())
  assert(validated.issues.some((i) => i.includes('Missing parameters')), 'missing params')
}

function testConflictModel(): void {
  const resolver = createPlaceholderIntentConflictResolver()
  const { engine } = createIntentEngineFoundation()
  const batch = engine.resolveFromDomainInput(
    createIntentPipelineInput({
      domainIntentCodes: ['UNKNOWN'],
    }),
  ).batch

  const withAmbiguous = batch.intents.map((intent) => ({
    ...intent,
    targets: [
      createIntentTarget({ kind: 'person', ambiguous: true, label: '??' }),
    ],
    parameters: [
      createIntentParameter({ name: 'personId', required: true, present: false }),
    ],
  }))

  const resolved = resolver.resolveConflicts(withAmbiguous)
  const kinds = new Set(resolved.conflicts.map((c) => c.kind))
  assert(kinds.has('unsupported_type'), 'unsupported')
  assert(kinds.has('ambiguous_people'), 'ambiguous people')
  assert(kinds.has('missing_parameters'), 'missing parameters')
}

function testFoundationBridgeNoExecution(): void {
  const foundation = createConversationFoundation()
  const { engine } = createIntentEngineFoundation()
  const result = engine.resolveFromDomainInput(
    createIntentPipelineInput({ domainIntentCodes: ['REPORT'] }),
  )
  const collection = intentBatchToFoundationCollection(result.batch)
  const plan = foundation.planner.plan(
    collection,
    createEmptyConversationContext({ locale: 'ur' }),
  )
  assert(plan.isPlaceholder, 'still placeholder plan')
  assert(plan.steps[0]?.operationCode.includes('REPORT'), 'code flowed to planner')
}

function testDocumentationPresent(): void {
  assert(
    existsSync(resolve(process.cwd(), 'docs/architecture/intent-engine-foundation.md')),
    'intent-engine-foundation.md missing',
  )
  assert(
    existsSync(resolve(process.cwd(), 'docs/architecture/kc-0131-3-arch009-gate.md')),
    'arch009 gate missing',
  )
}

async function main(): Promise<void> {
  const results = [
    run('registry integrity', testRegistryIntegrity),
    run('intent model integrity', testIntentModelIntegrity),
    run('pipeline integrity', testPipelineIntegrity),
    run('placeholder classifiers', testPlaceholderClassifiers),
    run('conflict model', testConflictModel),
    run('foundation bridge (no execution)', testFoundationBridgeNoExecution),
    run('documentation present', testDocumentationPresent),
  ]

  const failed = results.filter((r) => !r.passed)
  for (const result of results) {
    console.log(`[${result.passed ? 'PASS' : 'FAIL'}] ${result.name} — ${result.detail}`)
  }
  if (failed.length > 0) {
    console.error(`\nKC-0131.3 intent verify failed: ${failed.length}/${results.length}`)
    process.exit(1)
  }
  console.log(`\nKC-0131.3 intent engine foundation verify: ${results.length}/${results.length} passed`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
