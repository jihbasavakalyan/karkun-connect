/**
 * Development assessment checklist for Rukn (PART 13).
 *
 * Observable indicators only — does not advance journey stage automatically.
 * Monthly Bait-ul-Maal is one indicator informed by Compliance, not the sole criterion.
 */

import { useEffect, useState } from 'react'
import {
  getDevelopmentIndicatorsForDisplay,
  setDevelopmentAssessmentNotes,
  setDevelopmentIndicator,
} from '@/services/developmentAssessmentService'
import { subscribeToDevelopmentAssessmentStore } from '@/stores/developmentAssessmentStore'
import { subscribeToBaitulMaalStore } from '@/stores/baitulMaalStore'
import type { DevelopmentIndicatorId } from '@/types/developmentAssessment'

type DevelopmentAssessmentPanelProps = {
  karkunId: string
  ruknId: string
  onChange?: () => void
}

export function DevelopmentAssessmentPanel({
  karkunId,
  ruknId,
  onChange,
}: DevelopmentAssessmentPanelProps) {
  const [, setVersion] = useState(0)

  useEffect(() => {
    const unsubAssessment = subscribeToDevelopmentAssessmentStore(() =>
      setVersion((value) => value + 1),
    )
    const unsubBaitul = subscribeToBaitulMaalStore(() =>
      setVersion((value) => value + 1),
    )
    return () => {
      unsubAssessment()
      unsubBaitul()
    }
  }, [])

  void setVersion

  const { assessment, indicators, baitulMaalSuggested } =
    getDevelopmentIndicatorsForDisplay(karkunId, ruknId)

  const toggle = (id: DevelopmentIndicatorId, checked: boolean) => {
    setDevelopmentIndicator(karkunId, ruknId, id, checked)
    onChange?.()
  }

  return (
    <section className="ds-section" aria-label="Development assessment">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-secondary">
        Development Assessment
      </h2>
      <p className="mt-2 text-sm text-secondary">
        Holistic indicators of Islamic growth. Checking these does not change the journey stage.
        Monthly Bait-ul-Maal is one observable signal from Compliance — not the sole criterion.
      </p>

      <ul className="mt-4 space-y-2">
        {indicators.map((indicator) => {
          const checked = assessment.indicators[indicator.id]
          return (
            <li key={indicator.id}>
              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-border bg-surface-muted px-3 py-2.5">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  checked={checked}
                  onChange={(event) => toggle(indicator.id, event.target.checked)}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-text-heading">
                    {indicator.label}
                  </span>
                  {indicator.linkedToBaitulMaal ? (
                    <span className="mt-0.5 block text-xs text-secondary">
                      Compliance this month:{' '}
                      {baitulMaalSuggested ? 'Paid or Exempt' : 'Pending'}
                    </span>
                  ) : null}
                </span>
              </label>
            </li>
          )
        })}
      </ul>

      <label className="mt-4 block">
        <span className="text-xs font-semibold uppercase tracking-wide text-secondary">
          Assessment notes
        </span>
        <textarea
          className="mt-1.5 w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-heading focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          rows={3}
          defaultValue={assessment.notes ?? ''}
          placeholder="Optional notes on the Karkun’s growth…"
          onBlur={(event) => {
            setDevelopmentAssessmentNotes(karkunId, ruknId, event.target.value)
            onChange?.()
          }}
        />
      </label>
    </section>
  )
}
