/**
 * KC-035G — Secretary personality verification.
 */
import {
  SECRETARY_ACK_VARIANTS,
  SECRETARY_TEMPLATES,
  composeSecretaryResponse,
  nextAcknowledgement,
  polishCompletedWithNext,
  polishSavedLine,
  resetSecretaryVariationForTests,
} from '../src/secretary'

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

function testVariation(): void {
  resetSecretaryVariationForTests()
  const a = nextAcknowledgement()
  const b = nextAcknowledgement()
  const c = nextAcknowledgement()
  assert(SECRETARY_ACK_VARIANTS.includes(a as (typeof SECRETARY_ACK_VARIANTS)[number]), 'a')
  assert(a !== b || b !== c || SECRETARY_ACK_VARIANTS.length === 1, 'rotates or single')
  assert(nextAcknowledgement(0) === SECRETARY_ACK_VARIANTS[0], 'seeded')
}

function testTemplates(): void {
  assert(SECRETARY_TEMPLATES.saved.includes('محفوظ'), 'saved')
  assert(SECRETARY_TEMPLATES.nextStep.includes('مناسب قدم'), 'next')
  assert(!/Loading|Processing|Opening|AI/i.test(SECRETARY_TEMPLATES.completed), 'no software')
  const composed = composeSecretaryResponse({
    acknowledge: true,
    body: 'ملاقات محفوظ کر دی گئی۔',
    seed: 1,
  })
  assert(composed.includes('ملاقات'), 'body kept')
  assert(polishSavedLine().includes('محفوظ'), 'polish saved')
  assert(polishCompletedWithNext('ایپ رجسٹریشن').includes('ایپ'), 'polish next')
}

function testNoAiWording(): void {
  const blob = [
    ...SECRETARY_ACK_VARIANTS,
    SECRETARY_TEMPLATES.saved,
    SECRETARY_TEMPLATES.completed,
    SECRETARY_TEMPLATES.nextStep,
    SECRETARY_TEMPLATES.oneMore,
  ].join(' ')
  assert(!/chatgpt|llm|processing|loading/i.test(blob), 'clean tone')
}

const cases = [
  run('acknowledgement variation', testVariation),
  run('templates + compose', testTemplates),
  run('no AI/software wording', testNoAiWording),
]

const failed = cases.filter((c) => !c.passed)
console.log(
  JSON.stringify(
    {
      ok: failed.length === 0,
      ticket: 'KC-035G',
      passed: cases.filter((c) => c.passed).length,
      failed: failed.length,
      cases,
    },
    null,
    2,
  ),
)
if (failed.length > 0) process.exit(1)
