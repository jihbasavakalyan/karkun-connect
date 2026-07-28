/**
 * KC-0125 — Communication Editorial Review & Template Approval contracts.
 * Content-only: terminology, template bodies, builder personalization, PDF fonts.
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { OFFICIAL_WHATSAPP_TEMPLATES } from '../src/data/communication/defaultTemplates'
import { ARKAAN_DAILY_REPORT_TEMPLATES } from '../src/data/dailyReports/arkanTemplates'
import { URDU_AVOID, URDU_PREFERRED, URDU_TERMINOLOGY_MAP } from '../src/lib/communication/urduTerminology'
import { URDU_REPORT } from '../src/lib/reporting/campaignReportUrdu'
import { validateEditorialMessage } from '../src/lib/communication/contextAware/editorialValidator'
import { buildContextAwareUrduMessage } from '../src/lib/communication/contextAware/messageBuilder'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const root = resolve(process.cwd())

function assertNoAvoid(text: string, label: string) {
  for (const word of URDU_AVOID) {
    assert(!text.includes(word), `${label} must not contain prohibited term: ${word}`)
  }
}

// 1) Terminology dictionary present
assert(URDU_PREFERRED.connectedWorkers === 'منسلک کارکنان', 'preferred connectedWorkers')
assert(URDU_PREFERRED.pendingMatters === 'امور زیر التواء', 'preferred pendingMatters')
assert(URDU_TERMINOLOGY_MAP.length >= 5, 'terminology map populated')

// 2) Every official WhatsApp / playbook / OC template body is free of avoided terms
assert(OFFICIAL_WHATSAPP_TEMPLATES.length > 20, 'template inventory non-empty')
for (const tpl of OFFICIAL_WHATSAPP_TEMPLATES) {
  assertNoAvoid(tpl.body, `template ${tpl.id}`)
}

// 3) Daily report templates use منسلک کارکنان
for (const tpl of ARKAAN_DAILY_REPORT_TEMPLATES) {
  assertNoAvoid(tpl.body, `daily ${tpl.id}`)
  if (tpl.body.includes('{{connected}}')) {
    assert(tpl.body.includes('منسلک کارکنان'), `daily ${tpl.id} must use منسلک کارکنان`)
  }
}

// 4) Campaign report Urdu labels
assert(URDU_REPORT.kpi.connectedKarkuns === 'منسلک کارکنان', 'report KPI terminology')
assert(URDU_REPORT.sections.executive === 'خلاصۂ ذمہ داریاں', 'report executive heading')
assert(URDU_REPORT.sections.pending === 'امور زیر التواء', 'report pending heading')

// 5) Personalized builder + editorial approval
const sample = buildContextAwareUrduMessage({
  context: 'follow-up-pending',
  recipientName: 'رکنِ مثال',
  pendingMatters: [
    { id: 'a', label: 'ملاقات باقی ہے۔' },
    { id: 'b', label: 'ماہانہ بیت المال کی تکمیل باقی ہے۔' },
    { id: 'c', label: 'ہفتہ وار اجتماع میں شرکت مطلوب ہے۔' },
  ],
})
assertNoAvoid(sample, 'builder sample')
assert(sample.includes(URDU_PREFERRED.greeting), 'builder greeting')
assert((sample.match(/•/g) ?? []).length === 3, 'builder lists each pending matter')
assert(validateEditorialMessage(sample, { pendingMatterCount: 3 }).ok, 'sample editorial approved')

// 6) PDF Urdu typography — Noto Nastaliq via browser OpenType HTML→PDF
assert(
  existsSync(resolve(root, 'public/fonts/NotoNastaliqUrdu-Regular.ttf')),
  'Noto Nastaliq Urdu Regular present',
)
const pdf = readFileSync(resolve(root, 'src/lib/reporting/campaignReportPdf.ts'), 'utf8')
assert(pdf.includes('downloadUrduHtmlReportPdf'), 'Campaign PDF uses HTML OpenType pipeline')
assert(
  existsSync(resolve(root, 'src/lib/reporting/urduPdfTypography.ts')),
  'Shared Urdu PDF typography module present',
)
assert(
  existsSync(resolve(root, 'src/lib/reporting/urduHtmlToPdf.ts')),
  'Urdu HTML→PDF engine present',
)

// 7) Deliverable docs
for (const doc of [
  'docs/communication/KC-0125-template-inventory.md',
  'docs/communication/KC-0125-terminology-dictionary.md',
  'docs/communication/KC-0125-approved-library.md',
]) {
  assert(existsSync(resolve(root, doc)), `missing deliverable ${doc}`)
}

console.log(
  JSON.stringify(
    {
      ok: true,
      templateCount: OFFICIAL_WHATSAPP_TEMPLATES.length,
      dailyReportCount: ARKAAN_DAILY_REPORT_TEMPLATES.length,
      checks: [
        'Terminology dictionary',
        'All communication templates free of avoided vocabulary',
        'Daily reports use منسلک کارکنان',
        'Campaign report Urdu labels approved',
        'Personalized pending-matter builder',
        'PDF Nastaliq OpenType HTML pipeline',
        'Editorial deliverable docs',
      ],
    },
    null,
    2,
  ),
)
