/**
 * Admin dashboard ops layout experiment (presentation only).
 * Flip to false to restore the previous three-column Priorities / Alerts / Pending layout.
 * Previous implementation is retained in AdminOpsThreeColumnLayout — do not delete.
 */
export const USE_ADMIN_ACTION_CENTER_EXPERIMENT = true

/** Compact homepage shows only the highest-urgency tasks. */
export const ADMIN_TODAYS_MISSION_TOP_N = 5

export type ActionCenterSeverity = 'critical' | 'high' | 'medium'

export type AdminActionCenterItem = {
  id: string
  severity: ActionCenterSeverity
  severityLabel: 'Critical' | 'High' | 'Medium'
  title: string
  description: string
  actionLabel: string
  route: string
  count?: number
}

type AlertLike = {
  id: string
  severity: 'high' | 'medium' | 'low'
  title: string
  message: string
  route: string
}

type InterventionLike = {
  id: string
  severity: 'critical' | 'attention' | 'watch'
  title: string
  detail: string
  route: string
}

const SEVERITY_RANK: Record<ActionCenterSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
}

const SEVERITY_LABEL: Record<ActionCenterSeverity, AdminActionCenterItem['severityLabel']> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
}

function mapAlertSeverity(severity: AlertLike['severity']): ActionCenterSeverity {
  if (severity === 'high') return 'critical'
  if (severity === 'medium') return 'high'
  return 'medium'
}

function mapInterventionSeverity(
  severity: InterventionLike['severity'],
): ActionCenterSeverity {
  if (severity === 'critical') return 'critical'
  if (severity === 'attention') return 'high'
  return 'medium'
}

function extractCount(text: string): number | undefined {
  const match = text.match(/\b(\d+)\b/)
  if (!match) return undefined
  const value = Number(match[1])
  return Number.isFinite(value) ? value : undefined
}

function actionLabelFor(title: string, severity: ActionCenterSeverity): string {
  if (/registration|app\s*reg/i.test(title)) return 'Complete'
  if (/baitul|maal|ijtema|attendance/i.test(title)) return 'Review'
  if (/overdue|critical/i.test(title) && severity === 'critical') return 'View'
  if (/report|visit/i.test(title)) return 'Open'
  if (severity === 'critical') return 'Resolve'
  if (severity === 'high') return 'Open'
  return 'View'
}

/**
 * Unify existing alert + intervention queues into one Action Center list.
 * Presentation-only — does not change snapshot builders or repositories.
 */
export function buildAdminActionCenterItems(input: {
  alerts: AlertLike[]
  interventions: InterventionLike[]
}): AdminActionCenterItem[] {
  const items: AdminActionCenterItem[] = []
  const seenTitles = new Set<string>()

  const push = (item: AdminActionCenterItem) => {
    const key = item.title.trim().toLowerCase()
    if (seenTitles.has(key)) return
    seenTitles.add(key)
    items.push(item)
  }

  for (const alert of input.alerts) {
    const severity = mapAlertSeverity(alert.severity)
    push({
      id: `action-alert-${alert.id}`,
      severity,
      severityLabel: SEVERITY_LABEL[severity],
      title: alert.title,
      description: alert.message,
      actionLabel: actionLabelFor(alert.title, severity),
      route: alert.route,
      count: extractCount(alert.message),
    })
  }

  for (const intervention of input.interventions) {
    // Alerts are already represented above (interventions prefix alert ids).
    if (intervention.id.startsWith('alert-')) continue
    const severity = mapInterventionSeverity(intervention.severity)
    push({
      id: `action-${intervention.id}`,
      severity,
      severityLabel: SEVERITY_LABEL[severity],
      title: intervention.title,
      description: intervention.detail,
      actionLabel: actionLabelFor(intervention.title, severity),
      route: intervention.route,
      count: extractCount(intervention.detail),
    })
  }

  return items.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
}
