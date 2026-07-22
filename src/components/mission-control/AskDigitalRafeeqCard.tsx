/**
 * Featured Digital Rafeeq companion card — visual heart of Rukn Home (KC-009.1).
 * Brand heading stays "Digital Rafeeq"; conversation copy is natural Urdu.
 * KC-0083 — `mini` keeps a one-line recommendation + Play CTA.
 * KC-0085 — mini Play speaks `guidanceLine` via cloud TTS (not open-drawer only).
 */

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { RAFEEQ_BRAND, RAFEEQ_SUBTITLE } from '@/features/digitalRafeeq/companion/rafeeqUrduCopy'
import { speakRafeeqCloudText, stopCloudSpeech } from '@/features/digitalRafeeq/voice/cloudSpeechPlayback'
import { TTS_ERROR_MESSAGE_URDU } from '@/features/digitalRafeeq/voice/ttsMessages'

type AskDigitalRafeeqCardProps = {
  onOpen: () => void
  ready?: boolean
  compact?: boolean
  /** KC-0083 — single-line recommendation strip */
  mini?: boolean
  featured?: boolean
  guidanceLine?: string
}

export function AskDigitalRafeeqCard({
  onOpen,
  ready = true,
  compact = false,
  mini = false,
  featured = false,
  guidanceLine,
}: AskDigitalRafeeqCardProps) {
  const [playState, setPlayState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [playNotice, setPlayNotice] = useState('')

  if (mini) {
    const line = (guidanceLine ?? RAFEEQ_SUBTITLE).trim()
    return (
      <section
        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3 py-2.5 shadow-card"
        aria-label={RAFEEQ_BRAND}
      >
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wide text-secondary">
            {RAFEEQ_BRAND}
          </p>
          <p className="text-xs font-medium text-text-heading">Today&apos;s Recommendation</p>
          <p className="truncate text-sm text-secondary urdu-text" dir="rtl" lang="ur">
            {guidanceLine ?? RAFEEQ_SUBTITLE}
          </p>
          {playNotice ? (
            <p className="mt-1 text-xs text-red-600 urdu-text" dir="rtl" lang="ur">
              {playNotice}
            </p>
          ) : null}
        </div>
        <PrimaryButton
          type="button"
          className="shrink-0 !min-h-10 !px-3 !py-2 text-sm"
          disabled={!ready || playState === 'loading' || !line}
          aria-busy={playState === 'loading'}
          onClick={() => {
            void (async () => {
              setPlayNotice('')
              setPlayState('loading')
              try {
                await speakRafeeqCloudText(line)
                setPlayState('idle')
              } catch (error) {
                stopCloudSpeech()
                const message =
                  error instanceof Error && 'userMessage' in error
                    ? String((error as Error & { userMessage?: string }).userMessage)
                    : TTS_ERROR_MESSAGE_URDU
                setPlayNotice(message || TTS_ERROR_MESSAGE_URDU)
                setPlayState('error')
                window.setTimeout(() => setPlayState('idle'), 2400)
              }
            })()
          }}
        >
          {playState === 'loading' ? '…' : 'Play'}
        </PrimaryButton>
      </section>
    )
  }

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
            {guidanceLine ?? RAFEEQ_SUBTITLE}
          </p>
        </div>
        <div className="mc-ask-rafeeq-actions">
          <PrimaryButton type="button" className="mc-ask-rafeeq-cta" onClick={onOpen}>
            بات کریں
          </PrimaryButton>
        </div>
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
