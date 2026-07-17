/**
 * Compact Digital Rafeeq dashboard entry (KC-007).
 * No long recommendation text — opens the voice assistant drawer.
 */

import { Icon } from '@/components/ui/Icon'
import { PrimaryButton } from '@/components/ui/PrimaryButton'

type AskDigitalRafeeqCardProps = {
  onOpen: () => void
  ready?: boolean
}

export function AskDigitalRafeeqCard({ onOpen, ready = true }: AskDigitalRafeeqCardProps) {
  return (
    <section className="mc-ask-rafeeq" aria-label="Ask Digital Rafeeq">
      <div className="mc-ask-rafeeq-copy">
        <p className="mc-ask-rafeeq-eyebrow">Ask Digital Rafeeq</p>
        <h2 className="mc-ask-rafeeq-title">
          <Icon name="mic" size="sm" /> Voice Assistant
        </h2>
        <p className="mc-ask-rafeeq-status">
          Status · <span className={ready ? 'mc-ask-ready' : 'mc-ask-busy'}>{ready ? 'Ready' : 'Preparing'}</span>
        </p>
      </div>
      <PrimaryButton type="button" onClick={onOpen}>
        Open Assistant
      </PrimaryButton>
    </section>
  )
}
