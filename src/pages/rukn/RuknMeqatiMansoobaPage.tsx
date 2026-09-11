import { useMemo, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { ROUTES } from '@/constants/routes'
import { CardSkeleton, PageShell } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { useBackgroundHydration } from '@/hooks/useBackgroundHydration'
import { useJamaatReadModels } from '@/hooks/useJamaatReadModels'
import { unwrapRepository } from '@/repositories/errors'
import { getRepositories } from '@/repositories/provider'
import { selectCanonicalMeqatiMansooba } from '@/lib/planning/canonicalMeqatiMansooba'
import { ruknNameMapFromDirectory } from '@/lib/jamaat/ruknNameDirectory'
import {
  MeqatiPlanningWorkspace,
  type MeqatiNavView,
} from '@/pages/admin/meqati/MeqatiPlanningWorkspace'
import {
  buildShobahOverviewItems,
  isMappedActivity,
} from '@/pages/admin/meqati/meqatiPlanningPresentation'
import { MeqatiActivityReadOnlyDetail } from '@/components/rukn/MeqatiActivityReadOnlyDetail'
import type { LocalProgramme } from '@/types/localProgramme.types'

/**
 * Full read-only Meeqati Mansooba canvas for Rukn.
 * Persistence stays on Admin planning; this page does not call planning writers.
 */
export function RuknMeqatiMansoobaPage() {
  const { user } = useAuth()
  const ruknId = useRequiredRuknId()
  const backgroundReady = useBackgroundHydration()
  const { nameDirectory } = useJamaatReadModels()
  const [navView, setNavView] = useState<MeqatiNavView>({ level: 'overview' })
  const [inspecting, setInspecting] = useState<LocalProgramme | null>(null)

  const canvas = useMemo(() => {
    void backgroundReady
    const repos = getRepositories()
    const mansoobas = unwrapRepository(repos.meqatiMansooba.loadAll(), [])
    const mansooba = selectCanonicalMeqatiMansooba(mansoobas) ?? null
    const shobahs = unwrapRepository(repos.shobah.loadAll(), [])
      .filter((row) => mansooba && row.mansoobaId === mansooba.id && row.status !== 'archived')
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name))
    const objectives = unwrapRepository(repos.objective.loadAll(), []).filter(
      (row) => mansooba && row.mansoobaId === mansooba.id && row.status !== 'archived',
    )
    const programmes = unwrapRepository(repos.localProgramme.loadAll(), []).filter((row) => {
      if (row.status === 'archived') return false
      if (!mansooba) return false
      return row.mansoobaId === mansooba.id
    })
    const shobahItems = buildShobahOverviewItems(shobahs, objectives, programmes)
    const selectedShobahId = navView.level === 'overview' ? null : navView.shobahId
    const visibleObjectives = selectedShobahId
      ? objectives
          .filter((row) => row.shobahId === selectedShobahId)
          .slice()
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.title.localeCompare(b.title))
      : []
    const shobahActivities = selectedShobahId
      ? programmes.filter((row) => row.shobahId === selectedShobahId)
      : []
    const unmappedActivities = shobahActivities.filter((row) => !isMappedActivity(row))
    const totals = {
      shobahs: shobahItems.length,
      objectives: objectives.length,
      activities: programmes.length,
      mapped: programmes.filter(isMappedActivity).length,
      unmapped: programmes.filter((row) => !isMappedActivity(row)).length,
    }
    return {
      mansooba,
      shobahItems,
      visibleObjectives,
      shobahActivities,
      unmappedActivities,
      programmes,
      totals,
    }
  }, [backgroundReady, navView])

  const ruknNameById = useMemo(() => ruknNameMapFromDirectory(nameDirectory), [nameDirectory])

  if (!ruknId) {
    return <Navigate to={ROUTES.LOGIN} replace />
  }

  if (user?.role !== 'rukn') {
    return <Navigate to={ROUTES.RUKN} replace />
  }

  return (
    <PageShell className="app-screen">
      <header className="app-screen-header">
        <h1 className="app-screen-title" dir="rtl" lang="ur">
          میقاتی منصوبہ
        </h1>
        <p className="app-screen-subtitle">Meeqati Mansooba — Jamaat-wide plan (read only)</p>
      </header>
      {!backgroundReady ? (
        <CardSkeleton count={3} />
      ) : (
        <MeqatiPlanningWorkspace
          mansooba={canvas.mansooba}
          totals={canvas.totals}
          shobahItems={canvas.shobahItems}
          visibleObjectives={canvas.visibleObjectives}
          shobahActivities={canvas.shobahActivities}
          unmappedActivities={canvas.unmappedActivities}
          programmes={canvas.programmes}
          ruknNameById={ruknNameById}
          view={navView}
          onViewChange={setNavView}
          onOpenActivity={setInspecting}
          readOnly
        />
      )}
      <MeqatiActivityReadOnlyDetail
        activity={inspecting}
        responsibleName={
          inspecting?.responsibleRuknId
            ? (ruknNameById.get(inspecting.responsibleRuknId) ?? null)
            : null
        }
        onClose={() => setInspecting(null)}
      />
    </PageShell>
  )
}
