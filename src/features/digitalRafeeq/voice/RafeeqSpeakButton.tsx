/**
 * KC-016 / KC-019 — Reusable Digital Rafeeq speaker control.
 * Prefer Google Cloud TTS via /api/tts; never call Google from the browser.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import {
  cloudSpeechAdapter,
  stopCloudSpeech,
} from './cloudSpeechPlayback'
import {
  localSpeechAdapter,
  stopLocalSpeech,
  type SpeakPlaybackAdapter,
  type SpeakPlaybackState,
} from './speechPlayback'
import { TTS_ERROR_MESSAGE_URDU } from './ttsMessages'

type RafeeqSpeakButtonProps = {
  text: string
  label?: string
  className?: string
  /** Optional override; defaults to cloud TTS adapter. */
  adapter?: SpeakPlaybackAdapter
  /** When cloud fails, optionally try browser speechSynthesis. Default false. */
  allowBrowserFallback?: boolean
  onNotice?: (message: string) => void
  onStateChange?: (state: SpeakPlaybackState) => void
}

export function RafeeqSpeakButton({
  text,
  label = 'جواب سنیں',
  className = '',
  adapter,
  allowBrowserFallback = false,
  onNotice,
  onStateChange,
}: RafeeqSpeakButtonProps) {
  const reactId = useId()
  const [state, setState] = useState<SpeakPlaybackState>('idle')
  const requestGeneration = useRef(0)

  const setPlaybackState = (next: SpeakPlaybackState) => {
    setState(next)
    onStateChange?.(next)
  }

  useEffect(() => {
    return () => {
      requestGeneration.current += 1
      stopCloudSpeech()
      stopLocalSpeech()
    }
  }, [])

  const handleClick = async () => {
    const playback = adapter ?? cloudSpeechAdapter
    const trimmed = text.trim()
    if (!trimmed) return

    if (state === 'playing' || state === 'loading') {
      requestGeneration.current += 1
      playback.stop()
      stopCloudSpeech()
      stopLocalSpeech()
      setPlaybackState('idle')
      return
    }

    if (!playback.isAvailable()) {
      setPlaybackState('error')
      onNotice?.(TTS_ERROR_MESSAGE_URDU)
      return
    }

    const generation = ++requestGeneration.current
    setPlaybackState('loading')

    try {
      await playback.speak(trimmed)
      if (generation !== requestGeneration.current) return
      setPlaybackState('idle')
    } catch (error) {
      if (generation !== requestGeneration.current) return

      if (allowBrowserFallback && localSpeechAdapter.isAvailable()) {
        try {
          setPlaybackState('playing')
          await localSpeechAdapter.speak(trimmed)
          if (generation !== requestGeneration.current) return
          setPlaybackState('idle')
          return
        } catch {
          // fall through to error UX
        }
      }

      stopCloudSpeech()
      stopLocalSpeech()
      setPlaybackState('error')
      const message =
        error instanceof Error && 'userMessage' in error
          ? String((error as Error & { userMessage?: string }).userMessage)
          : TTS_ERROR_MESSAGE_URDU
      onNotice?.(message || TTS_ERROR_MESSAGE_URDU)
      window.setTimeout(() => {
        if (generation === requestGeneration.current) setPlaybackState('idle')
      }, 2400)
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
