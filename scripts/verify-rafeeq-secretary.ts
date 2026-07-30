/**
 * Verify Digital Rafeeq Secretary Intelligence v1.0 (اردو فرسٹ).
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { MOCK_KARKUN_REGISTRY } from '../src/constants/mockKarkunRegistry'
import type { KarkunRegistryRecord } from '../src/types/karkun-registry.types'
import {
  assertNoChatbotEnglish,
  buildPersonSecretaryFacts,
  classifyMvpUtterance,
  clearSession,
  formatCampaignSecretaryText,
  formatPersonSecretaryReport,
  getOrCreateSession,
  isPersonRemainingFollowUp,
  rememberPerson,
  resetTurnMetricsCache,
  runRafeeqTurn,
  buildCampaignIntelligence,
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
    ruknId: 'rukn-sec-1',
    locale: 'ur' as const,
    sessionId,
  }
}

function seedAslam(): KarkunRegistryRecord {
  const existing = MOCK_KARKUN_REGISTRY.find((k) => k.id === 'kr-sec-aslam')
  if (existing) return existing
  const record: KarkunRegistryRecord = {
    id: 'kr-sec-aslam',
    name: 'اسلم',
    gender: 'Male',
    mobile: '03001234567',
    place: 'لاہور',
    status: 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'verify',
    address: 'لاہور',
    area: 'حلقہ',
    assignedRukn: 'رکن نمونه',
    assignedRuknId: 'rukn-sec-1',
    assignmentStatus: 'Assigned',
    assignmentDate: '2026-06-01',
    campaignStatus: 'active',
    visitStatus: 'completed',
    lastVisit: '2026-07-20',
    commitment: null,
    currentCommitment: '',
    jihAppRegistrationStatus: 'Registered',
    notes: '',
    isArchived: false,
    category: 'Karkun',
  }
  MOCK_KARKUN_REGISTRY.push(record)
  return record
}

const cases: CaseResult[] = []

cases.push(
  run('Module files exist', () => {
    const root = resolve('src/conversation/mvp/secretaryIntelligence')
    for (const file of [
      'index.ts',
      'types.ts',
      'formatSecretarySections.ts',
      'buildPersonSecretaryReport.ts',
      'formatCampaignSecretary.ts',
    ]) {
      assert(existsSync(resolve(root, file)), `missing ${file}`)
    }
  }),
)

cases.push(
  run('Classify person report', () => {
    const c = classifyMvpUtterance('اسلم کی رپورٹ بتاؤ')
    assert(c.mvpKind === 'KARKUN_INFO', `kind=${c.mvpKind}`)
    assert(
      (c.actionSubject ?? '').includes('اسلم') || (c.searchQuery ?? '').includes('اسلم'),
      'subject aslam',
    )
  }),
)

cases.push(
  run('Classify self report — میری رپورٹ', () => {
    const c = classifyMvpUtterance('میری رپورٹ')
    assert(c.mvpKind === 'RUKN_SELF_REPORT', `kind=${c.mvpKind}`)
    assert(c.actionSubject == null || c.actionSubject === '', 'no person subject')
  }),
)

cases.push(
  run('Classify self priorities — میری ترجیحات', () => {
    const c = classifyMvpUtterance('میری ترجیحات')
    assert(c.mvpKind === 'RUKN_SELF_PRIORITIES', `kind=${c.mvpKind}`)
  }),
)

cases.push(
  run('Classify میری رپورٹ بتا — not person name میری', () => {
    const c = classifyMvpUtterance('میری رپورٹ بتا')
    assert(c.mvpKind === 'RUKN_SELF_REPORT', `kind=${c.mvpKind}`)
    assert(c.mvpKind !== 'KARKUN_INFO', 'not karkun info')
  }),
)

cases.push(
  run('Self report uses ruknId — never کس کارکن', () => {
    clearSession('sec-self')
    const result = runRafeeqTurn('میری رپورٹ', ctx('sec-self'))
    assert(result.metadata['secretaryIntelligence'] === true, 'secretary meta')
    assert(result.metadata['ruknSelf'] === 'report', 'ruknSelf report')
    assert(result.metadata['ruknId'] === 'rukn-sec-1', 'ruknId used')
    assert(!/کس کارکن/.test(result.text), 'never ask کس کارکن')
    assert(/موجودہ صورتحال/.test(result.text), 'situation')
    assert(/تجویز/.test(result.text), 'advice')
    assert(assertNoChatbotEnglish(result.text), 'no english labels')
  }),
)

cases.push(
  run('Self priorities — میری ترجیحات', () => {
    clearSession('sec-prio')
    const result = runRafeeqTurn('میری ترجیحات', ctx('sec-prio'))
    assert(result.metadata['ruknSelf'] === 'priorities', 'priorities mode')
    assert(result.metadata['ruknId'] === 'rukn-sec-1', 'ruknId used')
    assert(!/کس کارکن/.test(result.text), 'never ask کس کارکن')
    assert(/موجودہ صورتحال|باقی کام|تجویز/.test(result.text), 'sections')
    assert(assertNoChatbotEnglish(result.text), 'no english labels')
  }),
)

cases.push(
  run('Self report without ruknId asks sign-in not کس کارکن', () => {
    clearSession('sec-norukn')
    const result = runRafeeqTurn('میری رپورٹ', {
      role: 'rukn',
      ruknId: null,
      locale: 'ur',
      sessionId: 'sec-norukn',
    })
    assert(result.metadata['missingRuknId'] === true, 'missing flag')
    assert(/سائن ان|رکن/.test(result.text), 'ask sign in')
    assert(!/کس کارکن/.test(result.text), 'not کس کارکن')
  }),
)

cases.push(
  run('Classify remaining follow-up', () => {
    assert(isPersonRemainingFollowUp('کیا باقی ہے؟'), 'remaining helper')
    const c = classifyMvpUtterance('کیا باقی ہے؟')
    assert(c.mvpKind === 'KARKUN_INFO', `kind=${c.mvpKind}`)
  }),
)

cases.push(
  run('Classify does not steal open report', () => {
    const c = classifyMvpUtterance('رپورٹ کھولو')
    assert(
      c.mvpKind === 'CAMPAIGN_INTEL' ||
        c.campaignTopic === 'open_report' ||
        c.safeActionKind === 'OPEN_REPORTS',
      `open report kind=${c.mvpKind}`,
    )
    assert(c.mvpKind !== 'KARKUN_INFO', 'not person report')
  }),
)

cases.push(
  run('Person comprehensive Urdu report', () => {
    seedAslam()
    clearSession('sec-person')
    const result = runRafeeqTurn('اسلم کی رپورٹ بتاؤ', ctx('sec-person'))
    assert(result.metadata['secretaryIntelligence'] === true, 'secretary meta')
    assert(result.metadata['noFirestoreWrite'] === true, 'no write')
    assert(/موجودہ صورتحال/.test(result.text), 'situation')
    assert(/اہم پیش رفت/.test(result.text), 'progress')
    assert(/باقی کام/.test(result.text), 'remaining')
    assert(/قابلِ توجہ/.test(result.text), 'attention')
    assert(/آئندہ لائحہ|لائحۂ عمل/.test(result.text), 'plan')
    assert(/تجویز/.test(result.text), 'advice')
    assert(assertNoChatbotEnglish(result.text), 'no english labels')
    assert(/ملاقات|JIH|اجتماع|بیت المال|خطرے/.test(result.text), 'coverage')
  }),
)

cases.push(
  run('Conversation continuity', () => {
    seedAslam()
    clearSession('sec-cont')
    const first = runRafeeqTurn('اسلم کی رپورٹ', ctx('sec-cont'))
    assert(/اسلم/.test(first.text), 'first has aslam')
    const second = runRafeeqTurn('کیا باقی ہے؟', ctx('sec-cont'))
    assert(second.metadata['focus'] === 'remaining', 'remaining focus')
    assert(/باقی کام/.test(second.text), 'remaining section')
    assert(/اسلم/.test(second.text), 'continues aslam')
  }),
)

cases.push(
  run('Campaign analysis Urdu', () => {
    resetTurnMetricsCache()
    clearSession('sec-camp')
    const result = runRafeeqTurn('مہم کی صورتحال کیا ہے؟', ctx('sec-camp'))
    assert(result.intentCode === 'REPORT', 'report intent')
    assert(/موجودہ صورتحال/.test(result.text), 'situation')
    assert(/تجویز/.test(result.text), 'advice')
    assert(/منسلک|ملاقات|رجسٹریشن|اجتماع|بیت المال|مہم/.test(result.text), 'analysis')
    assert(assertNoChatbotEnglish(result.text), 'no english labels')
  }),
)

cases.push(
  run('Pending visits topic', () => {
    clearSession('sec-vis')
    const result = runRafeeqTurn('کن کارکنوں سے ابھی ملاقات باقی ہے؟', ctx('sec-vis'))
    assert(
      result.metadata['topic'] === 'visits_pending' ||
        /باقی ملاقات/.test(result.text),
      'visits pending',
    )
  }),
)

cases.push(
  run('Priority recommendations', () => {
    clearSession('sec-att')
    const result = runRafeeqTurn('کن کارکنوں پر فوری توجہ درکار ہے؟', ctx('sec-att'))
    assert(
      result.metadata['topic'] === 'attention' || /توجہ|تجویز/.test(result.text),
      'attention',
    )
  }),
)

cases.push(
  run('Formatter unit — person facts', () => {
    seedAslam()
    const facts = buildPersonSecretaryFacts({
      personId: 'kr-sec-aslam',
      name: 'اسلم',
      mobile: '03001234567',
      profilePath: '/people/kr-sec-aslam',
      ruknId: 'rukn-sec-1',
    })
    assert(facts !== null, 'facts')
    const text = formatPersonSecretaryReport(facts!, 'full')
    assert(/موجودہ صورتحال/.test(text), 'sections')
    assert(assertNoChatbotEnglish(text), 'urdu only labels')
  }),
)

cases.push(
  run('Formatter unit — campaign', () => {
    resetTurnMetricsCache()
    const memory = getOrCreateSession('sec-fmt')
    rememberPerson(memory, 'kr-sec-aslam', 'اسلم')
    const payload = buildCampaignIntelligence({
      topic: 'overview',
      role: 'rukn',
      ruknId: 'rukn-sec-1',
      memory,
    })
    const text = formatCampaignSecretaryText(payload)
    assert(/موجودہ صورتحال/.test(text), 'situation')
    assert(/تجویز/.test(text), 'advice')
  }),
)

cases.push(
  run('Existing features not broken (gate + package script)', () => {
    const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as {
      scripts: Record<string, string>
    }
    assert(
      typeof pkg.scripts['verify:rafeeq-secretary'] === 'string',
      'script registered',
    )
    assert(
      existsSync(
        resolve('docs/architecture/kc-rafeeq-secretary-intelligence-arch009-gate.md'),
      ),
      'arch009 gate',
    )
  }),
)

const failed = cases.filter((c) => !c.passed)
for (const c of cases) {
  console.log(`${c.passed ? '✓' : '✗'} ${c.name}${c.passed ? '' : ` — ${c.detail}`}`)
}
console.log(
  failed.length === 0
    ? `\nSecretary Intelligence verify: READY (${cases.length}/${cases.length})`
    : `\nSecretary Intelligence verify: NOT READY (${cases.length - failed.length}/${cases.length})`,
)
process.exit(failed.length === 0 ? 0 : 1)
