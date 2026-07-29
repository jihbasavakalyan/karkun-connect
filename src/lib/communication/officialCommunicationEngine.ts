/**
 * KC-0099 — Official Communication Engine.
 * Auto-populates campaign/relationship variables; no manual variable entry.
 * Reuses mail-merge + template compose — no new Firestore collections.
 */

import { getActiveAssignmentsForRukn } from '@/stores/assignmentStore'
import {
  buildCampaignExecutionSummary,
  buildCampaignMatrixRows,
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
import { formatPendingResponsibilitiesUrdu } from '@/lib/communication/officialBriefingFromCampaign'
import { buildMailMergeVariablesForRecipient } from '@/lib/communication/mailMergeEngine'
import { buildOfficialCampaignSummary } from '@/lib/ruknWorkspacePresentation'
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
    const campaignView = buildOfficialCampaignSummary(ruknId)
    const assignments = getActiveAssignmentsForRukn(ruknId)

    // KC-0130 — numeric pending summary (same as Rukn card); never join "Visit Pending" labels.
    const pendingObjectives = formatPendingResponsibilitiesUrdu(campaignView)
    const pendingCount = matrix.filter((row) => !row.completed).length
    const progressPct = campaignView.completionPct

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
    setAliases(vars, 'PendingObjectives', pendingObjectives)
    setAliases(vars, 'PendingResponsibilities', pendingObjectives)
    setAliases(vars, 'CompletedResponsibilities', String(summary.completed))
    setAliases(vars, 'CampaignProgress', `${progressPct}%`)
    setAliases(
      vars,
      'VisitProgress',
      `${campaignView.completedVisits}/${campaignView.connectedKarkuns}`,
    )
    setAliases(
      vars,
      'WeeklyIjtemaProgress',
      `${campaignView.completedWeeklyIjtema}/${campaignView.connectedKarkuns}`,
    )
    setAliases(
      vars,
      'MonthlyBaitulMaalProgress',
      `${campaignView.completedMonthlyBaitulMaal}/${campaignView.connectedKarkuns}`,
    )
    setAliases(
      vars,
      'AppRegistrationProgress',
      `${campaignView.completedAppRegistration}/${campaignView.connectedKarkuns}`,
    )
    setAliases(
      vars,
      'CampaignSummary',
      campaignView.connectedKarkuns > 0
        ? `ملاقات ${campaignView.completedVisits}/${campaignView.connectedKarkuns} · اجتماع ${campaignView.completedWeeklyIjtema}/${campaignView.connectedKarkuns} · بیت المال ${campaignView.completedMonthlyBaitulMaal}/${campaignView.connectedKarkuns} · ایپ ${campaignView.completedAppRegistration}/${campaignView.connectedKarkuns}`
        : 'ابھی کوئی سپردگی نہیں',
    )
    setAliases(vars, 'DaysSinceAssignment', days !== null ? String(days) : '-')
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
    setAliases(vars, 'OverallStatus', campaignView.overallStatus.label)
    setAliases(vars, 'LastCommunication', campaignView.lastCommunication)
  } else {
    setAliases(vars, 'KarkunWord', 'کارکن')
    setAliases(vars, 'AssignmentCount', '-')
    setAliases(vars, 'PendingCount', '-')
    setAliases(vars, 'PendingObjectives', '-')
    setAliases(vars, 'PendingResponsibilities', '-')
    setAliases(vars, 'CompletedResponsibilities', '-')
    setAliases(vars, 'CampaignProgress', '-')
    setAliases(vars, 'VisitProgress', '-')
    setAliases(vars, 'WeeklyIjtemaProgress', '-')
    setAliases(vars, 'MonthlyBaitulMaalProgress', '-')
    setAliases(vars, 'AppRegistrationProgress', '-')
    setAliases(vars, 'CampaignSummary', '-')
    setAliases(vars, 'DaysSinceAssignment', '-')
    setAliases(vars, 'LastActivity', '-')
    setAliases(vars, 'OverallStatus', '-')
    setAliases(vars, 'LastCommunication', '-')
  }

  if (!vars.CampaignName || vars.CampaignName === '-') {
    setAliases(vars, 'CampaignName', getActiveCampaignName() || '-')
  }

  // Free-text slots — empty until the operator edits (ZWSP so mail-merge does not emit "-").
  if (!vars.PersonalNote?.trim()) setAliases(vars, 'PersonalNote', '\u200b')
  if (!vars.AdditionalRemarks?.trim()) setAliases(vars, 'AdditionalRemarks', '\u200b')
  if (!vars.ClosingMessage?.trim()) setAliases(vars, 'ClosingMessage', '\u200b')

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
