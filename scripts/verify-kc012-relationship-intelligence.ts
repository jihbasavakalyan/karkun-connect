/**
 * KC-012 — Relationship intelligence presentation checks.
 */

import assert from 'node:assert/strict'
import {
  buildDailyPriorityMission,
  buildPriorityWhy,
  buildSmartFollowUpRecommendation,
  getRelationshipHealthDisplayLabel,
} from '../src/lib/relationshipIntelligencePresentation'
import type { KarkunGuidance } from '../src/types/guidance'

const sample = {
  karkunId: 'k1',
  karkunName: 'Abdur Rahman',
  currentStage: 'participation',
  stageLabel: 'Participation',
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
  timeline: [],
  suggestions: [],
} as unknown as KarkunGuidance

assert.equal(
  getRelationshipHealthDisplayLabel(sample.health, sample.currentStage),
  'Needs Attention',
)

assert.equal(
  getRelationshipHealthDisplayLabel(
    { ...sample.health, level: 'healthy', label: 'Healthy', reasons: ['On track.'] },
    'development',
  ),
  'Excellent',
)

assert.equal(
  getRelationshipHealthDisplayLabel(
    { ...sample.health, level: 'urgent', label: 'Urgent', reasons: ['Gap'] },
    'participation',
  ),
  'Urgent Follow-up',
)

const why = buildPriorityWhy(sample)
assert.match(why, /No interaction for 14 days/)

const rec = buildSmartFollowUpRecommendation(sample)
assert.match(rec.text, /14 days/)
assert.doesNotMatch(rec.text, /must|immediately|fail/i)

// Empty rukn still returns array (no throw)
assert.ok(Array.isArray(buildDailyPriorityMission('nonexistent-rukn')))

console.log('verify-kc012-relationship-intelligence: ok')
