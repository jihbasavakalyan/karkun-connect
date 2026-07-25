/**
 * KC-0119 — Static contracts for Editorial Validator + Communication History.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  validateEditorialMessage,
  EDITORIAL_GREETING,
  EDITORIAL_CLOSING,
  EDITORIAL_DUA,
} from '../src/lib/communication/contextAware/editorialValidator'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const root = resolve(process.cwd())
const good = [
  EDITORIAL_GREETING,
  '',
  'آپ کی ذمہ داری سے متعلق چند امور ابھی تک زیر التواء ہیں۔',
  '',
  'خلاصہ: 2 امور زیر التواء ہیں۔',
  '',
  'تفصیلات:',
  '• امر ایک',
  '• امر دو',
  '',
  'براہ کرم ان تمام امور پر جلد از جلد توجہ فرماتے ہوئے ان کی تکمیل کو یقینی بنائیں۔',
  '',
  EDITORIAL_DUA,
  '',
  EDITORIAL_CLOSING,
].join('\n')

const approved = validateEditorialMessage(good, { pendingMatterCount: 2 })
assert(approved.ok, 'valid message should be approved')
assert(approved.status === 'Editorial Approved', 'status approved')

const bad = validateEditorialMessage('hello world ٹاسک', { pendingMatterCount: 2 })
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
        'Editorial fail path with rule list',
        'Engine send/history pipeline',
        'History page columns/actions',
      ],
    },
    null,
    2,
  ),
)
