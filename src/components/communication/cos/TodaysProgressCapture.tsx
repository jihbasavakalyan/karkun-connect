/**
 * KC-0097 — Outcome Capture: Today's Progress for one Connected Karkun.
 * One screen of milestones · one Save · Matrix services update everything else.
 */

import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import {
  applyTodaysCampaignProgress,
  buildCampaignMatrixRows,
  readTodaysProgressDraft,
  type TodaysProgressDraft,
} from '@/lib/campaignExecutionMatrix'
import { confirmExecutionSaveFeedback } from '@/lib/executionPersistEvents'
import { subscribeToAnnexure1Store } from '@/stores/annexure1Store'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'
import { subscribeToIjtemaAttendanceStore } from '@/stores/ijtemaAttendanceStore'
import { usePeopleStore } from '@/hooks/usePeopleStore'

type TodaysProgressCaptureProps = {
  ruknId: string
  karkunId: string
  karkunName: string
}

type Celebration = {
  beforePct: number
  afterPct: number
  nextObjective: string
}

const MILESTONES: { key: keyof TodaysProgressDraft; label: string }[] = [
  { key: 'visitCompleted', label: 'First Visit Completed' },
  { key: 'jihExplained', label: 'JIH App Explained' },
  { key: 'jihRegistered', label: 'JIH App Registered' },
  { key: 'weeklyIjtemaAttended', label: 'Weekly Ijtema Attended' },
  { key: 'baitulMaalDiscussed', label: 'Baitul Maal Discussed' },
]

function emptyDraft(): TodaysProgressDraft {
  return {
    visitCompleted: false,
    jihExplained: false,
    jihRegistered: false,
    weeklyIjtemaAttended: false,
    baitulMaalDiscussed: false,
  }
}

export function TodaysProgressCapture({
  ruknId,
  karkunId,
  karkunName,
}: TodaysProgressCaptureProps) {
  const { user } = useAuth()
  const peopleVersion = usePeopleStore()
  const [tick, setTick] = useState(0)
  const [draft, setDraft] = useState<TodaysProgressDraft>(emptyDraft)
  const [baseline, setBaseline] = useState<TodaysProgressDraft>(emptyDraft)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [celebration, setCelebration] = useState<Celebration | null>(null)

  useEffect(() => {
    const a = subscribeToAnnexure1Store(() => setTick((v) => v + 1))
    const i = subscribeToIjtemaAttendanceStore(() => setTick((v) => v + 1))
    const b = subscribeToBaitulMaalStore(() => setTick((v) => v + 1))
    return () => {
      a()
      i()
      b()
    }
  }, [])

  const matrixRow = useMemo(() => {
    void tick
    void peopleVersion
    return buildCampaignMatrixRows(ruknId).find((r) => r.karkunId === karkunId) ?? null
  }, [ruknId, karkunId, tick, peopleVersion])

  useEffect(() => {
    if (!matrixRow) return
    const next = readTodaysProgressDraft(matrixRow)
    setBaseline(next)
    setDraft(next)
  }, [matrixRow])

  const dirty = MILESTONES.some(({ key }) => draft[key] !== baseline[key])

  function toggleMilestone(key: keyof TodaysProgressDraft) {
    if (baseline[key]) return // forward-only — already achieved stays locked
    setCelebration(null)
    setError(null)
    setDraft((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      // Light client-side inference for clearer UX before save
      if (next.jihRegistered) next.jihExplained = true
      if (
        next.jihExplained ||
        next.jihRegistered ||
        next.weeklyIjtemaAttended ||
        next.baitulMaalDiscussed
      ) {
        next.visitCompleted = true
      }
      return next
    })
  }

  async function handleSave() {
    if (!dirty || saving) return
    setSaving(true)
    setError(null)
    const result = applyTodaysCampaignProgress({
      karkunId,
      ruknId,
      draft,
      actorId: user?.uid,
    })
    if (!result.success) {
      setError(result.error)
      setSaving(false)
      return
    }
    setCelebration({
      beforePct: result.beforePct,
      afterPct: result.afterPct,
      nextObjective: result.nextObjective,
    })
    await confirmExecutionSaveFeedback(
      `Alhamdulillah! ${karkunName.split(' ').slice(-2).join(' ') || karkunName} progressed today.`,
    )
    setSaving(false)
  }

  if (!matrixRow) {
    return null
  }

  const firstName = karkunName.split(' ')[0] ?? karkunName

  return (
    <section
      className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5"
      aria-label="Today's progress"
    >
      <h2 className="text-sm font-semibold text-text-heading">Today&apos;s Progress</h2>
      <p className="mt-1 text-xs text-secondary">What changed today? One save updates everything.</p>

      <ul className="mt-4 space-y-1">
        {MILESTONES.map(({ key, label }) => {
          const locked = baseline[key]
          const checked = draft[key]
          return (
            <li key={key}>
              <label
                className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 py-2 ${
                  locked ? 'opacity-90' : 'hover:bg-surface-muted'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={locked || saving}
                  onChange={() => toggleMilestone(key)}
                  className="size-4 shrink-0 rounded border-border text-primary focus:ring-primary"
                />
                <span
                  className={`text-sm ${checked ? 'font-medium text-text-heading' : 'text-secondary'}`}
                >
                  {label}
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {celebration ? (
        <div
          className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3"
          role="status"
          aria-live="polite"
        >
          <p className="text-sm font-semibold text-emerald-900">Alhamdulillah!</p>
          <p className="mt-0.5 text-sm text-emerald-800">
            {firstName} progressed today.
          </p>
          <p className="mt-2 text-xs text-emerald-800">
            Campaign Progress{' '}
            <span className="font-semibold">
              {celebration.beforePct}% → {celebration.afterPct}%
            </span>
          </p>
          {celebration.nextObjective !== 'Campaign Complete' ? (
            <p className="mt-1 text-xs text-emerald-800">
              Next Suggested Outcome{' '}
              <span className="font-semibold">{celebration.nextObjective}</span>
            </p>
          ) : (
            <p className="mt-1 text-xs font-medium text-emerald-900">Campaign Complete</p>
          )}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={!dirty || saving}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save'}
      </button>
    </section>
  )
}
