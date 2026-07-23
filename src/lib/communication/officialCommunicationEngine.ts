/**
 * KC-0099 — Official Communication Engine.
 * Auto-populates campaign/relationship variables; no manual variable entry.
 * Reuses mail-merge + template compose — no new Firestore collections.
 */

import { getActiveAssignmentsForRukn } from '@/stores/assignmentStore'
import {
  buildCampaignExecutionSummary,
  buildCampaignMatrixRows,
  buildTodaysFocusItems,
} from '@/lib/campaignExecutionMatrix'
import {
  checkOfficialLanguageCompliance,
  karkunWordForCount,
  type LanguageComplianceResult,
} from '@/lib/communication/officialCommunicationLanguage'
import {
  OFFICIAL_COMMUNICATION_LIBRARY,
  OFFICIAL_COMMUNICATION_LIBRARY_IDS,
} from '@/lib/communication/officialCommunicationLibrary'
import { buildMailMergeVariablesForRecipient } from '@/lib/communication/mailMergeEngine'
import { getConnectedKarkunsForRukn } from '@/lib/connections/getConnectedKarkunsForRukn'
import { composeWhatsAppMessage, getTemplate, listTemplates } from '@/services/templateService'
import { getActiveCampaignName } from '@/services/campaignService'
import type { MessageRecipient, MessageTemplate } from '@/types/communication'

function setAliases(vars: Record<string, string>, key: string, value: string): void {
  vars[key] = value
}

function daysSince(iso: string | undefined): number | null {
  if (!iso) return null
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return null
  return Math.max(0, Math.floor((Date.now() - ms) / (24 * 60 * 60 * 1000)))
}

/**
 * Extend mail-merge with Official Communication context variables.
 * All values resolve from already-loaded stores — no extra Firestore reads.
 */
export function buildOfficialCommunicationVariables(
  recipient: MessageRecipient,
): Record<string, string> {
  const vars = { ...buildMailMergeVariablesForRecipient(recipient) }

  if (recipient.personKind === 'rukn') {
    const ruknId = recipient.personId
    const connected = getConnectedKarkunsForRukn(ruknId)
    const assignedCount = connected.length
    const summary = buildCampaignExecutionSummary(ruknId)
    const matrix = buildCampaignMatrixRows(ruknId)
    const focus = buildTodaysFocusItems(ruknId, 8)
    const assignments = getActiveAssignmentsForRukn(ruknId)

    const pendingObjectives = focus.map((item) => item.pendingLabel).filter(Boolean)
    const pendingCount = matrix.filter((row) => !row.completed).length
    const progressPct =
      summary.assigned > 0
        ? Math.round((summary.completed / summary.assigned) * 100)
        : 0

    const earliestAssignment = assignments
      .map((item) => item.assignedDate || item.effectiveFrom || item.createdAt)
      .filter(Boolean)
      .sort()[0]
    const days = daysSince(earliestAssignment)

    const lastActivityCandidates = connected
      .map((karkun) => karkun.lastVisit || karkun.updatedAt)
      .filter(Boolean)
      .sort()
      .reverse()
    const lastActivity = lastActivityCandidates[0]

    setAliases(vars, 'KarkunWord', karkunWordForCount(assignedCount))
    setAliases(vars, 'AssignmentCount', String(assignedCount))
    setAliases(vars, 'PendingCount', String(pendingCount))
    setAliases(
      vars,
      'PendingObjectives',
      pendingObjectives.length > 0 ? pendingObjectives.join('، ') : 'مہم کی عمومی پیش رفت',
    )
    setAliases(vars, 'CampaignProgress', `${progressPct}%`)
    setAliases(
      vars,
      'DaysSinceAssignment',
      days !== null ? String(days) : '-',
    )
    setAliases(
      vars,
      'LastActivity',
      lastActivity
        ? new Date(lastActivity).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : '-',
    )
  } else {
    setAliases(vars, 'KarkunWord', 'کارکن')
    setAliases(vars, 'AssignmentCount', '-')
    setAliases(vars, 'PendingCount', '-')
    setAliases(vars, 'PendingObjectives', '-')
    setAliases(vars, 'CampaignProgress', '-')
    setAliases(vars, 'DaysSinceAssignment', '-')
    setAliases(vars, 'LastActivity', '-')
  }

  if (!vars.CampaignName || vars.CampaignName === '-') {
    setAliases(vars, 'CampaignName', getActiveCampaignName() || '-')
  }

  return vars
}

export function listOfficialCommunications(): MessageTemplate[] {
  const fromStore = listTemplates().filter(
    (template) =>
      template.isOfficial &&
      template.isActive !== false &&
      OFFICIAL_COMMUNICATION_LIBRARY_IDS.includes(template.id),
  )
  if (fromStore.length > 0) return fromStore
  return OFFICIAL_COMMUNICATION_LIBRARY
}

export function getOfficialCommunication(id: string): MessageTemplate | undefined {
  return getTemplate(id) ?? OFFICIAL_COMMUNICATION_LIBRARY.find((item) => item.id === id)
}

export type OfficialCommunicationPreview = {
  template: MessageTemplate
  variables: Record<string, string>
  body: string
  language: LanguageComplianceResult
  campaignName: string
}

/** Recipient → Official Communication → auto preview (read-only). */
export function buildOfficialCommunicationPreview(
  recipient: MessageRecipient,
  templateId: string,
): OfficialCommunicationPreview | { error: string } {
  const template = getOfficialCommunication(templateId)
  if (!template) {
    return { error: 'Official Communication not found.' }
  }
  const variables = buildOfficialCommunicationVariables(recipient)
  const body = composeWhatsAppMessage(template.body, variables, 'official')
  const language = checkOfficialLanguageCompliance(template.body)
  return {
    template,
    variables,
    body,
    language,
    campaignName: variables.CampaignName ?? getActiveCampaignName() ?? '-',
  }
}

/** Verify every library body against the language standard. */
export function verifyOfficialCommunicationLibraryLanguage(): {
  ok: boolean
  results: { id: string; name: string; ok: boolean; forbiddenHits: string[] }[]
} {
  const results = OFFICIAL_COMMUNICATION_LIBRARY.map((item) => {
    const check = checkOfficialLanguageCompliance(item.body)
    return {
      id: item.id,
      name: item.name,
      ok: check.ok,
      forbiddenHits: check.forbiddenHits,
    }
  })
  return { ok: results.every((item) => item.ok), results }
}

/** Suggest Campaign Initiation Pending when Rukn has assignment but no progress. */
export function shouldSuggestCampaignInitiation(ruknId: string): boolean {
  const connected = getConnectedKarkunsForRukn(ruknId)
  if (connected.length === 0) return false
  const summary = buildCampaignExecutionSummary(ruknId)
  return summary.visitCompleted === 0 && summary.completed === 0
}
