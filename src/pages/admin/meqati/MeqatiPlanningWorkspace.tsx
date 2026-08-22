/**
 * Explicit Meqati navigation views (UI only):
 * OVERVIEW → SHOBAH → OBJECTIVE | UNMAPPED → Activity detail (parent modal).
 */

import type { LocalProgramme } from '@/types/localProgramme.types'
import type { MeqatiMansooba, PlanningObjective, Shobah } from '@/types/planning.types'
import { MEQATI_PLAN_END_START_YEAR, MEQATI_PLAN_START_YEAR } from '@/lib/dashboard/meqatiYear'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { Icon } from '@/components/ui/Icon'
import {
  Chevron,
  CompactActivityList,
  ObjectiveNavBox,
  ShobahHeadCard,
  isMappedActivity,
  objectiveDisplayNumber,
  shobahHeadCode,
  shobahVisual,
  type ShobahOverviewItem,
} from '@/pages/admin/meqati/meqatiPlanningPresentation'

export type MeqatiNavView =
  | { level: 'overview' }
  | { level: 'shobah'; shobahId: string }
  | { level: 'objective'; shobahId: string; objectiveId: string }
  | { level: 'unmapped'; shobahId: string }

export function meqatiShobahId(view: MeqatiNavView): string | null {
  return view.level === 'overview' ? null : view.shobahId
}

export function meqatiObjectiveId(view: MeqatiNavView): string | null {
  return view.level === 'objective' ? view.objectiveId : null
}

type Totals = {
  shobahs: number
  objectives: number
  activities: number
  mapped: number
  unmapped: number
}

type MeqatiPlanningWorkspaceProps = {
  mansooba: MeqatiMansooba | null
  totals: Totals
  shobahItems: readonly ShobahOverviewItem[]
  visibleObjectives: readonly PlanningObjective[]
  shobahActivities: readonly LocalProgramme[]
  unmappedActivities: readonly LocalProgramme[]
  programmes: readonly LocalProgramme[]
  ruknNameById: ReadonlyMap<string, string>
  view: MeqatiNavView
  onViewChange: (view: MeqatiNavView) => void
  canCreateMansooba: boolean
  onCreateMansooba: () => void
  onEditMansooba: () => void
  onCreateShobah: () => void
  onEditShobah: (row: Shobah) => void
  onCreateObjective: () => void
  onEditObjective: (row: PlanningObjective) => void
  onCreateActivity: () => void
  onOpenActivity: (row: LocalProgramme) => void
}

const PLAN_PERIOD_LABEL = `${MEQATI_PLAN_START_YEAR}–${String(MEQATI_PLAN_END_START_YEAR + 1).slice(-2)}`

function SectionLabel({ children }: { children: string }) {
  return <h3 className="text-sm font-semibold text-text-heading">{children}</h3>
}

function StatChip({ value, label }: { value: number; label: string }) {
  return (
    <span className="inline-flex min-h-11 items-center rounded-full bg-surface px-3 py-1.5 text-sm text-text-heading shadow-card">
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="ms-1 text-secondary">{label}</span>
    </span>
  )
}

function BackBar({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="sticky top-0 z-20 -mx-1 mb-4 flex min-h-12 w-full items-center gap-2 bg-surface-muted/95 px-1 text-sm text-primary backdrop-blur-sm"
      onClick={onClick}
    >
      <span aria-hidden>→</span>
      {label}
    </button>
  )
}

export function MeqatiPlanningWorkspace({
  mansooba,
  totals,
  shobahItems,
  visibleObjectives,
  unmappedActivities,
  programmes,
  ruknNameById,
  view,
  onViewChange,
  canCreateMansooba,
  onCreateMansooba,
  onEditMansooba,
  onCreateShobah,
  onEditShobah,
  onCreateObjective,
  onEditObjective,
  onCreateActivity,
  onOpenActivity,
}: MeqatiPlanningWorkspaceProps) {
  const selectedShobah =
    view.level === 'overview'
      ? null
      : (shobahItems.find((item) => item.shobah.id === view.shobahId) ?? null)
  const selectedObjective =
    view.level === 'objective'
      ? (visibleObjectives.find((row) => row.id === view.objectiveId) ?? null)
      : null
  const objectiveActivities =
    view.level === 'objective'
      ? programmes
          .filter((row) => row.objectiveId === view.objectiveId)
          .slice()
          .sort((a, b) => a.name.localeCompare(b.name))
      : []
  const visual = selectedShobah ? shobahVisual(selectedShobah.shobah) : null
  const headCode = selectedShobah ? shobahHeadCode(selectedShobah.shobah) : null

  if (view.level === 'overview') {
    return (
      <div className="overflow-x-hidden space-y-6" dir="rtl" lang="ur">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-2xl font-semibold text-text-heading">
              {mansooba ? `${mansooba.name} ${PLAN_PERIOD_LABEL}` : 'میقاتی منصوبہ'}
            </h2>
            {mansooba ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <StatChip value={totals.shobahs} label="شعبہ" />
                <StatChip value={totals.objectives} label="اہداف" />
                <StatChip value={totals.activities} label="سرگرمیاں" />
                <StatChip value={totals.mapped} label="مربوط" />
                <StatChip value={totals.unmapped} label="بغیر ہدف" />
              </div>
            ) : (
              <p className="mt-3 text-sm text-secondary">تنظیمی جڑ۔ صرف ایک منصوبہ۔</p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {canCreateMansooba ? (
              <PrimaryButton type="button" onClick={onCreateMansooba}>
                نیا میقاتی منصوبہ
              </PrimaryButton>
            ) : null}
            {mansooba ? (
              <SecondaryButton type="button" onClick={onEditMansooba}>
                ترمیم
              </SecondaryButton>
            ) : null}
            <PrimaryButton type="button" onClick={onCreateShobah} disabled={!mansooba}>
              نیا شعبہ
            </PrimaryButton>
          </div>
        </header>

        {!mansooba ? (
          <p className="text-sm text-secondary">ابھی میقاتی منصوبہ نہیں ہے۔ پہلا منصوبہ بنائیں۔</p>
        ) : shobahItems.length === 0 ? (
          <p className="text-sm text-secondary">
            اس منصوبہ میں ابھی کوئی شعبہ نہیں۔ غیر تصدیق شدہ ماخذ مواد شامل نہیں کیا گیا۔
          </p>
        ) : (
          <section className="space-y-3">
            <SectionLabel>شعبہ</SectionLabel>
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {shobahItems.map((item) => (
                <li key={item.shobah.id}>
                  <ShobahHeadCard
                    item={item}
                    onOpen={(id) => onViewChange({ level: 'shobah', shobahId: id })}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    )
  }

  if (view.level === 'shobah' && selectedShobah && visual && headCode) {
    return (
      <div className="overflow-x-hidden space-y-8" dir="rtl" lang="ur">
        <header>
          <BackBar label="تمام شعبہ" onClick={() => onViewChange({ level: 'overview' })} />
          <div
            className="flex flex-wrap items-start justify-between gap-3 rounded-2xl px-5 py-4"
            style={{ backgroundColor: visual.wash }}
          >
            <div className="min-w-0">
              <h2 className="flex items-center gap-2 text-2xl font-semibold text-text-heading">
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-surface"
                  style={{ color: visual.accent }}
                >
                  <Icon name={visual.icon} size="md" />
                </span>
                {selectedShobah.shobah.name} ({headCode})
              </h2>
              <p className="mt-2 text-sm text-secondary">
                {selectedShobah.objectiveCount} اہداف · {selectedShobah.activityCount} سرگرمیاں
              </p>
              <p className="mt-1 text-sm text-secondary">
                {selectedShobah.mappedCount} مربوط | {selectedShobah.unmappedCount} بغیر ہدف
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <SecondaryButton type="button" onClick={() => onEditShobah(selectedShobah.shobah)}>
                ترمیم
              </SecondaryButton>
              <PrimaryButton type="button" onClick={onCreateObjective}>
                نئے اہداف
              </PrimaryButton>
            </div>
          </div>
        </header>

        {visibleObjectives.length === 0 ? (
          <p className="text-sm text-secondary">اس شعبہ میں ابھی کوئی اہداف نہیں۔</p>
        ) : (
          <section className="space-y-3">
            <SectionLabel>اہداف</SectionLabel>
          <ul className="space-y-2">
            {visibleObjectives.map((row, index) => {
              const count = programmes.filter((item) => item.objectiveId === row.id).length
              return (
                <ObjectiveNavBox
                  key={row.id}
                  index={index}
                  objective={row}
                  activityCount={count}
                  mappedCount={count}
                  unmappedCount={0}
                  accent={visual.accent}
                  onOpen={() =>
                    onViewChange({
                      level: 'objective',
                      shobahId: view.shobahId,
                      objectiveId: row.id,
                    })
                  }
                  onEdit={() => onEditObjective(row)}
                />
              )
            })}
          </ul>
          </section>
        )}

        <button
          type="button"
          className="flex min-h-14 w-full items-center justify-between gap-4 overflow-hidden rounded-2xl bg-surface px-5 py-4 text-start shadow-card"
          onClick={() => onViewChange({ level: 'unmapped', shobahId: view.shobahId })}
        >
          <span className="flex min-w-0 items-stretch gap-3">
            <span className="w-1 shrink-0 rounded-full" style={{ backgroundColor: visual.accent }} />
            <span className="block text-lg font-semibold text-text-heading">
              بغیر ہدف ({unmappedActivities.length} سرگرمیاں)
            </span>
          </span>
          <Chevron />
        </button>
      </div>
    )
  }

  if (view.level === 'objective') {
    const mappedCount = objectiveActivities.filter(isMappedActivity).length
    return (
      <div className="overflow-x-hidden space-y-8" dir="rtl" lang="ur">
        <header>
          <BackBar
            label={
              selectedShobah && headCode
                ? `${selectedShobah.shobah.name} (${headCode})`
                : 'شعبہ'
            }
            onClick={() => onViewChange({ level: 'shobah', shobahId: view.shobahId })}
          />
          <div
            className="rounded-2xl px-5 py-4"
            style={visual ? { backgroundColor: visual.wash } : undefined}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-secondary">
                  ہدف {selectedObjective ? objectiveDisplayNumber(selectedObjective, 0) : ''}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-text-heading whitespace-normal break-words">
                  {selectedObjective?.title ?? 'اہداف'}
                </h2>
                <p className="mt-2 text-sm text-secondary">
                  {objectiveActivities.length} سرگرمی | {mappedCount} مربوط |{' '}
                  {objectiveActivities.length - mappedCount} بغیر ہدف
                </p>
              </div>
              <PrimaryButton type="button" onClick={onCreateActivity}>
                نئی سرگرمی
              </PrimaryButton>
            </div>
          </div>
        </header>

        <section className="space-y-3">
          <SectionLabel>سرگرمیاں</SectionLabel>
        {objectiveActivities.length === 0 ? (
          <p className="rounded-2xl bg-surface px-5 py-6 text-center text-sm text-secondary shadow-card">
            اس ہدف کے لیے ابھی کوئی سرگرمی درج نہیں
          </p>
        ) : (
          <CompactActivityList
            rows={objectiveActivities}
            ruknNameById={ruknNameById}
            onOpen={onOpenActivity}
          />
        )}
        </section>
      </div>
    )
  }

  return (
    <div className="overflow-x-hidden space-y-8" dir="rtl" lang="ur">
      <header>
        <BackBar
          label={selectedShobah ? selectedShobah.shobah.name : 'شعبہ'}
          onClick={() => onViewChange({ level: 'shobah', shobahId: view.shobahId })}
        />
        <div
          className="rounded-2xl px-5 py-5"
          style={visual ? { backgroundColor: visual.wash } : undefined}
        >
          <h2 className="text-2xl font-semibold text-text-heading">
            بغیر ہدف ({unmappedActivities.length} سرگرمیاں)
          </h2>
          <p className="mt-3 max-w-xl text-sm text-secondary">
            یہ سرگرمیاں اس شعبہ سے متعلق ہیں، لیکن فی الحال کسی ہدف سے منسلک نہیں۔ ہدف: غیر متعین · بغیر اہداف
          </p>
          <div className="mt-4">
            <PrimaryButton type="button" onClick={onCreateActivity}>
              نئی سرگرمی
            </PrimaryButton>
          </div>
        </div>
      </header>
      <CompactActivityList
        rows={unmappedActivities}
        ruknNameById={ruknNameById}
        onOpen={onOpenActivity}
        showUnmappedState
      />
    </div>
  )
}
