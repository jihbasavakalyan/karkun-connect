import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { WidgetErrorBoundary } from '@/components/mission-control/WidgetErrorBoundary'
import { RuknFloatingActionButton } from '@/components/home'
import { TarbiyatiIjtemaRuknHero } from '@/components/home/TarbiyatiIjtemaRuknHero'
import { ExecutionSuccessBanner } from '@/components/execution/ExecutionSuccessBanner'
import { WeeklyIjtemaAttendanceOpenCard } from '@/components/execution/WeeklyIjtemaAttendanceOpenCard'
import { RuknHomeKarkunActions } from '@/components/rukn/RuknHomeKarkunActions'
import { RuknHomeBaitulMaalCard } from '@/components/rukn/RuknHomeBaitulMaalCard'
import { RuknMeqatiActivitiesPanel } from '@/components/rukn/RuknMeqatiActivitiesPanel'
import { RuknResponsibilitiesHomePanel } from '@/components/rukn/RuknResponsibilitiesHomePanel'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { useGuidance } from '@/hooks/useGuidance'
import { useBackgroundHydration } from '@/hooks/useBackgroundHydration'
import { useRepositoryHydration } from '@/hooks/useRepositoryHydration'
import { getKarkunById } from '@/constants/mockKarkunRegistry'
import { getRuknById } from '@/data/ruknMaster'
import { buildTelLink, buildWhatsAppLink } from '@/utils/personContactLinks'
import { sortGuidanceByUrgency } from '@/lib/homePresentation'
import { getGuidanceForRuknKarkuns } from '@/lib/guidance/guidanceEngine'
import { CardSkeleton } from '@/components/ui'

/**
 * Increment 03 — Rukn / A Rukn Home.
 * Tarbiyati Ijtema registration hero is protected and unchanged.
 */
export function RuknHomePage() {
  const ruknId = useRequiredRuknId()
  const isHydrated = useRepositoryHydration()
  const backgroundReady = useBackgroundHydration()
  const { morningBrief } = useGuidance(ruknId ?? '')

  if (!ruknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  const topGuidance = isHydrated
    ? sortGuidanceByUrgency(getGuidanceForRuknKarkuns(ruknId))[0]
    : undefined
  const topKarkun = topGuidance ? getKarkunById(topGuidance.karkunId) : undefined
  const primaryCallHref = topKarkun?.mobile ? buildTelLink(topKarkun.mobile) ?? undefined : undefined
  const primaryWhatsAppHref =
    topKarkun?.mobile || topKarkun?.whatsapp
      ? buildWhatsAppLink(topKarkun.whatsapp?.trim() ? topKarkun.whatsapp : topKarkun.mobile) ??
        undefined
      : undefined
  const ruknName = isHydrated ? (getRuknById(ruknId)?.name ?? '') : ''

  if (!isHydrated) {
    return (
      <div className="cd-page cd-page-rukn rukn-home-page">
        <ExecutionSuccessBanner />
        <CardSkeleton count={4} />
      </div>
    )
  }

  return (
    <div className="cd-page cd-page-rukn rukn-home-page">
      <ExecutionSuccessBanner />

      <p className="rukn-home-greeting urdu-text" dir="rtl" lang="ur">
        {morningBrief?.greeting ?? 'السلام علیکم'}
        {ruknName ? <span className="rukn-home-greeting-name">{ruknName}</span> : null}
      </p>

      <WidgetErrorBoundary title="Tarbiyati Ijtema registration">
        {backgroundReady ? <TarbiyatiIjtemaRuknHero /> : <CardSkeleton count={1} />}
      </WidgetErrorBoundary>

      <div className="rukn-home-stack">
        <WidgetErrorBoundary title="Karkun">
          <RuknHomeKarkunActions ruknId={ruknId} />
        </WidgetErrorBoundary>

        <WidgetErrorBoundary title="Weekly Ijtema">
          {backgroundReady ? (
            <WeeklyIjtemaAttendanceOpenCard ruknId={ruknId} />
          ) : (
            <CardSkeleton count={1} />
          )}
        </WidgetErrorBoundary>

        <WidgetErrorBoundary title="Baitul-Maal">
          {backgroundReady ? (
            <RuknHomeBaitulMaalCard ruknId={ruknId} />
          ) : (
            <CardSkeleton count={1} />
          )}
        </WidgetErrorBoundary>

        <WidgetErrorBoundary title="Meeqati Mansooba">
          {backgroundReady ? (
            <RuknMeqatiActivitiesPanel ruknId={ruknId} />
          ) : (
            <CardSkeleton count={1} />
          )}
        </WidgetErrorBoundary>

        <WidgetErrorBoundary title="Rukn Responsibilities">
          {backgroundReady ? (
            <RuknResponsibilitiesHomePanel ruknId={ruknId} />
          ) : (
            <CardSkeleton count={1} />
          )}
        </WidgetErrorBoundary>
      </div>

      <RuknFloatingActionButton
        nextAction={{
          title: '',
          description: '',
          route: ROUTES.RUKN,
          actionLabel: '',
          isCaughtUp: true,
        }}
        primaryCallHref={primaryCallHref}
        primaryWhatsAppHref={primaryWhatsAppHref}
      />
    </div>
  )
}
