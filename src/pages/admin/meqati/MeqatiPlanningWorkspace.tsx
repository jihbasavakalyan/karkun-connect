/**
 * Explicit Meqati navigation views (UI only):
 * OVERVIEW → SHOBAH → OBJECTIVE | UNMAPPED → Activity detail (parent modal).
 */

import type { ReactNode } from 'react'
import type { LocalProgramme } from '@/types/localProgramme.types'
import type { MeqatiMansooba, PlanningObjective, Shobah } from '@/types/planning.types'
import { MEQATI_PLAN_END_START_YEAR, MEQATI_PLAN_START_YEAR } from '@/lib/dashboard/meqatiYear'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import '@/pages/admin/meqati/meqatiPlanningCanvas.css'
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

type Totals = {
  shobahs: number
  objectives: number
  activities: number
  mapped: number
  unmapped: number
}

type MeqatiPlanningWorkspaceBase = {
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
  onOpenActivity: (row: LocalProgramme) => void
}

type MeqatiPlanningWorkspaceWriteProps = {
  readOnly?: false
  canCreateMansooba: boolean
  onCreateMansooba: () => void
  onEditMansooba: () => void
  onCreateShobah: () => void
  onEditShobah: (row: Shobah) => void
  onCreateObjective: () => void
  onEditObjective: (row: PlanningObjective) => void
  onCreateActivity: () => void
}

type MeqatiPlanningWorkspaceReadOnlyProps = {
  readOnly: true
}

export type MeqatiPlanningWorkspaceProps = MeqatiPlanningWorkspaceBase &
  (MeqatiPlanningWorkspaceWriteProps | MeqatiPlanningWorkspaceReadOnlyProps)

const PLAN_PERIOD_LABEL = `${MEQATI_PLAN_START_YEAR}–${String(MEQATI_PLAN_END_START_YEAR + 1).slice(-2)}`

function SectionLabel({ children }: { children: string }) {
  return <h3 className="text-sm font-semibold text-text-heading">{children}</h3>
}

const STAT_CARDS: { key: keyof Totals; label: string }[] = [
  { key: 'shobahs', label: 'شعبہ' },
  { key: 'objectives', label: 'اہداف' },
  { key: 'activities', label: 'سرگرمیاں' },
  { key: 'mapped', label: 'مربوط' },
  { key: 'unmapped', label: 'بغیر ہدف' },
]

/** Quiet status cell — Claude: typography hierarchy, no colour-filled icon boxes. */
function StatCard({ value, label }: { value: number; label: string }) {
  return (
    <div className="meqati-stat-card flex items-center gap-3 px-3 py-2">
      <span className="min-w-0">
        <span className="block text-2xl font-semibold tabular-nums text-text-heading">{value}</span>
        <span className="block text-sm text-secondary">{label}</span>
      </span>
    </div>
  )
}

function Canvas({ children }: { children: ReactNode }) {
  return (
    <div className="meqati-planning-canvas overflow-x-hidden" dir="rtl" lang="ur">
      {children}
    </div>
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

export function MeqatiPlanningWorkspace(props: MeqatiPlanningWorkspaceProps) {
  const {
    mansooba,
    totals,
    shobahItems,
    visibleObjectives,
    unmappedActivities,
    programmes,
    ruknNameById,
    view,
    onViewChange,
    onOpenActivity,
  } = props
  const readOnly = props.readOnly === true
  const canCreateMansooba = !readOnly && props.canCreateMansooba
  const onCreateMansooba = readOnly ? undefined : props.onCreateMansooba
  const onEditMansooba = readOnly ? undefined : props.onEditMansooba
  const onCreateShobah = readOnly ? undefined : props.onCreateShobah
  const onEditShobah = readOnly ? undefined : props.onEditShobah
  const onCreateObjective = readOnly ? undefined : props.onCreateObjective
  const onEditObjective = readOnly ? undefined : props.onEditObjective
  const onCreateActivity = readOnly ? undefined : props.onCreateActivity
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
      <Canvas>
        <div className="space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-secondary">میقاتی منصوبہ</p>
            <h2 className="mt-1 text-2xl font-semibold text-text-heading">
              {mansooba ? `${mansooba.name} ${PLAN_PERIOD_LABEL}` : 'میقاتی منصوبہ'}
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {canCreateMansooba && onCreateMansooba ? (
              <PrimaryButton type="button" onClick={onCreateMansooba}>
                نیا میقاتی منصوبہ
              </PrimaryButton>
            ) : null}
            {mansooba && onEditMansooba ? (
              <SecondaryButton type="button" onClick={onEditMansooba}>
                ترمیم
              </SecondaryButton>
            ) : null}
            {onCreateShobah ? (
              <PrimaryButton type="button" onClick={onCreateShobah} disabled={!mansooba}>
                نیا شعبہ
              </PrimaryButton>
            ) : null}
          </div>
        </header>

        {mansooba ? (
          <ul className="meqati-stat-grid grid grid-cols-2 gap-0">
            {STAT_CARDS.map((card) => (
              <li key={card.key}>
                <StatCard value={totals[card.key]} label={card.label} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-secondary">تنظیمی جڑ۔ صرف ایک منصوبہ۔</p>
        )}

        {!mansooba ? (
          <p className="text-sm text-secondary">ابھی میقاتی منصوبہ نہیں ہے۔ پہلا منصوبہ بنائیں۔</p>
        ) : shobahItems.length === 0 ? (
          <p className="text-sm text-secondary">
            اس منصوبہ میں ابھی کوئی شعبہ نہیں۔ غیر تصدیق شدہ ماخذ مواد شامل نہیں کیا گیا۔
          </p>
        ) : (
          <section className="space-y-3">
            <SectionLabel>شعبہ</SectionLabel>
            <ul className="meqati-head-grid grid grid-cols-1 gap-0">
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
      </Canvas>
    )
  }

  if (view.level === 'shobah' && selectedShobah && headCode) {
    return (
      <Canvas>
      <div className="space-y-8">
        <header>
          <BackBar label="تمام شعبہ" onClick={() => onViewChange({ level: 'overview' })} />
          <div className="meqati-dept-hero">
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold">
                {selectedShobah.shobah.name} ({headCode})
              </h2>
              <p className="meqati-dept-hero-meta mt-2 text-sm">
                {PLAN_PERIOD_LABEL} · {selectedShobah.objectiveCount} اہداف ·{' '}
                {selectedShobah.activityCount} سرگرمیاں
              </p>
              <p className="meqati-dept-hero-meta mt-1 text-sm">
                {selectedShobah.mappedCount} مربوط | {selectedShobah.unmappedCount} بغیر ہدف
                {selectedShobah.unmappedCount > 0
                  ? ` · توجہ: ${selectedShobah.unmappedCount}`
                  : null}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {onEditShobah && selectedShobah ? (
                <SecondaryButton type="button" onClick={() => onEditShobah(selectedShobah.shobah)}>
                  ترمیم
                </SecondaryButton>
              ) : null}
              {onCreateObjective ? (
                <PrimaryButton type="button" onClick={onCreateObjective}>
                  نئے اہداف
                </PrimaryButton>
              ) : null}
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
                  accent={visual?.accent ?? '#0f766e'}
                  onOpen={() =>
                    onViewChange({
                      level: 'objective',
                      shobahId: view.shobahId,
                      objectiveId: row.id,
                    })
                  }
                  onEdit={
                    onEditObjective
                      ? () => onEditObjective(row)
                      : undefined
                  }
                />
              )
            })}
          </ul>
          </section>
        )}

        <button
          type="button"
          className="flex min-h-14 w-full items-center justify-between gap-4 overflow-hidden border-b border-border bg-transparent px-1 py-4 text-start"
          onClick={() => onViewChange({ level: 'unmapped', shobahId: view.shobahId })}
        >
          <span className="flex min-w-0 items-stretch gap-3">
            <span className="block text-lg font-semibold text-text-heading">
              بغیر ہدف ({unmappedActivities.length} سرگرمیاں)
            </span>
          </span>
          <Chevron />
        </button>
      </div>
      </Canvas>
    )
  }

  if (view.level === 'objective') {
    const mappedCount = objectiveActivities.filter(isMappedActivity).length
    return (
      <Canvas>
      <div className="space-y-8">
        <header>
          <BackBar
            label={
              selectedShobah && headCode
                ? `${selectedShobah.shobah.name} (${headCode})`
                : 'شعبہ'
            }
            onClick={() => onViewChange({ level: 'shobah', shobahId: view.shobahId })}
          />
          <div className="meqati-objective-band">
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
              {onCreateActivity ? (
                <PrimaryButton type="button" onClick={onCreateActivity}>
                  نئی سرگرمی
                </PrimaryButton>
              ) : null}
            </div>
          </div>
        </header>

        <section className="space-y-3">
          <SectionLabel>سرگرمیاں</SectionLabel>
        {objectiveActivities.length === 0 ? (
          <p className="border-b border-border px-1 py-6 text-center text-sm text-secondary">
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
      </Canvas>
    )
  }

  return (
    <Canvas>
    <div className="space-y-8">
      <header>
        <BackBar
          label={selectedShobah ? selectedShobah.shobah.name : 'شعبہ'}
          onClick={() => onViewChange({ level: 'shobah', shobahId: view.shobahId })}
        />
        <div className="meqati-objective-band">
          <h2 className="text-2xl font-semibold text-text-heading">
            بغیر ہدف ({unmappedActivities.length} سرگرمیاں)
          </h2>
          <p className="mt-3 max-w-xl text-sm text-secondary">
            یہ سرگرمیاں اس شعبہ سے متعلق ہیں، لیکن فی الحال کسی ہدف سے منسلک نہیں۔ ہدف: غیر متعین · بغیر اہداف
          </p>
          {onCreateActivity ? (
            <div className="mt-4">
              <PrimaryButton type="button" onClick={onCreateActivity}>
                نئی سرگرمی
              </PrimaryButton>
            </div>
          ) : null}
        </div>
      </header>
      <CompactActivityList
        rows={unmappedActivities}
        ruknNameById={ruknNameById}
        onOpen={onOpenActivity}
        showUnmappedState
      />
    </div>
    </Canvas>
  )
}
