import { useEffect, useMemo, useRef } from 'react'
import {
  AdminCommandCenter,
  AdminMissionControlHero,
  AskDigitalRafeeqCard,
} from '@/components/mission-control'
import { openDigitalRafeeqAssistant } from '@/features/digitalRafeeq/launcher'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import {
  useRepositoryHydration,
  useRepositoryHydrationStatus,
} from '@/hooks/useRepositoryHydration'
import { buildAdminMissionControl } from '@/lib/missionControl/buildAdminMissionControl'
import { useAdminCommandCenter } from '@/providers/AdminCommandCenterProvider'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import {
  dashState01MetricsReceived,
  dashState05RefreshTrigger,
} from '@/lib/debug/kc00586DashboardStateProbe'
import { kc00584GetReport } from '@/lib/debug/kc00584PermissionProbe'

export function AdminHomePage() {
  const snapshot = useAdminCommandCenter()
  const isHydrated = useRepositoryHydration()
  const hydration = useRepositoryHydrationStatus()
  const { assignmentVersion } = useAssignmentEngine()
  const prevHydrated = useRef(isHydrated)
  const prevAssignmentVersion = useRef(assignmentVersion)

  // KC-0058.6 — detect hydration / assignment refresh triggers that remount metrics.
  useEffect(() => {
    if (prevHydrated.current !== isHydrated) {
      dashState05RefreshTrigger('AdminHomePage.isHydrated.change', {
        previous: prevHydrated.current,
        next: isHydrated,
        hydrationStatus: hydration.status,
      })
      prevHydrated.current = isHydrated
    }
  }, [isHydrated, hydration.status])

  useEffect(() => {
    if (prevAssignmentVersion.current !== assignmentVersion) {
      dashState05RefreshTrigger('AdminHomePage.assignmentVersion.bump', {
        previous: prevAssignmentVersion.current,
        next: assignmentVersion,
        isHydrated,
      })
      prevAssignmentVersion.current = assignmentVersion
    }
  }, [assignmentVersion, isHydrated])

  // KC-0058.1 — rebuild Mission Control from live MetricsService when stores hydrate.
  const model = useMemo(() => {
    const next = buildAdminMissionControl(snapshot)
    // KC-0058.6 — DASHSTATE-01 at the exact dashboard metrics receive point.
    dashState01MetricsReceived('AdminHomePage.buildAdminMissionControl')
    return next
  }, [snapshot, assignmentVersion, isHydrated])

  // KC-0069 — surface first critical-read failure details (UI only; no hydrate redesign).
  const probe = hydration.failed ? kc00584GetReport() : null
  const firstFailure = probe?.firstFailure ?? null
  const claimRole = probe?.authBeforeCritical?.claims.role ?? null

  // KC-0058.3 — never render fabricated 0/0/0% after critical hydrate failure.
  if (hydration.failed) {
    return (
      <div className="cd-page cd-page-admin mc-page mc-page-admin-compact mc-page-admin-command exdash-page">
        <section
          className="enterprise-glass rounded-xl p-6"
          role="alert"
          aria-live="assertive"
        >
          <h1 className="text-lg font-semibold text-text-heading">Unable to load campaign data</h1>
          <p className="mt-2 text-sm text-secondary">
            Campaign metrics cannot load until critical Firestore reads succeed. This panel does not
            change authentication or hydration — it only shows what failed.
          </p>
          {hydration.error ? (
            <p className="mt-2 text-xs text-secondary break-words">{hydration.error}</p>
          ) : null}
          {firstFailure ? (
            <dl className="mt-3 space-y-1 rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs text-secondary">
              <div>
                <dt className="inline font-medium text-text-heading">Collection: </dt>
                <dd className="inline">{firstFailure.collection}</dd>
              </div>
              <div>
                <dt className="inline font-medium text-text-heading">Operation: </dt>
                <dd className="inline">
                  {firstFailure.label} · {firstFailure.firestoreApi} · {firstFailure.method}
                </dd>
              </div>
              <div>
                <dt className="inline font-medium text-text-heading">Exception: </dt>
                <dd className="inline break-words">
                  {firstFailure.errorCode ?? 'unknown'}
                  {firstFailure.errorMessage ? ` — ${firstFailure.errorMessage}` : ''}
                </dd>
              </div>
              {claimRole == null ? (
                <div>
                  <dt className="inline font-medium text-text-heading">Auth note: </dt>
                  <dd className="inline">
                    JWT role claim was missing at first critical read (token race or unset claims).
                  </dd>
                </div>
              ) : null}
              <div>
                <dt className="inline font-medium text-text-heading">Retry guidance: </dt>
                <dd className="inline">
                  Click Retry to reload after the Auth token refreshes. If this persists after login,
                  confirm the account has a Firestore role claim, then try again.
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-3 text-xs text-secondary">
              Retry guidance: reload after login so the Auth token can attach. Persistent
              permission-denied usually means a missing JWT role claim — not a dashboard UI bug.
            </p>
          )}
          <div className="mt-4">
            <PrimaryButton type="button" onClick={hydration.retry}>
              Retry
            </PrimaryButton>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="cd-page cd-page-admin mc-page mc-page-admin-compact mc-page-admin-command exdash-page">
      <AdminMissionControlHero model={model} metricsReady={isHydrated} />
      <AdminCommandCenter model={model} snapshot={snapshot} metricsReady={isHydrated} />
      <AskDigitalRafeeqCard compact onOpen={openDigitalRafeeqAssistant} />
    </div>
  )
}
