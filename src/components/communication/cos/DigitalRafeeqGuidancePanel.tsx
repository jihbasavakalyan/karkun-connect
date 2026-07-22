import { RUKN_RAFEEQ_SUGGESTIONS } from '@/lib/communication/cosMockData'
import { CosPlaceholderPanel } from '@/components/communication/cos/CosPlaceholderPanel'

/**
 * KC-0091 — Static Digital Rafeeq guidance panel.
 * No AI — recommendations are mock copy only.
 */
export function DigitalRafeeqGuidancePanel({
  compact = false,
  title = 'Digital Rafeeq',
}: {
  compact?: boolean
  title?: string
}) {
  const body = (
    <ul className="space-y-2" aria-label="Rafeeq suggestions">
      {RUKN_RAFEEQ_SUGGESTIONS.map((item) => (
        <li
          key={item.id}
          className="rounded-lg border border-border bg-surface-muted px-3 py-2.5 text-sm text-text-heading"
        >
          {item.text}
        </li>
      ))}
    </ul>
  )

  if (compact) {
    return (
      <section className="space-y-2" aria-label={title}>
        <h3 className="text-sm font-semibold text-text-heading">{title}</h3>
        {body}
        <p className="text-xs text-secondary">Static guidance · no AI in this sprint</p>
      </section>
    )
  }

  return (
    <CosPlaceholderPanel
      title={title}
      description="Suggestions to help you serve Connected Karkuns — guidance only, never commands."
    >
      {body}
    </CosPlaceholderPanel>
  )
}
