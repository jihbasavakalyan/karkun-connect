/**
 * Connect / execution guidance card (KC-009.1) — Urdu companion copy.
 */

import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { useExecutionGuidance } from './ContextualGuidanceHooks'
import type { ConversationRole } from '@/runtime/service'
import {
  RAFEEQ_BRAND,
  RAFEEQ_EMPTY_LINES,
  RAFEEQ_SUBTITLE,
  buildContextualRafeeqGuidance,
  resolveRafeeqLocalization,
} from '@/features/digitalRafeeq/companion/rafeeqUrduCopy'

export type ExecutionGuidanceCardProps = {
  route: string
  role: ConversationRole
  payload?: Readonly<Record<string, unknown>>
}

export function ExecutionGuidanceCard({
  route,
  role,
  payload,
}: ExecutionGuidanceCardProps) {
  const ruknId = useRequiredRuknId()
  const { enabled, loading, viewModel } = useExecutionGuidance({
    route,
    role,
    payload,
  })

  if (!enabled) return null
  if (viewModel.visibility === 'hidden' && !loading) return null

  const contextual =
    role === 'rukn' && ruknId ? buildContextualRafeeqGuidance(ruknId) : null

  const priority =
    contextual ??
    (viewModel.todaysPriority
      ? resolveRafeeqLocalization(
          // prefer known keys; fall back to raw if already localized
          viewModel.todaysPriority.startsWith('guidance.')
            ? viewModel.todaysPriority
            : 'guidance.suggestion.next_step',
        )
      : RAFEEQ_EMPTY_LINES.noPriority)

  const nextKarkun = contextual ?? viewModel.suggestedNextKarkun ?? RAFEEQ_EMPTY_LINES.noNext
  const followUp = viewModel.pendingFollowUp
    ? viewModel.pendingFollowUp.startsWith('guidance.')
      ? resolveRafeeqLocalization(viewModel.pendingFollowUp)
      : viewModel.pendingFollowUp
    : RAFEEQ_EMPTY_LINES.noFollowUp

  return (
    <div
      className="cd-panel cd-panel-secondary cd-rafeeq-panel urdu-text"
      aria-label={RAFEEQ_BRAND}
      dir="rtl"
      lang="ur"
    >
      <h2 className="cd-section-heading" dir="ltr" lang="en" style={{ textAlign: 'left' }}>
        {RAFEEQ_BRAND}
      </h2>
      <p className="cd-caption">{RAFEEQ_SUBTITLE}</p>
      {loading ? <p className="cd-caption">{RAFEEQ_EMPTY_LINES.preparing}</p> : null}

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">آج کی تجویز</h3>
        <p className="cd-supporting">{priority}</p>
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">اگلا رابطہ</h3>
        <p className="cd-supporting">{nextKarkun}</p>
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">فالو اپ یاد دہانی</h3>
        <p className="cd-supporting">{followUp}</p>
      </div>

      <div className="cd-block cd-rafeeq-block">
        <h3 className="cd-block-title">رکاوٹیں</h3>
        {viewModel.blockers.length === 0 ? (
          <p className="cd-caption">{RAFEEQ_EMPTY_LINES.noBlockers}</p>
        ) : (
          <ul className="cd-caption-list">
            {viewModel.blockers.map((item) => (
              <li key={item}>
                {item.startsWith('guidance.') ? resolveRafeeqLocalization(item) : item}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
