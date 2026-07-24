/**
 * KC-0108 — Admin Monthly Baitul Maal report.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader, PageShell } from '@/components/ui'
import {
  ROUTES,
  adminMonthlyBaitulMaalPath,
  adminMonthlyBaitulMaalReportPath,
} from '@/constants/routes'
import {
  getMonthlyBaitulMaalReport,
  listMonthlyBaitulMaalCycles,
} from '@/services/monthlyBaitulMaalService'
import { subscribeToMonthlyBaitulMaalStore } from '@/stores/monthlyBaitulMaalStore'
import { formatMonthlyBaitulMaalLabel } from '@/types/monthlyBaitulMaal'

export function AdminMonthlyBaitulMaalReportPage() {
  const { cycleId } = useParams<{ cycleId: string }>()
  const [version, setVersion] = useState(0)

  useEffect(() => subscribeToMonthlyBaitulMaalStore(() => setVersion((v) => v + 1)), [])

  const report = useMemo(() => {
    void version
    if (!cycleId) return null
    return getMonthlyBaitulMaalReport(cycleId)
  }, [cycleId, version])

  const history = useMemo(() => {
    void version
    return listMonthlyBaitulMaalCycles()
  }, [version])

  if (!cycleId || !report) {
    return (
      <PageShell>
        <PageHeader title="Monthly Report" description="Baitul Maal summary" />
        <p className="rounded-lg border border-border bg-surface p-4 text-sm text-secondary">
          Report not found.
        </p>
        <p className="mt-4 text-sm">
          <Link
            to={adminMonthlyBaitulMaalPath()}
            className="font-medium text-primary hover:underline"
          >
            ← Monthly Baitul Maal
          </Link>
        </p>
      </PageShell>
    )
  }

  const { cycle } = report

  return (
    <PageShell>
      <PageHeader
        title="Monthly Summary"
        description={`${cycle.title} · ${formatMonthlyBaitulMaalLabel(cycle.monthKey)}`}
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Contributed" value={String(report.contributed)} />
        <MetricCard label="Pending" value={String(report.pending)} />
        <MetricCard label="Completion %" value={`${report.completionPct}%`} />
        <MetricCard label="Total Assigned" value={String(report.totalAssigned)} />
        <MetricCard label="Rukns Submitted" value={String(report.ruknsSubmitted)} />
        <MetricCard label="Rukns Pending" value={String(report.ruknsPending)} />
        <MetricCard label="Status" value={cycle.status} />
      </section>

      <section className="mt-6 rounded-xl border border-border bg-surface p-4 shadow-card">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
          Rukn-wise Completion %
        </h2>
        {report.ruknRows.length === 0 ? (
          <p className="mt-3 text-sm text-secondary">No Rukns with assigned Karkuns.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-border text-xs uppercase tracking-wide text-secondary">
                <tr>
                  <th className="px-2 py-2 font-semibold">Rukn</th>
                  <th className="px-2 py-2 font-semibold">Assigned</th>
                  <th className="px-2 py-2 font-semibold">Contributed</th>
                  <th className="px-2 py-2 font-semibold">Pending</th>
                  <th className="px-2 py-2 font-semibold">Completion %</th>
                  <th className="px-2 py-2 font-semibold">Submission</th>
                </tr>
              </thead>
              <tbody>
                {report.ruknRows.map((row) => (
                  <tr key={row.ruknId} className="border-b border-border/70">
                    <td className="px-2 py-2 font-medium text-text-heading">{row.ruknName}</td>
                    <td className="px-2 py-2">{row.assigned}</td>
                    <td className="px-2 py-2">{row.contributed}</td>
                    <td className="px-2 py-2">{row.pending}</td>
                    <td className="px-2 py-2">
                      {row.submitted ? `${row.completionPct}%` : '—'}
                    </td>
                    <td className="px-2 py-2">
                      {row.submitted ? (
                        <span className="text-emerald-700">Submitted</span>
                      ) : (
                        <span className="text-amber-700">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
          Historical Months
        </h2>
        <ul className="mt-2 flex flex-wrap gap-2">
          {history.map((item) => (
            <li key={item.id}>
              <Link
                to={adminMonthlyBaitulMaalReportPath(item.id)}
                className={[
                  'inline-flex rounded-full border px-3 py-1 text-xs font-semibold',
                  item.id === cycle.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-text-heading hover:bg-surface-muted',
                ].join(' ')}
              >
                {formatMonthlyBaitulMaalLabel(item.monthKey)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-6 text-sm">
        <Link
          to={adminMonthlyBaitulMaalPath()}
          className="font-medium text-primary hover:underline"
        >
          ← Monthly Baitul Maal
        </Link>
        {' · '}
        <Link to={ROUTES.ADMIN} className="font-medium text-primary hover:underline">
          Dashboard
        </Link>
      </p>
    </PageShell>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-secondary">{label}</p>
      <p className="mt-1 text-xl font-semibold text-text-heading">{value}</p>
    </div>
  )
}
