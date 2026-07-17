/**
 * Digital Rafeeq voice/text assistant drawer (KC-007).
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
  SUGGESTED_QUESTIONS_ADMIN,
  SUGGESTED_QUESTIONS_RUKN,
  answerOperationalQuery,
  type OpsAnswerAction,
} from './opsAnswers'
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
  if (thinking) return 'ڈیجیٹل رفیق سوچ رہے ہیں…'
  if (speaking) return 'بول رہے ہیں…'
  if (status === 'listening') return 'سن رہے ہیں…'
  if (status === 'denied') return 'مائیک بند ہے'
  if (status === 'unsupported') return 'آواز دستیاب نہیں — لکھیں'
  if (status === 'error') return 'آواز میں مسئلہ — لکھ کر پوچھیں'
  return 'تیار'
}

function pickUrduVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find((voice) => /^ur(-|$)/i.test(voice.lang)) ??
    voices.find((voice) => /urdu/i.test(voice.name)) ??
    null
  )
}

function speakText(
  text: string,
  onFallbackNotice?: (message: string) => void,
): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      onFallbackNotice?.(
        'اردو آواز اس آلے پر دستیاب نہیں۔ جواب متن میں دکھایا گیا ہے؛ اگر ضروری ہو تو انگریزی آواز استعمال ہو سکتی ہے۔',
      )
      resolve()
      return
    }
    window.speechSynthesis.cancel()
    const spoken = text.replace(/^السلام علیکم\s*/u, '').trim() || text
    const utterance = new SpeechSynthesisUtterance(spoken)
    utterance.rate = 1
    const urduVoice = pickUrduVoice()
    if (urduVoice) {
      utterance.voice = urduVoice
      utterance.lang = urduVoice.lang || 'ur-IN'
    } else {
      utterance.lang = 'ur-IN'
      onFallbackNotice?.(
        'اردو آواز اس براؤزر میں دستیاب نہیں۔ جواب اردو متن میں ہے؛ بولنے کے لیے انگریزی آواز استعمال ہو رہی ہے۔',
      )
      // Explicit English fallback only after notifying — never silent.
      utterance.lang = 'en-IN'
    }
    utterance.onend = () => resolve()
    utterance.onerror = () => resolve()
    window.speechSynthesis.speak(utterance)
  })
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
          Digital Rafeeq سوچ رہے ہیں…
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

  const suggestions = role === 'administrator' ? SUGGESTED_QUESTIONS_ADMIN : SUGGESTED_QUESTIONS_RUKN

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
    await speakText(answer.text, (message) => setVoiceNotice(message))
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
          <div>
            <h2 id={titleId} className="dr-voice-title">
              Digital Rafeeq
            </h2>
            <p className="dr-voice-status">
              {statusLabel(speech.status, thinking, speaking)}
            </p>
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
            <p className="dr-voice-empty">
              ملاقات، روابط، حاضری یا آج کی ترجیحات کے بارے میں پوچھیں۔
            </p>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={
                message.role === 'user' ? 'dr-voice-bubble dr-voice-bubble-user' : 'dr-voice-bubble'
              }
            >
              <p>{message.text}</p>
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

        <div className="dr-voice-suggestions">
          {suggestions.map((question) => (
            <button
              key={question}
              type="button"
              className="dr-voice-chip"
              onClick={() => void handleAnswer(question)}
            >
              {question}
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
              placeholder="سوال لکھیں…"
              className="dr-voice-input"
              aria-label="ڈیجیٹل رفیق سے پوچھیں"
              dir="auto"
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
