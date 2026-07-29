/**
 * KC-0130 — Intelligent Official Briefing from live campaign summary (card SSoT).
 */

import {
  buildOfficialCampaignSummary,
  buildRuknWorkspacePending,
} from '../src/lib/ruknWorkspacePresentation'
import {
  formatPendingResponsibilitiesUrdu,
  generateIntelligentOfficialBriefingUrdu,
} from '../src/lib/communication/officialBriefingFromCampaign'
import { buildOfficialCommunicationVariables } from '../src/lib/communication/officialCommunicationEngine'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const summary = buildOfficialCampaignSummary('__kc0130_missing__')
const pending = buildRuknWorkspacePending('__kc0130_missing__')
assert(
  summary.connectedKarkuns === pending.connectedKarkuns &&
    summary.pendingVisits === pending.pendingVisits &&
    summary.pendingWeeklyIjtema === pending.pendingWeeklyIjtema &&
    summary.pendingMonthlyBaitulMaal === pending.pendingMonthlyBaitulMaal &&
    summary.pendingAppRegistration === pending.pendingAppRegistration,
  'Card pending slice must match Official Campaign Summary',
)

const synthetic: ReturnType<typeof buildOfficialCampaignSummary> = {
  connectedKarkuns: 8,
  completedVisits: 1,
  pendingVisits: 7,
  completedWeeklyIjtema: 0,
  pendingWeeklyIjtema: 8,
  completedMonthlyBaitulMaal: 0,
  pendingMonthlyBaitulMaal: 8,
  completedAppRegistration: 0,
  pendingAppRegistration: 8,
  lastCommunication: '-',
  overallStatus: {
    label: 'Immediate Action',
    tone: 'red',
    icon: '🔴',
    badgeVariant: 'urgent',
  },
  completionPct: 0,
  allResponsibilitiesComplete: false,
}

const body = generateIntelligentOfficialBriefingUrdu({
  ruknName: 'Md Arafat Ahmad',
  campaignName: 'Test Campaign',
  summary: synthetic,
})

assert(!/Visit Pending/i.test(body), 'Must not emit Visit Pending spam')
assert(!/Registration Pending/i.test(body), 'Must not emit Registration Pending spam')
assert(!/\{\{/.test(body), 'Must not leave unresolved placeholders')
assert(/منسلک کارکن: 8/.test(body), 'Connected count must appear')
assert(/ملاقات — کامل|ملاقات — مکمل 1، باقی 7/.test(body) || /باقی 7/.test(body), 'Visit numbers')
assert(/باقی: 7/.test(body) || /ملاقات باقی: 7/.test(body), 'Pending visits callout')
assert(/ہفتہ وار اجتماع باقی: 8/.test(body), 'Pending ijtema callout')
assert(!/ملاقات باقی: 0/.test(body), 'Zero pending visits must not be listed as action item')

const complete = generateIntelligentOfficialBriefingUrdu({
  ruknName: 'Complete Rukn',
  campaignName: 'Test Campaign',
  summary: {
    ...synthetic,
    completedVisits: 8,
    pendingVisits: 0,
    completedWeeklyIjtema: 8,
    pendingWeeklyIjtema: 0,
    completedMonthlyBaitulMaal: 8,
    pendingMonthlyBaitulMaal: 0,
    completedAppRegistration: 8,
    pendingAppRegistration: 0,
    allResponsibilitiesComplete: true,
    overallStatus: {
      label: 'On Track',
      tone: 'green',
      icon: '🟢',
      badgeVariant: 'healthy',
    },
    completionPct: 100,
  },
})
assert(/الحمد للہ/.test(complete), 'Appreciation path when all complete')
assert(!/ابھی توجہ کے اہل امور/.test(complete), 'No pending section when complete')

const pendingUrdu = formatPendingResponsibilitiesUrdu(synthetic)
assert(!/Visit Pending/i.test(pendingUrdu), 'PendingObjectives alias must not use focus labels')
assert(/ملاقات 7/.test(pendingUrdu), 'PendingObjectives includes visit count')

const vars = buildOfficialCommunicationVariables({
  personId: '__kc0130_missing__',
  personKind: 'rukn',
  name: 'Test',
  mobile: '9999999999',
})
assert(!/Visit Pending/i.test(vars.PendingObjectives ?? ''), 'OC vars PendingObjectives clean')
assert(!/\{\{/.test(vars.PendingObjectives ?? ''), 'OC vars no placeholders')

const modalPath = resolve('src/components/communication/OfficialBriefingModal.tsx')
const modalSource = readFileSync(modalPath, 'utf8')
assert(
  /generateIntelligentOfficialBriefingUrdu/.test(modalSource),
  'Modal must use intelligent generator',
)
assert(/Overall Status/.test(modalSource), 'Modal shows Overall Status')
assert(/Additional Remarks/.test(modalSource), 'Modal has Additional Remarks')
assert(/Closing Message/.test(modalSource), 'Modal has Closing Message')

console.log('KC-0130 verify: OK')
console.log(
  JSON.stringify(
    {
      cardSummaryParity: true,
      noVisitPendingSpam: true,
      appreciationWhenComplete: true,
      samplePendingUrdu: pendingUrdu,
    },
    null,
    2,
  ),
)
