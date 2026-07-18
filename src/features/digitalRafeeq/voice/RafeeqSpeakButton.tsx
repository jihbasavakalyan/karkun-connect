/**
 * KC-016 — Reusable Digital Rafeeq speaker control (voice-ready UI).
 * States: idle → loading → playing | error. No cloud TTS wiring.
 */

import { useEffect, useId, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import {
  localSpeechAdapter,
  speakRafeeqText,
  stopLocalSpeech,
  type SpeakPlaybackAdapter,
  type SpeakPlaybackState,
} from './speechPlayback'

type RafeeqSpeakButtonProps = {
  text: string
  label?: string
  className?: string
  /** Optional future cloud TTS adapter; defaults to local speechSynthesis. */
  adapter?: SpeakPlaybackAdapter
  onNotice?: (message: string) => void
  onStateChange?: (state: SpeakPlaybackState) => void
}

export function RafeeqSpeakButton({
  text,
  label = 'جواب سنیں',
  className = '',
  adapter,
  onNotice,
  onStateChange,
}: RafeeqSpeakButtonProps) {
  const reactId = useId()
  const [state, setState] = useState<SpeakPlaybackState>('idle')

  const setPlaybackState = (next: SpeakPlaybackState) => {
    setState(next)
    onStateChange?.(next)
  }

  useEffect(() => {
    return () => {
      stopLocalSpeech()
    }
  }, [])

  const handleClick = async () => {
    const playback = adapter ?? localSpeechAdapter
    const trimmed = text.trim()
    if (!trimmed) return

    if (state === 'playing' || state === 'loading') {
      playback.stop()
      setPlaybackState('idle')
      return
    }

    if (!playback.isAvailable()) {
      setPlaybackState('error')
      onNotice?.('آڈیو اس آلے پر دستیاب نہیں۔')
      return
    }

    setPlaybackState('loading')
    try {
      // Brief loading flash so UI is ready for future cloud TTS latency.
      await new Promise((resolve) => window.setTimeout(resolve, 120))
      setPlaybackState('playing')
      if (adapter) {
        await adapter.speak(trimmed)
      } else {
        await speakRafeeqText(trimmed, onNotice)
      }
      setPlaybackState('idle')
    } catch {
      stopLocalSpeech()
      setPlaybackState('error')
      onNotice?.('آڈیو چلانے میں مسئلہ ہوا۔ دوبارہ کوشش کریں۔')
      window.setTimeout(() => setPlaybackState('idle'), 2400)
    }
  }

  const stateLabel =
    state === 'loading'
      ? 'آڈیو تیار ہو رہا ہے…'
      : state === 'playing'
        ? 'چل رہا ہے — بند کرنے کے لیے دبائیں'
        : state === 'error'
          ? 'آڈیو دستیاب نہیں'
          : label

  return (
    <button
      type="button"
      id={reactId}
      className={`dr-speak-btn dr-speak-btn-${state} ${className}`.trim()}
      aria-label={stateLabel}
      aria-pressed={state === 'playing'}
      aria-busy={state === 'loading'}
      title={stateLabel}
      onClick={() => void handleClick()}
    >
      {state === 'loading' ? (
        <span className="dr-speak-spinner" aria-hidden="true" />
      ) : (
        <Icon name="speaker" size="sm" className="dr-speak-icon" />
      )}
      <span className="dr-speak-label sr-only">{stateLabel}</span>
    </button>
  )
}
