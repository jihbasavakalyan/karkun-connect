import { Link } from 'react-router-dom'
import {
  ADMIN_MISSION_ATTENTION_CARDS,
  type AdminAttentionCard,
} from '@/lib/communication/cosMockData'
import { adminCommunicationPath } from '@/lib/communicationNavigation'

const TONE_CLASS: Record<AdminAttentionCard['tone'], string> = {
  attention: 'border-amber-200 bg-amber-50',
  reminder: 'border-sky-200 bg-sky-50',
  appreciation: 'border-emerald-200 bg-emerald-50',
  pending: 'border-violet-200 bg-violet-50',
  draft: 'border-border bg-surface-muted',
}

/**
 * KC-0091 — Admin Mission Center.
 * Answers: "What communication requires my attention today?"
 * Mock data only — no messaging or delivery.
 */
export function MissionCenterPanel() {
  return (
    <div className="space-y-5">
      <section className="rounded-(--radius-card) border border-border bg-surface p-4 shadow-card sm:p-5">
        <h2 className="text-lg font-semibold text-text-heading">Mission Center</h2>
        <p className="mt-1 text-sm text-secondary">
          What communication requires my attention today?
        </p>
      </section>

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="Attention today">
        {ADMIN_MISSION_ATTENTION_CARDS.map((card) => (
          <li key={card.id}>
            <article
              className={[
                'flex h-full flex-col rounded-(--radius-card) border p-4 shadow-card',
                TONE_CLASS[card.tone],
              ].join(' ')}
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                {card.countLabel}
              </p>
              <h3 className="mt-1 text-base font-semibold text-text-heading">{card.title}</h3>
              <p className="mt-2 flex-1 text-sm text-secondary">{card.summary}</p>
              <p className="mt-3 text-xs font-medium text-secondary">Preview only · no send</p>
            </article>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          to={adminCommunicationPath('queue')}
          className="font-medium text-primary hover:underline"
        >
          Open Communication Queue →
        </Link>
        <Link
          to={adminCommunicationPath('audiences')}
          className="font-medium text-primary hover:underline"
        >
          Manage Audiences →
        </Link>
      </div>
    </div>
  )
}
