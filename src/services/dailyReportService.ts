/**
 * KC-0059 — Daily Campaign Communication Engine (Administrator → Arkaan).
 *
 * READ ONLY. Consumes existing dashboard metrics services.
 * Does not write stores, repositories, or dashboard state.
 * Does not modify MetricsService, hydration, or Auth.
 */

import { getCampaignProgressOverview } from '@/lib/commandCenterPresentation'
import { renderDailyReportBody } from '@/lib/dailyReports/renderDailyReport'
import {
  ARKAAN_DAILY_REPORT_TEMPLATES,
  getArkaanDailyReportTemplate,
} from '@/data/dailyReports/arkanTemplates'
import { getAnnexure1ExecutionMetrics } from '@/services/annexure1Service'
import {
  getActiveCampaign,
  getCampaignTimeline,
} from '@/services/campaignService'
import { getFollowUpDashboardMetrics } from '@/services/followUpService'
import { getCampaignConnectionMetrics } from '@/services/metricsService'
import type {
  DailyReportMetricsSnapshot,
  DailyReportPlaceholders,
  DailyReportPreview,
  DailyReportTemplate,
  DailyReportTemplateId,
} from '@/types/dailyReport'

function asPlaceholderNumber(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) {
    return '—'
  }
  return String(Math.round(value))
}

/**
 * Snapshot of live dashboard metrics for Arkaan daily communication.
 * All values come from existing services — no recalculation of Connected/Remaining.
 */
export function collectDailyReportMetrics(): DailyReportMetricsSnapshot {
  const campaign = getActiveCampaign()
  const timeline = getCampaignTimeline()
  const connections = getCampaignConnectionMetrics()
  const annexure = getAnnexure1ExecutionMetrics()
  const followUps = getFollowUpDashboardMetrics()
  const overview = getCampaignProgressOverview()

  return {
    campaignName: campaign?.name?.trim() || 'Active Campaign',
    day: timeline?.currentDay ?? null,
    daysLeft: timeline?.daysRemaining ?? null,
    dayLabel: timeline?.dayLabel ?? '—',
    total: connections.total,
    connected: connections.connected,
    remaining: connections.remaining,
    progress: connections.progressPct,
    todayVisits: annexure.submittedToday,
    pendingVisits: annexure.pendingMeetings,
    followUps: followUps.pendingFollowUps,
    development: overview.execution,
    compliance: overview.compliance,
    sourceOfTruth: 'DailyReportService',
  }
}

export function toDailyReportPlaceholders(
  metrics: DailyReportMetricsSnapshot,
): DailyReportPlaceholders {
  return {
    campaignName: metrics.campaignName,
    day: metrics.day != null ? String(metrics.day) : metrics.dayLabel,
    daysLeft: asPlaceholderNumber(metrics.daysLeft),
    total: asPlaceholderNumber(metrics.total),
    connected: asPlaceholderNumber(metrics.connected),
    remaining: asPlaceholderNumber(metrics.remaining),
    progress: asPlaceholderNumber(metrics.progress),
    todayVisits: asPlaceholderNumber(metrics.todayVisits),
    pendingVisits: asPlaceholderNumber(metrics.pendingVisits),
    followUps: asPlaceholderNumber(metrics.followUps),
    development: asPlaceholderNumber(metrics.development),
    compliance: asPlaceholderNumber(metrics.compliance),
  }
}

export function listDailyReportTemplates(): DailyReportTemplate[] {
  return [...ARKAAN_DAILY_REPORT_TEMPLATES]
}

export function generateDailyReportPreview(
  templateId: DailyReportTemplateId = 'daily-progress',
): DailyReportPreview {
  const template = getArkaanDailyReportTemplate(templateId)
  if (!template) {
    throw new Error(`Unknown daily report template: ${templateId}`)
  }

  const metrics = collectDailyReportMetrics()
  const placeholders = toDailyReportPlaceholders(metrics)
  const renderedBody = renderDailyReportBody(template.body, placeholders)

  return {
    templateId: template.id,
    templateName: template.name,
    metrics,
    placeholders,
    renderedBody,
    generatedAt: new Date().toISOString(),
  }
}

/** Download preview as UTF-8 plain text (WhatsApp-ready paste file). */
export function exportDailyReportText(
  preview: DailyReportPreview,
  filename?: string,
): void {
  const stamp = preview.generatedAt.slice(0, 10)
  const safeName =
    filename ??
    `arkan-daily-report-${preview.templateId}-${stamp}.txt`
  const blob = new Blob([preview.renderedBody], {
    type: 'text/plain;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = safeName
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export async function copyDailyReportToClipboard(
  preview: DailyReportPreview,
): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(preview.renderedBody)
    return
  }

  // Fallback for environments without Clipboard API.
  const textarea = document.createElement('textarea')
  textarea.value = preview.renderedBody
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  const ok = document.execCommand('copy')
  textarea.remove()
  if (!ok) {
    throw new Error('Unable to copy report to clipboard.')
  }
}

/** Future WhatsApp Business API seam — not implemented in KC-0059. */
export type FutureWhatsAppDailyReportPayload = {
  channel: 'whatsapp-business-api'
  audience: 'arkaan'
  templateId: DailyReportTemplateId
  body: string
  metrics: DailyReportMetricsSnapshot
}

export function buildFutureWhatsAppPayload(
  preview: DailyReportPreview,
): FutureWhatsAppDailyReportPayload {
  return {
    channel: 'whatsapp-business-api',
    audience: 'arkaan',
    templateId: preview.templateId,
    body: preview.renderedBody,
    metrics: preview.metrics,
  }
}
