/**
 * KC-0119 / KC-0125 — Static contracts for Editorial Validator + Communication History.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  validateEditorialMessage,
  EDITORIAL_GREETING,
  EDITORIAL_CLOSING,
  EDITORIAL_DUA,
} from '../src/lib/communication/contextAware/editorialValidator'
import { APPROVED_EDITORIAL } from '../src/lib/communication/contextAware/approvedEditorialCopy'
import { buildContextAwareUrduMessage } from '../src/lib/communication/contextAware/messageBuilder'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const root = resolve(process.cwd())
const good = [
  EDITORIAL_GREETING,
  '',
  APPROVED_EDITORIAL.responsibilityIntro,
  '',
  APPROVED_EDITORIAL.detailsHeading,
  '• ملاقات باقی ہے۔',
  '• ہفتہ وار اجتماع میں شرکت مطلوب ہے۔',
  '',
  APPROVED_EDITORIAL.actionLine,
  '',
  EDITORIAL_DUA,
  '',
  EDITORIAL_CLOSING,
].join('\n')

const approved = validateEditorialMessage(good, { pendingMatterCount: 2 })
assert(approved.ok, 'valid message should be approved')
assert(approved.status === 'Editorial Approved', 'status approved')

const built = buildContextAwareUrduMessage({
  context: 'pending-visits',
  recipientName: 'رکنِ مثال',
  pendingMatters: [
    { id: '1', label: 'ملاقات باقی ہے۔' },
    { id: '2', label: 'JIH Reporting App میں اندراج باقی ہے۔' },
  ],
})
assert(!built.includes('خلاصہ:'), 'must not use generic count summary')
assert(!built.includes('یاددہانی'), 'must not use reminder framing')
assert(built.includes('• ملاقات باقی ہے۔'), 'must list specific pending matters')
assert(
  validateEditorialMessage(built, { pendingMatterCount: 2 }).ok,
  'builder output must pass editorial validator',
)

const emptyBuilt = buildContextAwareUrduMessage({
  context: 'pending-visits',
  pendingMatters: [],
})
assert(emptyBuilt.includes('الحمد للہ!'), 'empty pending must praise completion')
assert(emptyBuilt.includes('تمام امور مکمل'), 'empty pending must state completion')

const bad = validateEditorialMessage('hello world ٹاسک یاددہانی', { pendingMatterCount: 2 })
assert(!bad.ok, 'prohibited / missing structure should fail')
assert(bad.failedRules.length > 0, 'failed rules listed')

const engine = readFileSync(
  resolve(root, 'src/lib/communication/contextAware/communicationEngine.ts'),
  'utf8',
)
assert(engine.includes('sendContextAwareCommunication'), 'engine send pipeline present')
assert(engine.includes('recordContextAwareHistory'), 'history on send')

const historyPage = readFileSync(
  resolve(root, 'src/pages/admin/ContextAwareCommunicationHistoryPage.tsx'),
  'utf8',
)
assert(historyPage.includes('Communication History'), 'history page title')
assert(historyPage.includes('Resend'), 'resend placeholder')

console.log(
  JSON.stringify(
    {
      ok: true,
      checks: [
        'Editorial approve path',
        'Personalized builder (no count summary)',
        'Empty-pending completion path',
        'Editorial fail path with rule list',
        'Engine send/history pipeline',
        'History page columns/actions',
      ],
    },
    null,
    2,
  ),
)
