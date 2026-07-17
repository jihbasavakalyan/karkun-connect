/**
 * Featured Digital Rafeeq companion card — visual heart of Rukn Home (KC-009.1).
 * Brand heading stays "Digital Rafeeq"; conversation copy is natural Urdu.
 */

import { Icon } from '@/components/ui/Icon'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { RAFEEQ_BRAND, RAFEEQ_SUBTITLE } from '@/features/digitalRafeeq/companion/rafeeqUrduCopy'

type AskDigitalRafeeqCardProps = {
  onOpen: () => void
  ready?: boolean
  compact?: boolean
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
      <section className="mc-ask-rafeeq mc-ask-rafeeq-featured" aria-label={RAFEEQ_BRAND}>
        <div className="mc-ask-rafeeq-orb" aria-hidden="true">
          <Icon name="sparkles" size="md" />
        </div>
        <div className="mc-ask-rafeeq-copy">
          <p className="mc-ask-rafeeq-eyebrow">{RAFEEQ_BRAND}</p>
          <h2 className="mc-ask-rafeeq-title urdu-text" dir="rtl" lang="ur">
            {RAFEEQ_SUBTITLE}
          </h2>
          <p className="mc-ask-rafeeq-guidance urdu-text" dir="rtl" lang="ur">
            {guidanceLine ??
              'آئیے آج کے مشن پر ایک ساتھ غور کریں — میں یاد دہانی، رہنمائی اور حوصلہ افزائی کے لیے حاضر ہوں۔'}
          </p>
        </div>
        <PrimaryButton type="button" className="mc-ask-rafeeq-cta" onClick={onOpen} disabled={!ready}>
          بات کریں
        </PrimaryButton>
      </section>
    )
  }

  if (compact) {
    return (
      <section className="mc-ask-rafeeq mc-ask-rafeeq-compact" aria-label={RAFEEQ_BRAND}>
        <div className="mc-ask-rafeeq-copy">
          <p className="mc-ask-rafeeq-eyebrow">{RAFEEQ_BRAND}</p>
          <p className="mc-ask-rafeeq-status urdu-text" dir="rtl" lang="ur">
            {RAFEEQ_SUBTITLE}
          </p>
        </div>
        <PrimaryButton type="button" className="mc-ask-rafeeq-cta" onClick={onOpen}>
          بات کریں
        </PrimaryButton>
      </section>
    )
  }

  return (
    <section className="mc-ask-rafeeq" aria-label={RAFEEQ_BRAND}>
      <div className="mc-ask-rafeeq-orb" aria-hidden="true">
        <Icon name="sparkles" size="md" />
      </div>
      <div className="mc-ask-rafeeq-copy">
        <p className="mc-ask-rafeeq-eyebrow">{RAFEEQ_BRAND}</p>
        <h2 className="mc-ask-rafeeq-title urdu-text" dir="rtl" lang="ur">
          {RAFEEQ_SUBTITLE}
        </h2>
      </div>
      <PrimaryButton type="button" className="mc-ask-rafeeq-cta" onClick={onOpen}>
        بات کریں
      </PrimaryButton>
    </section>
  )
}
