/**
 * KC-0080 — Per-Karkun execution workspace on Rukn Home.
 * Daily Progress + Weekly Ijtema one-tap update/edit.
 */

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { DailyProgressUpdateModal } from '@/components/execution/DailyProgressUpdateModal'
import { WeeklyIjtemaAttendanceModal } from '@/components/execution/WeeklyIjtemaAttendanceModal'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { ruknVisitPath } from '@/constants/routes'
import { useAssignmentEngine } from '@/hooks/useAssignmentEngine'
import { getDailyProgressView } from '@/lib/dailyProgressPresentation'
import { getRuknJourneyStageLabel } from '@/lib/ruknProgressPresentation'
import { resolveCurrentJourneyStage } from '@/lib/guidance/journeyEngine'
import { getCurrentIjtemaAttendance } from '@/services/ijtemaAttendanceService'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { getActiveAssignmentsForKarkun } from '@/stores/assignmentStore'
import type { KarkunRegistryRecord } from '@/types/karkun-registry.types'

type RuknExecutionWorkspaceProps = {
  ruknId: string
}

function StageLabel({ karkun }: { karkun: KarkunRegistryRecord }) {
  const assignmentId = getActiveAssignmentsForKarkun(karkun.id)[0]?.assignmentId
  const { currentStage } = resolveCurrentJourneyStage(karkun, assignmentId)
  return <>{getRuknJourneyStageLabel(currentStage)}</>
}

function KarkunExecutionRow({
  karkun,
  onProgress,
  onIjtema,
}: {
  karkun: KarkunRegistryRecord
  onProgress: () => void
  onIjtema: () => void
}) {
  const progress = getDailyProgressView(karkun.id)
  const ijtema = getCurrentIjtemaAttendance(karkun.id)

  return (
    <article className="rounded-lg border border-border bg-surface px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link
            to={ruknVisitPath(karkun.id)}
            className="text-base font-semibold text-primary hover:underline"
          >
            {karkun.name}
          </Link>
          <p className="mt-0.5 text-xs text-secondary">
            Current Stage · <StageLabel karkun={karkun} />
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border/80 bg-surface-muted/60 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-secondary">
            Today&apos;s Progress
          </p>
          <p className="mt-1 text-sm font-medium text-text-heading">{progress.statusLabel}</p>
          {progress.updatedAtLabel ? (
            <p className="text-xs text-secondary">{progress.updatedAtLabel}</p>
          ) : null}
          <div className="mt-2">
            {progress.hasTodayProgress ? (
              <SecondaryButton type="button" className="px-3 py-1.5 text-sm" onClick={onProgress}>
                Edit Progress
              </SecondaryButton>
            ) : (
              <PrimaryButton type="button" className="px-3 py-1.5 text-sm" onClick={onProgress}>
                Update Progress
              </PrimaryButton>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-border/80 bg-surface-muted/60 px-3 py-2">
          <p className="text-xs font-medium uppercase tracking-wide text-secondary">
            Weekly Ijtema
          </p>
          <p className="mt-1 text-sm font-medium text-text-heading">
            {ijtema.status === 'Not recorded' ? 'Pending' : ijtema.status}
          </p>
          {ijtema.remarks ? (
            <p className="text-xs text-secondary">{ijtema.remarks}</p>
          ) : null}
          <div className="mt-2">
            {ijtema.status === 'Not recorded' ? (
              <PrimaryButton type="button" className="px-3 py-1.5 text-sm" onClick={onIjtema}>
                Record Attendance
              </PrimaryButton>
            ) : (
              <SecondaryButton type="button" className="px-3 py-1.5 text-sm" onClick={onIjtema}>
                Edit
              </SecondaryButton>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}

export function RuknExecutionWorkspace({ ruknId }: RuknExecutionWorkspaceProps) {
  const { assignmentVersion, getAssignedKarkunanForRukn } = useAssignmentEngine()
  const [storeTick, setStoreTick] = useState(0)
  const [progressKarkun, setProgressKarkun] = useState<KarkunRegistryRecord | null>(null)
  const [ijtemaKarkun, setIjtemaKarkun] = useState<KarkunRegistryRecord | null>(null)

  useEffect(() => {
    const unsubA = subscribeToAnnexure1Store(() => setStoreTick((v) => v + 1))
    const unsubI = subscribeToIjtemaAttendanceStore(() => setStoreTick((v) => v + 1))
    return () => {
      unsubA()
      unsubI()
    }
  }, [])

  const connected = useMemo(
    () => getAssignedKarkunanForRukn(ruknId),
    [ruknId, assignmentVersion, getAssignedKarkunanForRukn, storeTick],
  )

  if (connected.length === 0) {
    return null
  }

  return (
    <section className="space-y-3" aria-label="Execution workspace">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-text-heading">My Karkuns</h2>
        <p className="text-xs text-secondary">{connected.length} assigned</p>
      </div>

      <ul className="space-y-3">
        {connected.map((karkun) => (
          <li key={karkun.id}>
            <KarkunExecutionRow
              karkun={karkun}
              onProgress={() => setProgressKarkun(karkun)}
              onIjtema={() => setIjtemaKarkun(karkun)}
            />
          </li>
        ))}
      </ul>

      {progressKarkun ? (
        <DailyProgressUpdateModal
          key={`progress-${progressKarkun.id}`}
          isOpen
          karkunId={progressKarkun.id}
          karkunName={progressKarkun.name}
          ruknId={ruknId}
          onClose={() => setProgressKarkun(null)}
          onSaved={() => setStoreTick((v) => v + 1)}
        />
      ) : null}

      {ijtemaKarkun ? (
        <WeeklyIjtemaAttendanceModal
          key={`ijtema-${ijtemaKarkun.id}`}
          isOpen
          karkunId={ijtemaKarkun.id}
          karkunName={ijtemaKarkun.name}
          ruknId={ruknId}
          onClose={() => setIjtemaKarkun(null)}
          onSaved={() => setStoreTick((v) => v + 1)}
        />
      ) : null}
    </section>
  )
}
