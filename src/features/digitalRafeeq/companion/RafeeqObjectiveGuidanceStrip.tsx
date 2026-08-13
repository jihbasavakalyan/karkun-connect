/**
 * Phase 8 / TASK-067–068 — Concise Rafeeq presentation of a TASK-066 recommendation.
 * Speaks the same Urdu shown on screen via existing RafeeqSpeakButton → /api/tts.
 */

import { Link } from 'react-router-dom'
import { RafeeqSpeakButton } from '@/features/digitalRafeeq/voice/RafeeqSpeakButton'
import {
  loadPrimaryRafeeqContextualPresentation,
  type RafeeqContextualPresentation,
} from '@/execution'

type RafeeqObjectiveGuidanceStripProps = {
  presentation?: RafeeqContextualPresentation | null
  onNotice?: (message: string) => void
}

export function RafeeqObjectiveGuidanceStrip({
  presentation,
  onNotice,
}: RafeeqObjectiveGuidanceStripProps) {
  const resolved = presentation === undefined ? loadPrimaryRafeeqContextualPresentation() : presentation
  if (!resolved) return null

  return (
    <section className="dr-voice-result-card" aria-label="اب مجھے کیا کرنا چاہیے؟">
      <div className="dr-voice-bubble-row">
        <div className="min-w-0 flex-1">
          <p className="dr-voice-result-type">{resolved.actionCode}</p>
          <p className="dr-voice-result-name urdu-text" dir="rtl" lang="ur">
            {resolved.urduAction}
          </p>
          <p className="dr-voice-result-desc urdu-text" dir="rtl" lang="ur">
            {resolved.urduWhy}
          </p>
        </div>
        <RafeeqSpeakButton text={resolved.spokenText} onNotice={onNotice} />
      </div>
      {resolved.routeHint ? (
        <Link className="dr-voice-result-cta" to={resolved.routeHint}>
          عملی قدم
        </Link>
      ) : null}
    </section>
  )
}
