/**
 * Digital Rafeeq voice/text assistant drawer (KC-007 + KC-016 voice-ready UI).
 * Lazy-friendly conversational UI over live operational Q&A.
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { getDigitalRafeeqService } from '@/runtime/service'
import { useCampaignAutomationEngine } from '@/hooks/useCampaignAutomationEngine'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import type {
  AdminCommandCenterSnapshot,
  RuknCommandCenterSnapshot,
} from '@/types/campaignAutomation.types'
import {
  answerOperationalQuery,
  RAFEEQ_WELCOME_MESSAGE,
  resolveContextualSuggestions,
  type OpsAnswerAction,
} from './opsAnswers'
import { RafeeqSpeakButton } from './RafeeqSpeakButton'
import { speakRafeeqText, stopLocalSpeech } from './speechPlayback'
import { useSpeechRecognition, type VoiceStatus } from './useSpeechRecognition'

export type VoiceAssistantRole = 'administrator' | 'rukn'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  actions?: OpsAnswerAction[]
}

type DigitalRafeeqVoiceDrawerProps = {
  role: VoiceAssistantRole
  open: boolean
  onClose: () => void
}

function statusLabel(status: VoiceStatus, thinking: boolean, speaking: boolean): string {
  if (thinking) return 'سوچ رہے ہیں…'
  if (speaking) return 'بول رہے ہیں…'
  if (status === 'listening') return 'سن رہے ہیں…'
  if (status === 'denied') return 'مائیک بند ہے'
  if (status === 'unsupported') return 'آواز دستیاب نہیں — لکھیں'
  if (status === 'error') return 'آواز میں مسئلہ — لکھ کر پوچھیں'
  return 'آپ کا خصوصی معاون'
}

function VoiceStageFeedback({
  listening,
  thinking,
  speaking,
}: {
  listening: boolean
  thinking: boolean
  speaking: boolean
}) {
  if (!listening && !thinking && !speaking) return null

  return (
    <div className="dr-voice-stage" aria-hidden="true">
      {listening ? (
        <div className="dr-voice-waveform">
          {Array.from({ length: 7 }).map((_, index) => (
            <span key={index} className="dr-voice-wave-bar" />
          ))}
        </div>
      ) : null}
      {thinking ? (
        <p className="dr-voice-thinking">
          <span className="dr-voice-thinking-dot" />
          سوچ رہے ہیں…
        </p>
      ) : null}
      {speaking ? <div className="dr-voice-speaking-orb" /> : null}
    </div>
  )
}

export function DigitalRafeeqVoiceDrawer({
  role,
  open,
  onClose,
}: DigitalRafeeqVoiceDrawerProps) {
  const titleId = useId()
  const listRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [voiceNotice, setVoiceNotice] = useState('')
  const ruknId = useRequiredRuknId()

  const adminSnapshot = useCampaignAutomationEngine({
    role: 'administrator',
  }) as AdminCommandCenterSnapshot

  const ruknSnapshot = useCampaignAutomationEngine({
    role: 'rukn',
    ruknId: ruknId ?? '',
  }) as RuknCommandCenterSnapshot

  const suggestions = useMemo(
    () =>
      resolveContextualSuggestions({
        role,
        ruknSnapshot: role === 'rukn' ? ruknSnapshot : undefined,
        adminSnapshot: role === 'administrator' ? adminSnapshot : undefined,
      }),
    [role, ruknSnapshot, adminSnapshot],
  )

  const handleAnswer = async (query: string) => {
    const trimmed = query.trim()
    if (!trimmed) return

    setMessages((current) => [
      ...current,
      { id: `u-${Date.now()}`, role: 'user', text: trimmed },
    ])
    setInput('')
    setThinking(true)

    // Ensure runtime is warm (guidance path), but answers come from live ops layer.
    try {
      const service = getDigitalRafeeqService()
      if (service.isEnabled()) {
        await service.initialize()
      }
    } catch {
      // Ops answers do not require runtime; continue.
    }

    await new Promise((resolve) => window.setTimeout(resolve, 280))

    const answer = answerOperationalQuery(trimmed, {
      role,
      ruknId: ruknId ?? undefined,
      adminSnapshot: role === 'administrator' ? adminSnapshot : undefined,
      ruknSnapshot: role === 'rukn' ? ruknSnapshot : undefined,
    })

    setThinking(false)
    setMessages((current) => [
      ...current,
      {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: answer.text,
        actions: answer.actions,
      },
    ])

    setSpeaking(true)
    try {
      await speakRafeeqText(answer.text, (message) => setVoiceNotice(message))
    } catch {
      setVoiceNotice('آڈیو چلانے میں مسئلہ ہوا۔ اسپیکر بٹن سے دوبارہ سنیں۔')
    }
    setSpeaking(false)
  }

  const speech = useSpeechRecognition({
    lang: 'ur-IN',
    onFinalTranscript: (text) => {
      void handleAnswer(text)
    },
  })

  useEffect(() => {
    if (!open) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  useEffect(() => {
    if (!open) {
      stopLocalSpeech()
      setSpeaking(false)
    }
  }, [open])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, thinking])

  const voiceClass = useMemo(() => {
    if (speech.status === 'listening') return 'dr-voice-mic listening'
    if (thinking) return 'dr-voice-mic thinking'
    if (speaking) return 'dr-voice-mic speaking'
    return 'dr-voice-mic'
  }, [speech.status, thinking, speaking])

  if (!open) return null

  return (
    <div className="dr-voice-overlay" role="presentation" onClick={onClose}>
      <aside
        className="dr-voice-drawer urdu-text"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        dir="rtl"
        lang="ur"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="dr-voice-header">
          <div className="dr-voice-header-text">
            <h2 id={titleId} className="dr-voice-title">
              ڈیجیٹل رفیق
            </h2>
            <p className="dr-voice-status">{statusLabel(speech.status, thinking, speaking)}</p>
          </div>
          <button type="button" className="dr-voice-close" aria-label="Close assistant" onClick={onClose}>
            <Icon name="x" size="sm" />
          </button>
        </header>

        <VoiceStageFeedback
          listening={speech.status === 'listening'}
          thinking={thinking}
          speaking={speaking}
        />

        <div ref={listRef} className="dr-voice-messages" aria-live="polite">
          {messages.length === 0 && (
            <p className="dr-voice-empty">{RAFEEQ_WELCOME_MESSAGE}</p>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === 'user' ? 'dr-voice-bubble dr-voice-bubble-user' : 'dr-voice-bubble'
              }
            >
              <div className="dr-voice-bubble-row">
                <p className="dr-voice-bubble-text">{message.text}</p>
                {message.role === 'assistant' ? (
                  <RafeeqSpeakButton
                    text={message.text}
                    onNotice={(notice) => setVoiceNotice(notice)}
                    onStateChange={(state) => {
                      if (state === 'playing') setSpeaking(true)
                      if (state === 'idle' || state === 'error') setSpeaking(false)
                    }}
                  />
                ) : null}
              </div>
              {message.actions && message.actions.length > 0 && (
                <div className="dr-voice-actions">
                  {message.actions.map((action) => (
                    <Link
                      key={action.id}
                      to={action.route}
                      className="dr-voice-action"
                      onClick={onClose}
                    >
                      {action.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="dr-voice-suggestions" role="list" aria-label="تجویز کردہ سوالات">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              className="dr-voice-chip"
              role="listitem"
              data-suggestion-id={suggestion.id}
              data-speakable={suggestion.text}
              onClick={() => void handleAnswer(suggestion.text)}
            >
              {suggestion.text}
            </button>
          ))}
        </div>

        {speech.interimTranscript ? (
          <p className="dr-voice-interim">{speech.interimTranscript}</p>
        ) : null}

        <footer className="dr-voice-footer">
          <button
            type="button"
            className={voiceClass}
            aria-label={speech.status === 'listening' ? 'سننا بند کریں' : 'آواز سے پوچھیں'}
            onClick={() => {
              if (speech.status === 'listening') speech.stop()
              else speech.start()
            }}
            disabled={!speech.supported && speech.status === 'unsupported'}
          >
            <Icon name="mic" size="md" />
          </button>

          <form
            className="dr-voice-form"
            onSubmit={(event) => {
              event.preventDefault()
              void handleAnswer(input)
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="کچھ بھی پوچھیے…"
              className="dr-voice-input"
              aria-label="ڈیجیٹل رفیق سے پوچھیں"
              dir="auto"
              enterKeyHint="send"
              autoComplete="off"
            />
            <PrimaryButton type="submit" disabled={!input.trim() || thinking}>
              بھیجیں
            </PrimaryButton>
          </form>
        </footer>

        {voiceNotice ? <p className="dr-voice-fallback">{voiceNotice}</p> : null}

        {(speech.status === 'denied' || speech.status === 'unsupported') && (
          <p className="dr-voice-fallback">
            {speech.status === 'denied'
              ? 'مائیک کی اجازت نہیں ملی۔ آپ لکھ کر پوچھ سکتے ہیں۔'
              : 'اس براؤزر میں آواز کی پہچان دستیاب نہیں۔ سوال لکھ کر بھیجیں۔'}
          </p>
        )}

        <div className="dr-voice-footer-note">
          <SecondaryButton type="button" onClick={onClose}>
            بند کریں
          </SecondaryButton>
        </div>
      </aside>
    </div>
  )
}
