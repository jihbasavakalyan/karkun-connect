/**
 * KC-0129 — Rukn workspace presentation & one-click Official Briefing selection.
 * Presentation only — no campaign / assignment math changes.
 */

import {
  buildRuknWorkspacePending,
  resolveOfficialBriefingTemplateId,
  ruknWorkspaceStatus,
} from '../src/lib/ruknWorkspacePresentation'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const cardPath = resolve('src/components/forms/rukn/RuknAssignmentCard.tsx')
const cardSource = readFileSync(cardPath, 'utf8')

assert(
  !/Available Capacity|availableCapacity/.test(cardSource),
  'Overview card must not show Available Capacity',
)
assert(
  /Communicate/.test(cardSource),
  'Overview card must expose Communicate as primary action',
)
assert(
  /Pending Visits|Pending Weekly Ijtema|Pending Monthly Baitul Maal|Pending App Registration/.test(
    cardSource,
  ),
  'Overview card must show pending responsibilities',
)
assert(
  /onCommunicate/.test(cardSource),
  'Overview card must call onCommunicate for one-click briefing',
)

const statusOnTrack = ruknWorkspaceStatus(80, 4)
assert(statusOnTrack.label === 'On Track', `Expected On Track, got ${statusOnTrack.label}`)
assert(statusOnTrack.icon === '🟢', 'On Track icon')

const statusAttention = ruknWorkspaceStatus(45, 4)
assert(
  statusAttention.label === 'Needs Attention',
  `Expected Needs Attention, got ${statusAttention.label}`,
)

const statusUrgent = ruknWorkspaceStatus(10, 4)
assert(
  statusUrgent.label === 'Immediate Action',
  `Expected Immediate Action, got ${statusUrgent.label}`,
)

const empty = ruknWorkspaceStatus(0, 0)
assert(empty.label === 'Needs Attention', 'No connections → Needs Attention')

// Pending helpers must call existing summary fields only (shape check).
const samplePending = buildRuknWorkspacePending('__kc0129_missing_rukn__')
assert(samplePending.connectedKarkuns === 0, 'Unknown Rukn has 0 connected')
assert(samplePending.pendingVisits === 0, 'Unknown Rukn has 0 pending visits')
assert(
  typeof samplePending.completionPct === 'number',
  'completionPct must be numeric from existing summary',
)

const templateId = resolveOfficialBriefingTemplateId('__kc0129_missing_rukn__')
assert(
  templateId === 'tpl-oc-weekly-encouragement' ||
    templateId === 'tpl-oc-campaign-initiation-pending' ||
    templateId === 'tpl-oc-appreciation',
  `Unexpected briefing template: ${templateId}`,
)

const pagePath = resolve('src/pages/admin/RuknModulePage.tsx')
const pageSource = readFileSync(pagePath, 'utf8')
assert(
  /OfficialBriefingModal/.test(pageSource),
  'Rukn module must host OfficialBriefingModal',
)
assert(
  /onCommunicate/.test(pageSource),
  'Rukn module must wire Communicate → briefing',
)

console.log('KC-0129 verify: OK')
console.log(
  JSON.stringify(
    {
      statusSamples: {
        onTrack: statusOnTrack.label,
        needsAttention: statusAttention.label,
        immediateAction: statusUrgent.label,
      },
      briefingTemplateForUnknown: templateId,
      capacityRemovedFromCard: true,
    },
    null,
    2,
  ),
)
