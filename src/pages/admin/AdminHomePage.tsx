import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AdminCommandCenter,
  AdminMissionControlHero,
  AskDigitalRafeeqCard,
} from '@/components/mission-control'
import { WidgetErrorBoundary } from '@/components/mission-control/WidgetErrorBoundary'
import { openDigitalRafeeqAssistant } from '@/features/digitalRafeeq/launcher'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { useAuth } from '@/hooks/useAuth'
import { usePeopleStore } from '@/hooks/usePeopleStore'
import {
  useRepositoryHydration,
  useRepositoryHydrationStatus,
} from '@/hooks/useRepositoryHydration'
import { buildAdminMissionControl } from '@/lib/missionControl/buildAdminMissionControl'
import { useMeqatiYearSelection } from '@/lib/dashboard/meqatiYear'
import { buildOrganisationalSituation } from '@/lib/dashboard/organisationalSituation'
import { createCoalescedNotifier } from '@/lib/dashboard/coalesceStoreNotifications'
import { useAdminCommandCenter } from '@/providers/AdminCommandCenterProvider'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import {
  dashState01MetricsReceived,
  dashState05RefreshTrigger,
} from '@/lib/debug/kc00586DashboardStateProbe'
import { kc00584GetReport } from '@/lib/debug/kc00584PermissionProbe'
import { markStartupLifecycle } from '@/lib/startupLifecycleTrace'
import { logStartupTiming } from '@/lib/startupDiagnostics'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToJihWebPortalStore } from '@/stores/jihWebPortalStore'
import { subscribeToWeeklyIjtemaStore } from '@/stores/weeklyIjtemaStore'
import { subscribeToMonthlyBaitulMaalStore } from '@/stores/monthlyBaitulMaalStore'
import { subscribeToFollowUpStore } from '@/stores/followUpStore'

const PAGE_CLASS =
  'cd-page cd-page-admin mc-page mc-page-admin-compact mc-page-admin-command exdash-page orgdash-page'

export function AdminHomePage() {
  const snapshot = useAdminCommandCenter()
  const isHydrated = useRepositoryHydration()
  const hydration = useRepositoryHydrationStatus()
  const { isInitializing } = useAuth()
  const { assignmentVersion } = useAssignmentEngine()
  const peopleVersion = usePeopleStore()
  const yearSelection = useMeqatiYearSelection()
  const [moduleTick, setModuleTick] = useState(0)
  const prevHydrated = useRef(isHydrated)
  const prevAssignmentVersion = useRef(assignmentVersion)
  const dashboardRenderedLogged = useRef(false)

  useEffect(() => {
    const coalesced = createCoalescedNotifier(() => {
      setModuleTick((v) => v + 1)
    })
    const unsubs = [
      subscribeToWeeklyIjtemaStore(coalesced.bump),
      subscribeToMonthlyBaitulMaalStore(coalesced.bump),
      subscribeToAnnexure1Store(coalesced.bump),
      subscribeToJihWebPortalStore(coalesced.bump),
      subscribeToFollowUpStore(coalesced.bump),
    ]
    return () => {
      coalesced.dispose()
      for (const unsub of unsubs) unsub()
    }
  }, [])

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

  const model = useMemo(() => {
    const next = buildAdminMissionControl(snapshot)
    dashState01MetricsReceived('AdminHomePage.buildAdminMissionControl')
    return next
  }, [snapshot, assignmentVersion, isHydrated])

  const situation = useMemo(() => {
    void peopleVersion
    void assignmentVersion
    void moduleTick
    void isHydrated
    return buildOrganisationalSituation(yearSelection.year)
  }, [peopleVersion, assignmentVersion, moduleTick, isHydrated, yearSelection.year])

  useEffect(() => {
    if (!isHydrated || dashboardRenderedLogged.current) return
    dashboardRenderedLogged.current = true
    markStartupLifecycle('dashboard.rendered', { role: 'administrator' })
    logStartupTiming('dashboard.rendered', { role: 'administrator' })
  }, [isHydrated])

  const probe = hydration.failed ? kc00584GetReport() : null
  const firstFailure = probe?.firstFailure ?? null
  const claimRole = probe?.authBeforeCritical?.claims.role ?? null
  const permissionDeniedWhileAuthInitializing =
    hydration.failed &&
    isInitializing &&
    (firstFailure?.errorCode === 'permission-denied' ||
      /permission-denied|insufficient permissions/i.test(hydration.error ?? ''))

  if (permissionDeniedWhileAuthInitializing) {
    return (
      <div className={PAGE_CLASS}>
        <WidgetErrorBoundary title="Organisational Hero">
          <AdminMissionControlHero
            situation={situation}
            yearSelection={yearSelection}
            metricsReady={false}
          />
        </WidgetErrorBoundary>
        <WidgetErrorBoundary title="Organisational Dashboard">
          <AdminCommandCenter
            model={model}
            snapshot={snapshot}
            situation={situation}
            metricsReady={false}
          />
        </WidgetErrorBoundary>
        <div className="orgdash-rafeeq">
          <AskDigitalRafeeqCard compact onOpen={openDigitalRafeeqAssistant} />
        </div>
      </div>
    )
  }

  if (hydration.failed) {
    return (
      <div className={PAGE_CLASS}>
        <section
          className="enterprise-glass rounded-xl p-6"
          role="alert"
          aria-live="assertive"
        >
          <h1 className="text-lg font-semibold text-text-heading">
            Unable to load organisational data
          </h1>
          <p className="mt-2 text-sm text-secondary">
            Dashboard metrics cannot load until critical Firestore reads succeed. This panel does not
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
    <div className={PAGE_CLASS}>
      <WidgetErrorBoundary title="Organisational Hero">
        <AdminMissionControlHero
          situation={situation}
          yearSelection={yearSelection}
          metricsReady={isHydrated}
        />
      </WidgetErrorBoundary>
      <WidgetErrorBoundary title="Organisational Dashboard">
        <AdminCommandCenter
          model={model}
          snapshot={snapshot}
          situation={situation}
          metricsReady={isHydrated}
        />
      </WidgetErrorBoundary>
      <WidgetErrorBoundary title="Ask Digital Rafeeq" compact>
        <div className="orgdash-rafeeq">
          <AskDigitalRafeeqCard compact onOpen={openDigitalRafeeqAssistant} />
        </div>
      </WidgetErrorBoundary>
    </div>
  )
}
