/**
 * KC-0068 / KC-0069 — Admin-only read-only Data Integrity Report.
 * Generates findings + merge candidates only; never mutates production data.
 */

import { useState } from 'react'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { IntegrityScanner } from '@/services/integrityScanner'
import type { IntegrityFinding, IntegrityReport } from '@/types/integrity.types'

function FindingList({
  title,
  findings,
  emptyLabel,
}: {
  title: string
  findings: IntegrityFinding[]
  emptyLabel: string
}) {
  if (findings.length === 0) {
    return (
      <div>
        <h4 className="text-sm font-semibold text-text-heading">{title}</h4>
        <p className="mt-1 text-sm text-secondary">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div>
      <h4 className="text-sm font-semibold text-text-heading">
        {title} ({findings.length})
      </h4>
      <ul className="mt-2 max-h-64 space-y-2 overflow-y-auto text-sm">
        {findings.map((finding, index) => (
          <li
            key={`${finding.code}-${finding.entityId ?? index}`}
            className="rounded-lg border border-border bg-surface px-3 py-2"
          >
            <p className="font-medium text-text-heading">{finding.message}</p>
            <p className="mt-0.5 text-xs text-secondary">
              {finding.code}
              {finding.entityId ? ` · ${finding.entityId}` : ''}
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function DataIntegrityReportPanel() {
  const [report, setReport] = useState<IntegrityReport | null>(null)
  const [running, setRunning] = useState(false)

  const runScan = () => {
    setRunning(true)
    try {
      // Synchronous in-memory scan — read-only, no writes.
      setReport(IntegrityScanner.run())
    } finally {
      setRunning(false)
    }
  }

  return (
    <section
      className="rounded-2xl border border-border bg-surface-muted px-4 py-4"
      aria-label="Data Integrity Report"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text-heading">Data Integrity Report</h3>
          <p className="mt-1 text-sm text-secondary">
            Read-only scan for duplicate Firestore document IDs, mobiles, pending requests, internal
            IDs, ASNs, possible names, missing mobiles, orphan connections, and invalid assignments.
            Merge candidates are listed for review only — no automatic fixes.
          </p>
        </div>
        <SecondaryButton type="button" onClick={runScan} disabled={running}>
          {running ? 'Scanning…' : report ? 'Re-run Scan' : 'Generate Report'}
        </SecondaryButton>
      </div>

      {report ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-4 text-sm">
            <div className="rounded-lg border border-border bg-surface px-3 py-2">
              <p className="text-secondary">Status</p>
              <p className="font-semibold text-text-heading">
                {report.summary.healthy ? 'Healthy' : 'Needs review'}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface px-3 py-2">
              <p className="text-secondary">Errors</p>
              <p className="font-semibold text-text-heading">{report.summary.errorCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface px-3 py-2">
              <p className="text-secondary">Warnings</p>
              <p className="font-semibold text-text-heading">{report.summary.warningCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-surface px-3 py-2">
              <p className="text-secondary">Merge candidates</p>
              <p className="font-semibold text-text-heading">
                {report.mergeCandidates.length}
              </p>
            </div>
          </div>

          <p className="text-xs text-secondary">
            Generated {new Date(report.generatedAt).toLocaleString('en-GB')} · Manual review only
          </p>

          <FindingList
            title="Errors"
            findings={report.errors}
            emptyLabel="No integrity errors found."
          />
          <FindingList
            title="Warnings"
            findings={report.warnings}
            emptyLabel="No integrity warnings found."
          />

          {report.mergeCandidates.length > 0 ? (
            <div>
              <h4 className="text-sm font-semibold text-text-heading">
                Merge Candidates ({report.mergeCandidates.length})
              </h4>
              <p className="mt-1 text-xs text-secondary">
                Administrator decides. Nothing is merged or deleted automatically.
              </p>
              <ul className="mt-2 max-h-80 space-y-3 overflow-y-auto text-sm">
                {report.mergeCandidates.map((candidate) => (
                  <li
                    key={candidate.mobile}
                    className="rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2"
                  >
                    <p className="font-medium text-text-heading">Mobile {candidate.mobile}</p>
                    <p className="mt-1 text-secondary">
                      Original: {candidate.original.name} ({candidate.original.id}) —{' '}
                      {candidate.original.connectionStatus}
                    </p>
                    <p className="text-secondary">
                      Duplicate:{' '}
                      {candidate.duplicate
                        .map((d) => `${d.name} (${d.id}) — ${d.connectionStatus}`)
                        .join('; ')}
                    </p>
                    <p className="mt-1 text-xs text-secondary">Reason: {candidate.reason}</p>
                    <p className="mt-1 text-xs font-medium text-text-heading">
                      {candidate.recommendation}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {report.recommendations.length > 0 ? (
            <div>
              <h4 className="text-sm font-semibold text-text-heading">Recommendations</h4>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-secondary">
                {report.recommendations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="mt-3 text-sm text-secondary">
          Run the scan to produce a one-time integrity report from current in-memory registry
          state.
        </p>
      )}
    </section>
  )
}
