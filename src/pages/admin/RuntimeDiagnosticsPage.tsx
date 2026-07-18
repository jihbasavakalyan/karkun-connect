/**
 * KC-029 — Temporary Admin + DEV-only runtime truth diagnostics.
 * Observation only. Does not mutate business state.
 */

import { useCallback, useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { isRuntimeDiagnosticsEnabled } from '@/lib/debug/isRuntimeDiagnosticsEnabled'
import {
  addRuntimeManualMark,
  clearRuntimeTruthBaseline,
  collectRuntimeTruth,
  saveRuntimeTruthBaseline,
  type RuntimeTruthSnapshot,
} from '@/lib/debug/collectRuntimeTruth'
import { ROUTES } from '@/constants/routes'

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={[
        'inline-flex rounded-md px-2 py-0.5 text-xs font-medium',
        ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900',
      ].join(' ')}
    >
      {label}: {ok ? 'ready' : 'not ready'}
    </span>
  )
}

export function RuntimeDiagnosticsPage() {
  const { user, status } = useAuth()
  const enabled = isRuntimeDiagnosticsEnabled()
  const [snapshot, setSnapshot] = useState<RuntimeTruthSnapshot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const next = await collectRuntimeTruth({
        authStatus: status,
        user,
        diagnosticsFlag: enabled,
      })
      setSnapshot(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [enabled, status, user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  if (!enabled) {
    return <Navigate to={ROUTES.ADMIN} replace />
  }

  if (user?.role !== 'administrator') {
    return <Navigate to={ROUTES.HOME} replace />
  }

  const downloadJson = () => {
    if (!snapshot) return
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kc029-runtime-truth-${snapshot.capturedAt.replace(/[:.]/g, '-')}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-secondary">KC-029</p>
        <h1 className="text-2xl font-semibold text-text-heading">Runtime Truth Diagnostics</h1>
        <p className="text-sm text-secondary">
          Developer-only observation page. No business mutations. Flag:{' '}
          <code>runtimeDiagnostics.enabled</code>
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-primary px-3 py-1.5 text-sm text-white"
            onClick={() => void refresh()}
            disabled={loading}
          >
            {loading ? 'Capturing…' : 'Refresh capture'}
          </button>
          <button
            type="button"
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
            disabled={!snapshot}
            onClick={() => {
              if (!snapshot) return
              saveRuntimeTruthBaseline(snapshot)
              void refresh()
            }}
          >
            Save baseline (pre-refresh)
          </button>
          <button
            type="button"
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
            onClick={() => {
              clearRuntimeTruthBaseline()
              void refresh()
            }}
          >
            Clear baseline
          </button>
          <button
            type="button"
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-sm"
            disabled={!snapshot}
            onClick={downloadJson}
          >
            Download JSON evidence
          </button>
        </div>
        {error ? <p className="text-sm text-error">{error}</p> : null}
      </header>

      {!snapshot ? (
        <p className="text-sm text-secondary">Waiting for first capture…</p>
      ) : (
        <>
          <section className="rounded-xl border border-border bg-surface p-4" aria-label="Environment">
            <h2 className="text-lg font-semibold text-text-heading">A — Environment</h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-secondary">Build SHA</dt>
                <dd className="font-mono">{snapshot.environment.buildSha}</dd>
              </div>
              <div>
                <dt className="text-secondary">Build timestamp</dt>
                <dd className="font-mono">{snapshot.environment.buildTimestamp}</dd>
              </div>
              <div>
                <dt className="text-secondary">Environment</dt>
                <dd>
                  {snapshot.environment.viteMode} (DEV={String(snapshot.environment.isDev)})
                </dd>
              </div>
              <div>
                <dt className="text-secondary">Firebase Project ID</dt>
                <dd className="font-mono">{snapshot.environment.firebaseProjectId}</dd>
              </div>
              <div>
                <dt className="text-secondary">Repository Provider</dt>
                <dd>{snapshot.environment.repositoryProvider}</dd>
              </div>
              <div>
                <dt className="text-secondary">Authentication State</dt>
                <dd>{snapshot.environment.authStatus}</dd>
              </div>
              <div>
                <dt className="text-secondary">Current User</dt>
                <dd className="font-mono text-xs">
                  {snapshot.environment.currentUser
                    ? `${snapshot.environment.currentUser.email} / ${snapshot.environment.currentUser.role} / ${snapshot.environment.currentUser.uid}`
                    : 'null'}
                </dd>
              </div>
              <div>
                <dt className="text-secondary">Current Campaign</dt>
                <dd>
                  {snapshot.environment.campaign
                    ? `${snapshot.environment.campaign.name} (${snapshot.environment.campaign.id})`
                    : 'null'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-surface p-4" aria-label="Startup status">
            <h2 className="text-lg font-semibold text-text-heading">B — Startup Status</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <StatusPill ok={snapshot.startup.firebaseInitialized} label="Firebase" />
              <StatusPill ok={snapshot.startup.repositoryReady} label="Repository" />
              <StatusPill ok={snapshot.startup.assignmentStoreReady} label="Assignment Store" />
              <StatusPill ok={snapshot.startup.peopleStoreReady} label="People Store" />
              <StatusPill ok={snapshot.startup.automationReady} label="Automation" />
              <StatusPill ok={snapshot.startup.dashboardReady} label="Dashboard" />
            </div>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-secondary">Startup duration</dt>
                <dd>{snapshot.startup.startupDurationMs ?? 'n/a'} ms</dd>
              </div>
              <div>
                <dt className="text-secondary">Hydration duration</dt>
                <dd>{snapshot.startup.hydrationDurationMs ?? 'n/a'} ms</dd>
              </div>
              <div>
                <dt className="text-secondary">Snapshot active</dt>
                <dd>{String(snapshot.startup.snapshotActive)}</dd>
              </div>
              <div>
                <dt className="text-secondary">Last snapshot timestamp</dt>
                <dd className="font-mono text-xs">{snapshot.startup.lastSnapshotTimestamp}</dd>
              </div>
              <div>
                <dt className="text-secondary">Repository version</dt>
                <dd className="font-mono text-xs">{snapshot.startup.repositoryVersion ?? 'n/a'}</dd>
              </div>
              <div>
                <dt className="text-secondary">Store version</dt>
                <dd className="font-mono text-xs">{snapshot.startup.storeVersion ?? 'n/a'}</dd>
              </div>
              <div>
                <dt className="text-secondary">Hydrate cycles (lifecycle)</dt>
                <dd>{snapshot.startup.lifecycle.hydrateCycles}</dd>
              </div>
              <div>
                <dt className="text-secondary">Store notifies (lifecycle)</dt>
                <dd>{snapshot.startup.lifecycle.storeNotifies}</dd>
              </div>
            </dl>
          </section>

          <section className="rounded-xl border border-border bg-surface p-4" aria-label="Connection counts">
            <h2 className="text-lg font-semibold text-text-heading">C — Connection Counts</h2>
            <p className="mt-1 text-sm text-secondary">
              Same authenticated session. Highlighted rows differ from Canonical Connected Count.
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-secondary">
                    <th className="py-2 pr-3">Layer</th>
                    <th className="py-2 pr-3">Count</th>
                    <th className="py-2 pr-3">Function</th>
                    <th className="py-2 pr-3">File</th>
                    <th className="py-2">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.counts.map((row) => {
                    const canonical = snapshot.counts.find(
                      (c) => c.layer === 'Canonical Connected Count',
                    )?.count
                    const highlight =
                      row.layer !== 'Firestore connection count' &&
                      row.layer !== 'Repository count' &&
                      row.layer !== 'assignmentStore count' &&
                      row.layer !== 'assignmentStore Active row count' &&
                      row.layer !== 'Rukn Profile Connected Count' &&
                      row.layer !== 'Connected Page Count' &&
                      row.count !== null &&
                      canonical !== null &&
                      row.count !== canonical
                    const ruknHighlight =
                      (row.layer === 'Rukn Profile Connected Count' ||
                        row.layer === 'Connected Page Count') &&
                      snapshot.divergences.some(
                        (d) =>
                          d.layerA.includes('Profile') || d.layerB.includes('Connected Page'),
                      )
                    const warn = highlight || ruknHighlight || Boolean(row.error)
                    return (
                      <tr
                        key={row.layer}
                        className={warn ? 'bg-rose-50 text-rose-900' : 'border-b border-border/60'}
                      >
                        <td className="py-2 pr-3 font-medium">{row.layer}</td>
                        <td className="py-2 pr-3 font-mono">
                          {row.count === null ? 'n/a' : row.count}
                          {row.error ? ` (${row.error})` : ''}
                        </td>
                        <td className="py-2 pr-3 font-mono text-xs">{row.functionName}</td>
                        <td className="py-2 pr-3 font-mono text-xs">{row.file}</td>
                        <td className="py-2 text-xs">
                          {row.source}
                          {row.note ? ` — ${row.note}` : ''}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {snapshot.divergences.length > 0 ? (
              <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50/60 p-3 text-sm">
                <h3 className="font-semibold text-rose-900">Divergences</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {snapshot.divergences.map((d) => (
                    <li key={`${d.layerA}-${d.layerB}`}>
                      {d.layerA}={String(d.valueA)} ≠ {d.layerB}={String(d.valueB)}
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-3 text-sm text-emerald-800">
                No divergence among Canonical / People / Dashboard / Automation (campaign-wide).
              </p>
            )}

            <h3 className="mt-4 text-sm font-semibold text-text-heading">
              Dashboard reconciliation (KC-003)
            </h3>
            <p className="mt-1 text-xs text-secondary">{snapshot.dashboardReconciliation.rule}</p>
            <p className="mt-1 text-sm">
              Repository {snapshot.dashboardReconciliation.repositoryCount} → included{' '}
              {snapshot.dashboardReconciliation.includedCount} → excluded{' '}
              {snapshot.dashboardReconciliation.exclusionCount}
            </p>
            {snapshot.dashboardReconciliation.exclusions.length > 0 ? (
              <div className="mt-2 overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border text-secondary">
                      <th className="py-1 pr-2">assignmentId</th>
                      <th className="py-1 pr-2">ASN</th>
                      <th className="py-1 pr-2">karkunId</th>
                      <th className="py-1 pr-2">ruknId</th>
                      <th className="py-1 pr-2">status</th>
                      <th className="py-1">reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.dashboardReconciliation.exclusions.map((row) => (
                      <tr key={row.assignmentId} className="border-b border-border/50">
                        <td className="py-1 pr-2 font-mono">{row.assignmentId}</td>
                        <td className="py-1 pr-2 font-mono">{row.assignmentNumber}</td>
                        <td className="py-1 pr-2 font-mono">{row.karkunId}</td>
                        <td className="py-1 pr-2 font-mono">{row.ruknId}</td>
                        <td className="py-1 pr-2">{row.status}</td>
                        <td className="py-1">
                          {row.reason}
                          {row.keptAssignmentNumber
                            ? ` (kept ${row.keptAssignmentNumber})`
                            : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="mt-2 text-sm text-emerald-800">
                No exclusions — every repository row is included in the Dashboard Connected KPI.
              </p>
            )}

            <h3 className="mt-4 text-sm font-semibold text-text-heading">Per-Rukn parity</h3>
            <div className="mt-2 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-secondary">
                    <th className="py-2 pr-3">Rukn</th>
                    <th className="py-2 pr-3">Profile</th>
                    <th className="py-2 pr-3">Connected page</th>
                    <th className="py-2">Canonical</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.ruknParity.length === 0 ? (
                    <tr>
                      <td className="py-2" colSpan={4}>
                        No canonical connections
                      </td>
                    </tr>
                  ) : (
                    snapshot.ruknParity.map((row) => (
                      <tr
                        key={row.ruknId}
                        className={row.diverge ? 'bg-rose-50' : 'border-b border-border/60'}
                      >
                        <td className="py-2 pr-3 font-mono text-xs">{row.ruknId}</td>
                        <td className="py-2 pr-3">{row.profileCount}</td>
                        <td className="py-2 pr-3">{row.connectedPageCount}</td>
                        <td className="py-2">{row.canonicalCount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-xl border border-border bg-surface p-4" aria-label="Single connection trace">
            <h2 className="text-lg font-semibold text-text-heading">D — Single Connection Trace</h2>
            <p className="mt-1 text-sm text-secondary">
              Selected connection ID:{' '}
              <span className="font-mono">{snapshot.selectedConnectionId ?? 'none'}</span>
            </p>
            {!snapshot.connectionTrace ? (
              <p className="mt-2 text-sm text-secondary">No connection available to trace.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-secondary">
                      <th className="py-2 pr-2">Layer</th>
                      <th className="py-2 pr-2">Document ID</th>
                      <th className="py-2 pr-2">Connection ID</th>
                      <th className="py-2 pr-2">Karkun ID</th>
                      <th className="py-2 pr-2">Rukn ID</th>
                      <th className="py-2 pr-2">Last Updated</th>
                      <th className="py-2">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.connectionTrace.map((layer) => (
                      <tr key={layer.layer} className="border-b border-border/60 align-top">
                        <td className="py-2 pr-2 font-medium">{layer.layer}</td>
                        <td className="py-2 pr-2 font-mono text-xs">{layer.documentId ?? '—'}</td>
                        <td className="py-2 pr-2 font-mono text-xs">{layer.connectionId ?? '—'}</td>
                        <td className="py-2 pr-2 font-mono text-xs">{layer.karkunId ?? '—'}</td>
                        <td className="py-2 pr-2 font-mono text-xs">{layer.ruknId ?? '—'}</td>
                        <td className="py-2 pr-2 font-mono text-xs">{layer.lastUpdated ?? '—'}</td>
                        <td className="py-2 text-xs">
                          {layer.source}
                          {layer.status ? ` · status/value=${layer.status}` : ''}
                          {layer.assignmentNumber ? ` · ASN=${layer.assignmentNumber}` : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-border bg-surface p-4" aria-label="Create refresh">
            <h2 className="text-lg font-semibold text-text-heading">
              Phase 2 — Create → Persist → Refresh
            </h2>
            <p className="mt-1 text-sm text-secondary">
              Manual protocol: mark timestamps around a single connection create elsewhere, save
              baseline, refresh the browser, reopen this page, compare.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                'Firestore write started',
                'Firestore write completed',
                'Repository updated',
                'assignmentStore updated',
                'Dashboard updated',
                'Profile updated',
                'Automation updated',
              ].map((label) => (
                <button
                  key={label}
                  type="button"
                  className="rounded-lg border border-border bg-surface-muted px-2 py-1 text-xs"
                  onClick={() => {
                    addRuntimeManualMark(label)
                    void refresh()
                  }}
                >
                  Mark: {label}
                </button>
              ))}
            </div>
            {snapshot.createRefresh.baseline ? (
              <div className="mt-3 text-sm">
                <p>
                  Baseline captured at{' '}
                  <span className="font-mono text-xs">{snapshot.createRefresh.baseline.capturedAt}</span>
                </p>
                {snapshot.createRefresh.baseline.manualMarks.length > 0 ? (
                  <ul className="mt-2 list-disc pl-5 text-xs">
                    {snapshot.createRefresh.baseline.manualMarks.map((m) => (
                      <li key={`${m.label}-${m.at}`}>
                        {m.at} — {m.label}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {snapshot.createRefresh.comparison ? (
                  <table className="mt-3 min-w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-secondary">
                        <th className="py-1 pr-3">Layer</th>
                        <th className="py-1 pr-3">Before</th>
                        <th className="py-1 pr-3">After</th>
                        <th className="py-1">Match</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.createRefresh.comparison.map((row) => (
                        <tr
                          key={row.layer}
                          className={row.match ? '' : 'bg-rose-50'}
                        >
                          <td className="py-1 pr-3">{row.layer}</td>
                          <td className="py-1 pr-3 font-mono">{String(row.before)}</td>
                          <td className="py-1 pr-3 font-mono">{String(row.after)}</td>
                          <td className="py-1">{row.match ? 'yes' : 'NO'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : null}
              </div>
            ) : (
              <p className="mt-2 text-sm text-secondary">No baseline saved in this session yet.</p>
            )}
          </section>

          <section className="rounded-xl border border-border bg-surface p-4" aria-label="Startup timeline">
            <h2 className="text-lg font-semibold text-text-heading">Phase 4 — Hydration Timeline</h2>
            <p className="mt-1 text-sm text-secondary">
              From existing KC-027G lifecycle tracer (observe only).
            </p>
            <ol className="mt-3 max-h-80 list-decimal space-y-1 overflow-y-auto pl-5 text-xs font-mono">
              {snapshot.startup.lifecycle.events.map((event) => (
                <li key={event.seq}>
                  t={event.t}ms (+{event.deltaMs}) {event.label}
                  {event.detail ? ` ${JSON.stringify(event.detail)}` : ''}
                </li>
              ))}
            </ol>
            {snapshot.startup.timingMarks.length > 0 ? (
              <>
                <h3 className="mt-4 text-sm font-semibold">KC-027A timing marks</h3>
                <ul className="mt-2 max-h-40 overflow-y-auto text-xs font-mono">
                  {snapshot.startup.timingMarks.map((mark, index) => (
                    <li key={`${mark.label}-${index}`}>
                      {new Date(mark.at).toISOString()} {mark.label}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        </>
      )}
    </div>
  )
}
