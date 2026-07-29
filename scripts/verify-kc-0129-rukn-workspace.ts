/**
 * KC-0129 — Rukn workspace cards + Review/Muttafiq entry consolidation.
 * Presentation only — no campaign / assignment / approval math changes.
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
  !/Available Capacity|availableCapacity|Completed count|stats\.completedCount/.test(cardSource),
  'Overview card must not show Available Capacity or Completed',
)
assert(/Communicate/.test(cardSource), 'Overview card must expose Communicate')
assert(
  /Pending Visits|Pending Weekly Ijtema|Pending Monthly Baitul Maal|Pending App Registration/.test(
    cardSource,
  ),
  'Overview card must show pending responsibilities',
)
assert(/Last Communication/.test(cardSource), 'Overview card must show Last Communication')
assert(/lastCommunication \?\? '-'/.test(cardSource) || /'\-'/.test(cardSource), 'Unavailable last communication shows -')

const connectedPath = resolve('src/components/relationship/ConnectedKarkunCard.tsx')
const connectedSource = readFileSync(connectedPath, 'utf8')
assert(!/To Muttafiq/.test(connectedSource), 'Standalone To Muttafiq button must be removed')
assert(
  /allowConvertToMuttafiq/.test(connectedSource),
  'Connected card must pass Convert to Muttafiq into Review modal',
)
assert(
  /submitKarkunToMuttafiqConversionRequest/.test(connectedSource),
  'Conversion must reuse existing request service',
)

const reviewModalPath = resolve('src/components/forms/assignment/RequestReviewModal.tsx')
const reviewModalSource = readFileSync(reviewModalPath, 'utf8')
assert(
  /Convert to Muttafiq/.test(reviewModalSource),
  'Review modal must include Convert to Muttafiq',
)
assert(
  /Needs Attention/.test(reviewModalSource) &&
    /Unable to Continue/.test(reviewModalSource) &&
    /Wrong Connection/.test(reviewModalSource),
  'Existing Review reasons must remain',
)

const statusOnTrack = ruknWorkspaceStatus(80, 4)
assert(statusOnTrack.label === 'On Track', `Expected On Track, got ${statusOnTrack.label}`)
const statusAttention = ruknWorkspaceStatus(45, 4)
assert(statusAttention.label === 'Needs Attention', statusAttention.label)
const statusUrgent = ruknWorkspaceStatus(10, 4)
assert(statusUrgent.label === 'Immediate Action', statusUrgent.label)

const samplePending = buildRuknWorkspacePending('__kc0129_missing_rukn__')
assert(samplePending.connectedKarkuns === 0, 'Unknown Rukn has 0 connected')

const templateId = resolveOfficialBriefingTemplateId('__kc0129_missing_rukn__')
assert(
  [
    'tpl-oc-weekly-encouragement',
    'tpl-oc-campaign-initiation-pending',
    'tpl-oc-appreciation',
  ].includes(templateId),
  `Unexpected briefing template: ${templateId}`,
)

const pagePath = resolve('src/pages/admin/RuknModulePage.tsx')
const pageSource = readFileSync(pagePath, 'utf8')
assert(/OfficialBriefingModal/.test(pageSource), 'Rukn module hosts OfficialBriefingModal')

console.log('KC-0129 verify: OK')
console.log(
  JSON.stringify(
    {
      capacityRemoved: true,
      toMuttafiqRemoved: true,
      convertUnderReview: true,
      briefingTemplateForUnknown: templateId,
    },
    null,
    2,
  ),
)
