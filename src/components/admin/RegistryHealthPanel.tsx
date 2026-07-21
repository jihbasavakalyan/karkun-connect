/**
 * KC-0073 — Administrator Registry Health panel (read-only monitoring).
 */

import { useState } from 'react'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import {
  downloadTextFile,
  exportRegistryHealthCsv,
  exportRegistryHealthJson,
  runRegistryHealthScan,
} from '@/services/registryHealthService'
import type { RegistryHealthReport, RegistryHealthTone } from '@/types/registryHealth.types'

const TONE_CLASS: Record<RegistryHealthTone, string> = {
  healthy: 'bg-emerald-50 text-emerald-900 border-emerald-200',
  warning: 'bg-amber-50 text-amber-900 border-amber-200',
  critical: 'bg-rose-50 text-rose-900 border-rose-200',
}

const TONE_ICON: Record<RegistryHealthTone, string> = {
  healthy: '🟢',
  warning: '🟡',
  critical: '🔴',
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm">
      <p className="text-secondary">{label}</p>
      <p className="font-semibold text-text-heading">{value}</p>
    </div>
  )
}

export function RegistryHealthPanel() {
  const [report, setReport] = useState<RegistryHealthReport | null>(null)
  const [running, setRunning] = useState(false)

  const runScan = () => {
    setRunning(true)
    try {
      setReport(runRegistryHealthScan())
    } finally {
      setRunning(false)
    }
  }

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

  return (
    <section
      className="rounded-2xl border border-border bg-surface-muted px-4 py-4"
      aria-label="Registry Health"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text-heading">Registry Health</h3>
          <p className="mt-1 text-sm text-secondary">
            Continuous integrity monitoring for the Karkun registry. Read-only — no automatic
            repairs. Use Duplicate Resolution for controlled cleanup when needed.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SecondaryButton type="button" onClick={runScan} disabled={running}>
            {running ? 'Scanning…' : report ? 'Re-scan' : 'Run Health Scan'}
          </SecondaryButton>
          <SecondaryButton type="button" onClick={exportJson} disabled={!report}>
            Export JSON
          </SecondaryButton>
          <SecondaryButton type="button" onClick={exportCsv} disabled={!report}>
            Export CSV
          </SecondaryButton>
        </div>
      </div>

      {report ? (
        <div className="mt-4 space-y-4">
          <div
            className={`rounded-xl border px-4 py-3 ${TONE_CLASS[report.score.tone]}`}
            role="status"
          >
            <p className="text-sm font-semibold">
              {TONE_ICON[report.score.tone]} {report.score.label} — Score {report.score.score}%
            </p>
            <p className="mt-1 text-xs opacity-90">
              Penalties: −{report.score.errorPenalty} errors · −{report.score.warningPenalty}{' '}
              warnings · Generated {new Date(report.generatedAt).toLocaleString('en-GB')}
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-heading">Registry Summary</h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-4 lg:grid-cols-7">
              <StatCard label="Total" value={report.summary.totalKarkuns} />
              <StatCard label="Active" value={report.summary.active} />
              <StatCard label="Archived" value={report.summary.archived} />
              <StatCard label="Connected" value={report.summary.connected} />
              <StatCard label="Available" value={report.summary.available} />
              <StatCard label="Assigned" value={report.summary.assigned} />
              <StatCard label="Unassigned" value={report.summary.unassigned} />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-heading">Duplicate Checks</h4>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Duplicate mobiles" value={report.duplicateChecks.duplicateMobiles} />
              <StatCard
                label="Duplicate registry IDs"
                value={report.duplicateChecks.duplicateRegistryIds}
              />
              <StatCard
                label="Duplicate active connections"
                value={report.duplicateChecks.duplicateActiveConnections}
              />
              <StatCard
                label="Duplicate assignments"
                value={report.duplicateChecks.duplicateAssignments}
              />
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-text-heading">
              Alerts ({report.alerts.length})
            </h4>
            {report.alerts.length === 0 ? (
              <p className="mt-2 text-sm text-secondary">No integrity alerts.</p>
            ) : (
              <ul className="mt-2 max-h-96 space-y-2 overflow-y-auto">
                {report.alerts.map((alert) => (
                  <li
                    key={alert.id}
                    className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          alert.severity === 'error'
                            ? 'rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800'
                            : 'rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800'
                        }
                      >
                        {alert.severity}
                      </span>
                      <span className="text-xs text-secondary">{alert.code}</span>
                    </div>
                    <p className="mt-1 font-medium text-text-heading">{alert.issue}</p>
                    {alert.affectedRecords.length > 0 ? (
                      <p className="mt-1 text-xs text-secondary">
                        Affected: {alert.affectedRecords.join(', ')}
                      </p>
                    ) : null}
                    <p className="mt-1 text-xs text-secondary">
                      Recommended: {alert.recommendedAction}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-lg border border-dashed border-border bg-surface px-3 py-2 text-xs text-secondary">
            Monitoring only. KC-0072 duplicate prevention and Duplicate Resolution remain unchanged.
            No data is modified by this scan.
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-secondary">
          Run a health scan to view registry summary, duplicate checks, integrity alerts, and the
          health score.
        </p>
      )}
    </section>
  )
}
