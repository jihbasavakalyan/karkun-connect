/**
 * Featured Digital Rafeeq companion card — visual heart of Rukn Home (KC-009).
 */

import { Icon } from '@/components/ui/Icon'
import { PrimaryButton } from '@/components/ui/PrimaryButton'

type AskDigitalRafeeqCardProps = {
  onOpen: () => void
  ready?: boolean
  /** Compact strip (legacy). Featured is the KC-009 default. */
  compact?: boolean
  /** Featured companion layout for mission home. */
  featured?: boolean
  guidanceLine?: string
}

export function AskDigitalRafeeqCard({
  onOpen,
  ready = true,
  compact = false,
  featured = false,
  guidanceLine,
}: AskDigitalRafeeqCardProps) {
  if (featured) {
    return (
      <section className="mc-ask-rafeeq mc-ask-rafeeq-featured" aria-label="ڈیجیٹل رفیق">
        <div className="mc-ask-rafeeq-orb" aria-hidden="true">
          <Icon name="sparkles" size="md" />
        </div>
        <div className="mc-ask-rafeeq-copy urdu-text" dir="rtl" lang="ur">
          <p className="mc-ask-rafeeq-eyebrow">ڈیجیٹل رفیق</p>
          <h2 className="mc-ask-rafeeq-title">آپ کا رفیقِ کار</h2>
          <p className="mc-ask-rafeeq-guidance">
            {guidanceLine ??
              'آئیے آج کے مشن پر ایک ساتھ غور کریں — میں یاد دہانی، رہنمائی اور حوصلہ افزائی کے لیے حاضر ہوں۔'}
          </p>
          <p className="mc-ask-rafeeq-status">
            <span className={ready ? 'mc-ask-ready' : 'mc-ask-busy'}>
              {ready ? 'تیار' : 'تیاری'}
            </span>
          </p>
        </div>
        <PrimaryButton type="button" className="mc-ask-rafeeq-cta" onClick={onOpen}>
          بات کریں
        </PrimaryButton>
      </section>
    )
  }

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
