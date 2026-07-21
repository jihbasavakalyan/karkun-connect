/**
 * KC-0073 — Administrator Registry Health Dashboard (read-only).
 * Mission Control style cards; no automatic repairs.
 */

import { useEffect, useState } from 'react'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import {
  downloadTextFile,
  exportRegistryHealthCsv,
  exportRegistryHealthJson,
  runRegistryHealthScan,
} from '@/services/registryHealthService'
import type {
  RegistryHealthAlert,
  RegistryHealthAlertSeverity,
  RegistryHealthReport,
  RegistryHealthTone,
} from '@/types/registryHealth.types'

const TONE_CLASS: Record<RegistryHealthTone, string> = {
  healthy: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  critical: 'border-rose-200 bg-rose-50 text-rose-900',
}

const TONE_ICON: Record<RegistryHealthTone, string> = {
  healthy: '🟢',
  warning: '🟡',
  critical: '🔴',
}

const SEVERITY_CLASS: Record<RegistryHealthAlertSeverity, string> = {
  critical: 'bg-rose-100 text-rose-800',
  warning: 'bg-amber-100 text-amber-800',
  information: 'bg-slate-100 text-slate-700',
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm shadow-sm">
      <p className="text-xs text-secondary">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-text-heading">{value}</p>
    </div>
  )
}

function CheckRow({
  label,
  passed,
  count,
}: {
  label: string
  passed: boolean
  count: number
}) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-sm">
      <span className="text-text-heading">
        <span aria-hidden="true">{passed ? '✓' : '✗'}</span> {label}
      </span>
      <span className={passed ? 'text-emerald-700' : 'font-semibold text-rose-700'}>
        {passed ? 'Pass' : `${count} issue(s)`}
      </span>
    </li>
  )
}

function ExpandableAlertGroup({
  title,
  severity,
  alerts,
}: {
  title: string
  severity: RegistryHealthAlertSeverity
  alerts: RegistryHealthAlert[]
}) {
  const [open, setOpen] = useState(severity === 'critical')
  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface px-3 py-2 text-sm">
        <p className="font-semibold text-text-heading">
          {title} <span className="text-secondary">(0)</span>
        </p>
        <p className="mt-1 text-secondary">None</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm font-semibold text-text-heading"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span>
          {title} ({alerts.length})
        </span>
        <span aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>
      {open ? (
        <ul className="max-h-72 space-y-2 overflow-y-auto border-t border-border px-3 py-2">
          {alerts.map((alert) => (
            <li key={alert.id} className="rounded-lg border border-border bg-surface-muted px-3 py-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_CLASS[severity]}`}
                >
                  {severity}
                </span>
                <span className="text-xs text-secondary">{alert.code}</span>
              </div>
              <p className="mt-1 font-medium text-text-heading">{alert.issue}</p>
              {alert.affectedRecords.length > 0 ? (
                <p className="mt-1 text-xs text-secondary">
                  Affected: {alert.affectedRecords.join(', ')}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-secondary">Recommended: {alert.recommendedAction}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function RegistryHealthPanel() {
  const [report, setReport] = useState<RegistryHealthReport | null>(null)
  const [running, setRunning] = useState(false)

  const runScan = () => {
    setRunning(true)
    try {
      // Synchronous in-memory scan over repository caches — no Firestore round-trips.
      setReport(runRegistryHealthScan())
    } finally {
      setRunning(false)
    }
  }

  useEffect(() => {
    runScan()
  }, [])

  const exportJson = () => {
    if (!report) return
    const stamp = report.generatedAt.replace(/[:.]/g, '-')
    downloadTextFile(
      exportRegistryHealthJson(report),
      `registry-health-${stamp}.json`,
      'application/json;charset=utf-8',
    )
  }

  const exportCsv = () => {
    if (!report) return
    const stamp = report.generatedAt.replace(/[:.]/g, '-')
    downloadTextFile(
      exportRegistryHealthCsv(report),
      `registry-health-${stamp}.csv`,
      'text/csv;charset=utf-8',
    )
  }

  const criticalAlerts = report?.alerts.filter((a) => a.severity === 'critical') ?? []
  const warningAlerts = report?.alerts.filter((a) => a.severity === 'warning') ?? []
  const infoAlerts = report?.alerts.filter((a) => a.severity === 'information') ?? []

  return (
    <section className="space-y-4" aria-label="Registry Health Dashboard">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text-heading">Registry Health</h3>
          <p className="mt-1 text-sm text-secondary">
            Mission Control integrity dashboard. Read-only — no automatic repairs.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton type="button" onClick={runScan} disabled={running}>
            {running ? 'Refreshing…' : 'Refresh Health Check'}
          </SecondaryButton>
          <SecondaryButton type="button" onClick={exportJson} disabled={!report}>
            Export JSON
          </SecondaryButton>
          <SecondaryButton type="button" onClick={exportCsv} disabled={!report}>
            Export CSV
          </SecondaryButton>
        </div>
      </div>

      {!report ? (
        <p className="text-sm text-secondary" aria-busy={running}>
          {running ? 'Running health scan…' : 'No report yet.'}
        </p>
      ) : (
        <>
          {/* Section 1 — Executive Health Card */}
          <div className={`rounded-2xl border px-4 py-4 shadow-sm ${TONE_CLASS[report.score.tone]}`}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
                  Overall Registry Health Score
                </p>
                <p className="mt-1 text-4xl font-bold">
                  {TONE_ICON[report.score.tone]} {report.score.score}%
                </p>
                <p className="mt-1 text-sm font-semibold">{report.score.label}</p>
              </div>
              <div
                className="h-2 w-40 overflow-hidden rounded-full bg-white/50"
                role="progressbar"
                aria-valuenow={report.score.score}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className="h-full rounded-full bg-current opacity-80"
                  style={{ width: `${report.score.score}%` }}
                />
              </div>
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5 text-sm">
              <StatCard
                label="Last Scan"
                value={new Date(report.scan.lastScanAt).toLocaleString('en-GB')}
              />
              <StatCard label="Total Checks" value={report.scan.totalChecks} />
              <StatCard label="Passed" value={report.scan.passed} />
              <StatCard label="Warnings" value={report.scan.warnings} />
              <StatCard label="Critical Issues" value={report.scan.criticalIssues} />
            </div>
          </div>

          {/* Section 2 — Registry Statistics */}
          <div className="rounded-2xl border border-border bg-surface-muted px-4 py-4">
            <h4 className="text-sm font-semibold text-text-heading">Registry Statistics</h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
              <StatCard label="Total Karkuns" value={report.summary.totalKarkuns} />
              <StatCard label="Active" value={report.summary.active} />
              <StatCard label="Archived" value={report.summary.archived} />
              <StatCard label="Connected" value={report.summary.connected} />
              <StatCard label="Available" value={report.summary.available} />
              <StatCard label="Assigned" value={report.summary.assigned} />
              <StatCard label="Unassigned" value={report.summary.unassigned} />
              <StatCard label="Male" value={report.summary.male} />
              <StatCard label="Female" value={report.summary.female} />
              <StatCard label="Pending Requests" value={report.summary.pendingRequests} />
            </div>
          </div>

          {/* Section 3 — Integrity Checks */}
          <div className="rounded-2xl border border-border bg-surface-muted px-4 py-4">
            <h4 className="text-sm font-semibold text-text-heading">Integrity Checks</h4>
            <ul className="mt-2 space-y-2">
              {report.integrityChecks.map((check) => (
                <CheckRow
                  key={check.id}
                  label={check.label}
                  passed={check.passed}
                  count={check.count}
                />
              ))}
            </ul>
          </div>

          {/* Section 4 — Duplicate Checks */}
          <div className="rounded-2xl border border-border bg-surface-muted px-4 py-4">
            <h4 className="text-sm font-semibold text-text-heading">Duplicate Checks</h4>
            <p className="mt-1 text-xs text-secondary">Expected after KC-0072: all zero.</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <StatCard label="Duplicate mobiles" value={report.duplicateChecks.duplicateMobiles} />
              <StatCard
                label="Duplicate registry IDs"
                value={report.duplicateChecks.duplicateRegistryIds}
              />
              <StatCard
                label="Duplicate active assignments"
                value={report.duplicateChecks.duplicateActiveAssignments}
              />
              <StatCard
                label="Duplicate active connections"
                value={report.duplicateChecks.duplicateActiveConnections}
              />
              <StatCard
                label="Duplicate pending requests"
                value={report.duplicateChecks.duplicatePendingRequests}
              />
            </div>
          </div>

          {/* Section 5 — Data Quality */}
          <div className="rounded-2xl border border-border bg-surface-muted px-4 py-4">
            <h4 className="text-sm font-semibold text-text-heading">Data Quality</h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Missing mobile" value={report.dataQuality.missingMobile} />
              <StatCard label="Missing name" value={report.dataQuality.missingName} />
              <StatCard label="Missing gender" value={report.dataQuality.missingGender} />
              <StatCard label="Missing area" value={report.dataQuality.missingArea} />
              <StatCard label="Missing status" value={report.dataQuality.missingStatus} />
              <StatCard label="Invalid mobile format" value={report.dataQuality.invalidMobileFormat} />
              <StatCard label="Unknown gender" value={report.dataQuality.unknownGender} />
              <StatCard label="Unknown status" value={report.dataQuality.unknownStatus} />
            </div>
          </div>

          {/* Section 6 — Consistency Checks */}
          <div className="rounded-2xl border border-border bg-surface-muted px-4 py-4">
            <h4 className="text-sm font-semibold text-text-heading">Consistency Checks</h4>
            <ul className="mt-2 space-y-2">
              <CheckRow
                label={`Connected count == Active Connections (${report.consistency.connectedCount} / ${report.consistency.activeConnectionCount})`}
                passed={report.consistency.connectedEqualsActiveConnections}
                count={
                  Math.abs(
                    report.consistency.connectedCount - report.consistency.activeConnectionCount,
                  )
                }
              />
              <CheckRow
                label={`Assigned count == Active Assignment count (${report.consistency.assignedCount} / ${report.consistency.activeAssignmentCount})`}
                passed={report.consistency.assignedEqualsActiveAssignments}
                count={
                  Math.abs(
                    report.consistency.assignedCount - report.consistency.activeAssignmentCount,
                  )
                }
              />
              <CheckRow
                label="Archived records excluded from active totals"
                passed={report.consistency.archivedExcludedFromActive}
                count={report.consistency.archivedExcludedFromActive ? 0 : 1}
              />
              <CheckRow
                label="Every merged duplicate remains archived"
                passed={report.consistency.mergedDuplicatesRemainArchived}
                count={report.consistency.mergedDuplicatesRemainArchived ? 0 : 1}
              />
              <CheckRow
                label="No orphan mergedInto references"
                passed={report.consistency.orphanMergedIntoRefs === 0}
                count={report.consistency.orphanMergedIntoRefs}
              />
            </ul>
          </div>

          {/* Section 7 — Warnings by severity */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-text-heading">Issues by Severity</h4>
            <ExpandableAlertGroup title="Critical" severity="critical" alerts={criticalAlerts} />
            <ExpandableAlertGroup title="Warning" severity="warning" alerts={warningAlerts} />
            <ExpandableAlertGroup title="Information" severity="information" alerts={infoAlerts} />
          </div>

          <p className="rounded-xl border border-dashed border-border bg-surface px-3 py-2 text-xs text-secondary">
            Monitoring only. KC-0072 duplicate prevention and Duplicate Resolution remain unchanged.
            No data is modified by this scan. Validations use in-memory repository caches (no polling).
          </p>
        </>
      )}
    </section>
  )
}
