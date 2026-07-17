/**
 * Collaborative planning conversation after connecting a Karkun (KC-009).
 * Companion tone — never supervisory; Rukn retains ownership.
 */

import { useMemo, useState } from 'react'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { FORM_INPUT_CLASS } from '@/components/ui/formStyles'
import { approveExecutionPlan, buildPlanSummaryUrdu } from '@/services/executionPlanService'
import type {
  PlanContactChannel,
  PlanContactWhen,
  PlanPreferredTime,
} from '@/types/executionPlan.types'
import {
  CHANNEL_OPTIONS,
  PLANNING_CLOSING_MESSAGE,
  TIME_OPTIONS,
  WHEN_OPTIONS,
  askChannel,
  askVisitTime,
  askWhen,
  planningIntro,
  presentSuggestedPlan,
} from './planningCopy'

type Step = 'intro' | 'when' | 'channel' | 'time' | 'review' | 'done'

type PlanningConversationModalProps = {
  isOpen: boolean
  karkunId: string
  karkunName: string
  ruknId: string
  assignmentId?: string
  onClose: () => void
  onApproved?: () => void
}

export function PlanningConversationModal({
  isOpen,
  karkunId,
  karkunName,
  ruknId,
  assignmentId,
  onClose,
  onApproved,
}: PlanningConversationModalProps) {
  const [step, setStep] = useState<Step>('intro')
  const [when, setWhen] = useState<PlanContactWhen | null>(null)
  const [customDate, setCustomDate] = useState('')
  const [channel, setChannel] = useState<PlanContactChannel | null>(null)
  const [preferredTime, setPreferredTime] = useState<PlanPreferredTime | null>(null)
  const [customTime, setCustomTime] = useState('')

  const draft = useMemo(() => {
    if (!when || !channel) return null
    return {
      karkunId,
      karkunName,
      ruknId,
      assignmentId,
      firstContactWhen: when,
      firstContactDate: when === 'custom' ? customDate || undefined : undefined,
      channel,
      preferredTime: channel === 'visit' ? preferredTime ?? undefined : undefined,
      customTime:
        channel === 'visit' && preferredTime === 'custom' ? customTime || undefined : undefined,
    }
  }, [
    when,
    channel,
    preferredTime,
    customDate,
    customTime,
    karkunId,
    karkunName,
    ruknId,
    assignmentId,
  ])

  const summary = draft ? buildPlanSummaryUrdu(draft) : ''

  if (!isOpen) return null

  const resetAndClose = () => {
    setStep('intro')
    setWhen(null)
    setCustomDate('')
    setChannel(null)
    setPreferredTime(null)
    setCustomTime('')
    onClose()
  }

  const handleApprove = () => {
    if (!draft) return
    approveExecutionPlan(draft)
    setStep('done')
    onApproved?.()
  }

  const handleModify = () => {
    setStep('when')
    setChannel(null)
    setPreferredTime(null)
  }

  return (
    <div className="dr-plan-overlay" role="presentation" onClick={resetAndClose}>
      <aside
        className="dr-plan-sheet urdu-text"
        role="dialog"
        aria-modal="true"
        aria-label="لائحۂ عمل"
        dir="rtl"
        lang="ur"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dr-plan-header">
          <p className="dr-plan-eyebrow">ڈیجیٹل رفیق</p>
          <h2 className="dr-plan-title">لائحۂ عمل</h2>
          <button type="button" className="dr-plan-close" onClick={resetAndClose} aria-label="بند کریں">
            ×
          </button>
        </header>

        <div className="dr-plan-body">
          {step === 'intro' ? (
            <>
              <p className="dr-plan-message">{planningIntro(karkunName)}</p>
              <PrimaryButton type="button" className="dr-plan-primary" onClick={() => setStep('when')}>
                شروع کریں
              </PrimaryButton>
            </>
          ) : null}

          {step === 'when' ? (
            <>
              <p className="dr-plan-message">{askWhen(karkunName)}</p>
              <div className="dr-plan-options">
                {WHEN_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`dr-plan-chip ${when === option.id ? 'dr-plan-chip-active' : ''}`}
                    onClick={() => {
                      setWhen(option.id)
                      if (option.id !== 'custom') setStep('channel')
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {when === 'custom' ? (
                <div className="dr-plan-custom">
                  <input
                    type="date"
                    className={FORM_INPUT_CLASS}
                    value={customDate}
                    onChange={(event) => setCustomDate(event.target.value)}
                  />
                  <PrimaryButton
                    type="button"
                    disabled={!customDate}
                    onClick={() => setStep('channel')}
                  >
                    آگے
                  </PrimaryButton>
                </div>
              ) : null}
            </>
          ) : null}

          {step === 'channel' ? (
            <>
              <p className="dr-plan-message">{askChannel(karkunName)}</p>
              <div className="dr-plan-options">
                {CHANNEL_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`dr-plan-chip ${channel === option.id ? 'dr-plan-chip-active' : ''}`}
                    onClick={() => {
                      setChannel(option.id)
                      if (option.id === 'visit') setStep('time')
                      else setStep('review')
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {step === 'time' ? (
            <>
              <p className="dr-plan-message">{askVisitTime()}</p>
              <div className="dr-plan-options">
                {TIME_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={`dr-plan-chip ${preferredTime === option.id ? 'dr-plan-chip-active' : ''}`}
                    onClick={() => {
                      setPreferredTime(option.id)
                      if (option.id !== 'custom') setStep('review')
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {preferredTime === 'custom' ? (
                <div className="dr-plan-custom">
                  <input
                    type="time"
                    className={FORM_INPUT_CLASS}
                    value={customTime}
                    onChange={(event) => setCustomTime(event.target.value)}
                  />
                  <PrimaryButton
                    type="button"
                    disabled={!customTime}
                    onClick={() => setStep('review')}
                  >
                    آگے
                  </PrimaryButton>
                </div>
              ) : null}
            </>
          ) : null}

          {step === 'review' && draft ? (
            <>
              <p className="dr-plan-message">{presentSuggestedPlan(summary)}</p>
              <div className="dr-plan-actions">
                <PrimaryButton type="button" onClick={handleApprove}>
                  منظور کریں
                </PrimaryButton>
                <SecondaryButton type="button" onClick={handleModify}>
                  ترمیم کریں
                </SecondaryButton>
              </div>
            </>
          ) : null}

          {step === 'done' ? (
            <>
              <p className="dr-plan-message dr-plan-closing">{PLANNING_CLOSING_MESSAGE}</p>
              <PrimaryButton type="button" className="dr-plan-primary" onClick={resetAndClose}>
                ٹھیک ہے
              </PrimaryButton>
            </>
          ) : null}
        </div>
      </aside>
    </div>
  )
}
