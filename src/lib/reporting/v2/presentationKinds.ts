/**
 * KC-037C-F — Shared presentation model kinds for report sections.
 * Presentation only — values originate from KC-033 / Composer context.
 */

export type MetricPairView = {
  completed: number
  total: number
  pending: number
  pct: number
  label?: string
}

export type RankRowView = {
  rank: number
  id: string
  name: string
  gender?: string
  score: number
  pct: number
  note?: string
}

export type InsightItemView = {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  title: string
  detail: string
  source: 'provider' | 'rafeeq' | 'scoring'
}

export type AuditAppendixView = {
  integritySummary: string
  snapshotKind: string
  dataSources: string[]
  providerVersion: string
  generatedAt: string
  reportVersion: string
  exportMetadata: Record<string, string>
}

export type KpiCardView = {
  id: string
  title: string
  value: string | number
  subtitle?: string
  tone?: 'neutral' | 'good' | 'warn' | 'danger'
  /** Connection vs Visit must never share ids. */
  metricFamily?: 'connection' | 'visit' | 'ijtema' | 'baitul_maal' | 'app' | 'census' | 'other'
}

export type NarrativeBlockView = {
  whereAreWe: string
  achieved: string
  remaining: string
  responsible: string
  action: string
}
