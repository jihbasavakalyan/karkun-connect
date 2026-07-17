/**
 * KC-012.1 — Dashboard IA / mission consolidation checks.
 */

import assert from 'node:assert/strict'
import {
  buildConnectedIntelligenceView,
  buildConnectedKarkunCoachingUrdu,
  buildRafeeqPriorityWhyUrdu,
  buildSmartFollowUpRecommendation,
} from '../src/lib/relationshipIntelligencePresentation'
import type { KarkunGuidance } from '../src/types/guidance'

const sample = {
  karkunId: 'k1',
  karkunName: 'Abdur Rahman',
  currentStage: 'first-meeting',
  stageLabel: 'First Meeting',
  stagesCompleted: [],
  nextAction: {
    kind: 'visit-this-week',
    label: 'Visit',
    description: 'Schedule a short visit',
    route: '/rukn/visit/k1',
  },
  health: {
    level: 'needs-attention',
    label: 'Needs Attention',
    icon: 'pulse-attention',
    reasons: ['No contact for 14 days.'],
  },
  pendingCommitments: [],
  reminders: [],
  timeline: [{ title: 'Visit completed', description: 'Short call', source: 'visit' }],
} as unknown as KarkunGuidance

const urdu = buildRafeeqPriorityWhyUrdu(sample)
assert.doesNotMatch(urdu, /سلسلہ گرم|تعلق گرم/)
assert.match(urdu, /مناسب ہوگا|ملاقات/)

const coaching = buildConnectedKarkunCoachingUrdu(sample)
assert.doesNotMatch(coaching, /short visit is recommended|میری تجویز/)
assert.ok(coaching.length > 10)

const rec = buildSmartFollowUpRecommendation(sample)
assert.match(rec.text, /14 days/)

// Connected view must not expose Home-style recommendation fields
const connected = buildConnectedIntelligenceView('nonexistent', 'nonexistent')
assert.equal(connected, null)

console.log('verify-kc012-1-dashboard-ia: ok')
