/**
 * Compact Digital Rafeeq dashboard entry (KC-007.1 / KC-007.7).
 */

import { Icon } from '@/components/ui/Icon'
import { PrimaryButton } from '@/components/ui/PrimaryButton'

type AskDigitalRafeeqCardProps = {
  onOpen: () => void
  ready?: boolean
  compact?: boolean
}

export function AskDigitalRafeeqCard({
  onOpen,
  ready = true,
  compact = false,
}: AskDigitalRafeeqCardProps) {
  if (compact) {
    return (
      <section className="mc-ask-rafeeq mc-ask-rafeeq-compact" aria-label="Ask Digital Rafeeq">
        <div className="mc-ask-rafeeq-copy">
          <p className="mc-ask-rafeeq-eyebrow">Digital Rafeeq</p>
          <p className="mc-ask-rafeeq-status">
            <span className={ready ? 'mc-ask-ready' : 'mc-ask-busy'}>
              {ready ? 'Ready' : 'Preparing'}
            </span>
          </p>
        </div>
        <PrimaryButton type="button" className="mc-ask-rafeeq-cta" onClick={onOpen}>
          Ask
        </PrimaryButton>
      </section>
    )
  }

  return (
    <section className="mc-ask-rafeeq" aria-label="Ask Digital Rafeeq">
      <div className="mc-ask-rafeeq-orb" aria-hidden="true">
        <Icon name="sparkles" size="md" />
      </div>
      <div className="mc-ask-rafeeq-copy">
        <p className="mc-ask-rafeeq-eyebrow">Ask Digital Rafeeq</p>
        <h2 className="mc-ask-rafeeq-title">Voice Assistant</h2>
        <p className="mc-ask-rafeeq-status">
          Status ·{' '}
          <span className={ready ? 'mc-ask-ready' : 'mc-ask-busy'}>
            {ready ? 'Ready' : 'Preparing'}
          </span>
        </p>
      </div>
      <PrimaryButton type="button" className="mc-ask-rafeeq-cta" onClick={onOpen}>
        Open Assistant
      </PrimaryButton>
    </section>
  )
}
