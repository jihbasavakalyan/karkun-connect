/**
 * KC-0059 — Daily Campaign Communication Engine types.
 * Read-only report payloads for Administrator → Arkaan messaging.
 */

export type DailyReportTemplateId = 'daily-progress' | 'motivation' | 'final-push'

export type DailyReportPlaceholders = {
  campaignName: string
  day: string
  daysLeft: string
  total: string
  connected: string
  remaining: string
  progress: string
  todayVisits: string
  pendingVisits: string
  followUps: string
  development: string
  compliance: string
}

export type DailyReportMetricsSnapshot = {
  campaignName: string
  day: number | null
  daysLeft: number | null
  dayLabel: string
  total: number
  connected: number
  remaining: number
  progress: number
  todayVisits: number
  pendingVisits: number
  followUps: number
  development: number
  compliance: number
  sourceOfTruth: 'DailyReportService'
}

export type DailyReportTemplate = {
  id: DailyReportTemplateId
  name: string
  description: string
  language: 'ur'
  audience: 'arkaan'
  body: string
}

export type DailyReportPreview = {
  templateId: DailyReportTemplateId
  templateName: string
  metrics: DailyReportMetricsSnapshot
  placeholders: DailyReportPlaceholders
  renderedBody: string
  generatedAt: string
}
