import { useMemo } from 'react'
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

export function AdminHomePage() {
  const snapshot = useAdminCommandCenter()
  const isHydrated = useRepositoryHydration()
  const hydration = useRepositoryHydrationStatus()
  const { assignmentVersion } = useAssignmentEngine()
  // KC-0058.1 — rebuild Mission Control from live MetricsService when stores hydrate.
  const model = useMemo(
    () => buildAdminMissionControl(snapshot),
    [snapshot, assignmentVersion, isHydrated],
  )

  // KC-0058.3 — never render fabricated 0/0/0% after critical hydrate failure.
  if (hydration.failed) {
    return (
      <div className="cd-page cd-page-admin mc-page mc-page-admin-compact mc-page-admin-command">
        <section
          className="enterprise-glass rounded-xl p-6"
          role="alert"
          aria-live="assertive"
        >
          <h1 className="text-lg font-semibold text-text-heading">Unable to load campaign data</h1>
          <p className="mt-2 text-sm text-secondary">
            Critical data hydration failed. Campaign metrics are not available until data loads
            successfully.
          </p>
          {hydration.error ? (
            <p className="mt-2 text-xs text-secondary break-words">{hydration.error}</p>
          ) : null}
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
    <div className="cd-page cd-page-admin mc-page mc-page-admin-compact mc-page-admin-command">
      <AdminMissionControlHero model={model} metricsReady={isHydrated} />
      <AdminCommandCenter model={model} snapshot={snapshot} />
      <AskDigitalRafeeqCard compact onOpen={openDigitalRafeeqAssistant} />
    </div>
  )
}
