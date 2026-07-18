/**
 * Digital Rafeeq voice conversation drawer (KC-027).
 * Mic → Google STT → existing intelligence → Google TTS (spoken reply).
 */

import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '@/components/ui/Icon'
import { PrimaryButton } from '@/components/ui/PrimaryButton'
import { SecondaryButton } from '@/components/ui/SecondaryButton'
import { getDigitalRafeeqService } from '@/runtime/service'
import { useRequiredRuknId } from '@/hooks/useRequiredRuknId'
import { useUserPreferences } from '@/hooks/useUserPreferences'
import { useOptionalAdminCommandCenter } from '@/providers/AdminCommandCenterProvider'
import { useOptionalRuknCommandCenter } from '@/providers/RuknCommandCenterProvider'
import {
  answerOperationalQuery,
  RAFEEQ_WELCOME_MESSAGE,
  resolveContextualSuggestions,
  type OpsAnswerAction,
} from './opsAnswers'
import { RafeeqSpeakButton } from './RafeeqSpeakButton'
import { stopCloudSpeech } from './cloudSpeechPlayback'
import { stopLocalSpeech } from './speechPlayback'
import {
  createVoiceConversationService,
  type ConversationPhase,
  type VoiceConversationService,
  type VoiceConversationTurn,
} from './VoiceConversationService'

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

function phaseLabel(phase: ConversationPhase): string {
  if (phase === 'listening') return 'سن رہے ہیں…'
  if (phase === 'thinking') return 'سوچ رہے ہیں…'
  if (phase === 'speaking') return 'بول رہے ہیں…'
  if (phase === 'ready') return 'تیار'
  if (phase === 'error') return 'دوبارہ کوشش کریں'
  return 'آپ کا خصوصی معاون'
}

function VoiceStageFeedback({ phase }: { phase: ConversationPhase }) {
  if (phase === 'idle' || phase === 'ready' || phase === 'error') return null

  return (
    <div className="dr-voice-stage" aria-hidden="true">
      {phase === 'listening' ? (
        <div className="dr-voice-waveform">
          {Array.from({ length: 7 }).map((_, index) => (
            <span key={index} className="dr-voice-wave-bar" />
          ))}
        </div>
      ) : null}
      {phase === 'thinking' ? (
        <p className="dr-voice-thinking">
          <span className="dr-voice-thinking-dot" />
          سوچ رہے ہیں…
        </p>
      ) : null}
      {phase === 'speaking' ? <div className="dr-voice-speaking-orb" /> : null}
    </div>
  )
}

function turnsToMessages(turns: VoiceConversationTurn[]): ChatMessage[] {
  const messages: ChatMessage[] = []
  for (const turn of turns) {
    messages.push({
      id: `${turn.id}-u`,
      role: 'user',
      text: turn.userSpeechRecognized,
    })
    messages.push({
      id: `${turn.id}-a`,
      role: 'assistant',
      text: turn.rafeeqResponse,
      actions: turn.actions,
    })
  }
  return messages
}

export function DigitalRafeeqVoiceDrawer({
  role,
  open,
  onClose,
}: DigitalRafeeqVoiceDrawerProps) {
  const titleId = useId()
  const listRef = useRef<HTMLDivElement>(null)
  const serviceRef = useRef<VoiceConversationService | null>(null)
  if (!serviceRef.current) serviceRef.current = createVoiceConversationService()
  const conversation = serviceRef.current

  const [phase, setPhase] = useState<ConversationPhase>('idle')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [interimText, setInterimText] = useState('')
  const [input, setInput] = useState('')
  const [voiceNotice, setVoiceNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const ruknId = useRequiredRuknId()
  const { preferences } = useUserPreferences()

  // KC-027F: reuse layout provider snapshot — never rebuild command center here.
  const adminSnapshot = useOptionalAdminCommandCenter()
  const ruknSnapshot = useOptionalRuknCommandCenter()

  const suggestions = useMemo(() => {
    if (!preferences.rafeeq.suggestedQuestions) return []
    return resolveContextualSuggestions({
      role,
      ruknSnapshot: role === 'rukn' ? (ruknSnapshot ?? undefined) : undefined,
      adminSnapshot: role === 'administrator' ? (adminSnapshot ?? undefined) : undefined,
    })
  }, [role, ruknSnapshot, adminSnapshot, preferences.rafeeq.suggestedQuestions])

  useEffect(() => {
    return conversation.subscribe((state) => {
      setPhase(state.phase)
      setInterimText(state.interimRecognizedText)
      setVoiceNotice(state.notice)
      setMessages(turnsToMessages(state.history))
      setBusy(
        state.phase === 'listening' ||
          state.phase === 'thinking' ||
          state.phase === 'speaking',
      )
    })
  }, [conversation])

  const answerFn = async (query: string) => {
    try {
      const service = getDigitalRafeeqService()
      if (service.isEnabled()) {
        await service.initialize()
      }
    } catch {
      // Ops answers do not require runtime.
    }
    return answerOperationalQuery(query, {
      role,
      ruknId: ruknId ?? undefined,
      adminSnapshot: role === 'administrator' ? (adminSnapshot ?? undefined) : undefined,
      ruknSnapshot: role === 'rukn' ? (ruknSnapshot ?? undefined) : undefined,
    })
  }

  const handleTextAnswer = async (query: string) => {
    const trimmed = query.trim()
    if (!trimmed || busy) return
    setInput('')
    await conversation.converseFromText(trimmed, answerFn, { speakReply: false })
  }

  const handleMicClick = async () => {
    if (phase === 'listening') {
      setBusy(true)
      await conversation.finishListeningAndConverse(answerFn)
      return
    }
    if (busy) return
    stopCloudSpeech()
    stopLocalSpeech()
    try {
      await conversation.startListening()
    } catch {
      // notice already set on service
    }
  }

  useEffect(() => {
    if (!open) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === ' ' && event.altKey) {
        event.preventDefault()
        void handleMicClick()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  })

  useEffect(() => {
    if (!open) {
      conversation.stopAll()
      stopCloudSpeech()
      stopLocalSpeech()
    }
  }, [open, conversation])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, phase, interimText])

  const voiceClass = useMemo(() => {
    if (phase === 'listening') return 'dr-voice-mic listening'
    if (phase === 'thinking') return 'dr-voice-mic thinking'
    if (phase === 'speaking') return 'dr-voice-mic speaking'
    return 'dr-voice-mic'
  }, [phase])

  if (!open) return null

  const micLabel =
    phase === 'listening'
      ? 'سننا بند کریں اور جواب سنیں'
      : 'آواز سے پوچھیں — دبائیں، بولیں، دوبارہ دبائیں'

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
            <p className="dr-voice-status" aria-live="polite">
              {phaseLabel(phase)}
            </p>
          </div>
          <button type="button" className="dr-voice-close" aria-label="Close assistant" onClick={onClose}>
            <Icon name="x" size="sm" />
          </button>
        </header>

        <VoiceStageFeedback phase={phase} />

        <div ref={listRef} className="dr-voice-messages" aria-live="polite">
          {messages.length === 0 && preferences.rafeeq.dailyGreeting ? (
            <p className="dr-voice-empty">{RAFEEQ_WELCOME_MESSAGE}</p>
          ) : null}
          {messages.length === 0 && !preferences.rafeeq.dailyGreeting ? (
            <p className="dr-voice-empty">آپ بول کر یا لکھ کر پوچھ سکتے ہیں۔</p>
          ) : null}
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

        {suggestions.length > 0 ? (
          <div className="dr-voice-suggestions" role="list" aria-label="تجویز کردہ سوالات">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                className="dr-voice-chip"
                role="listitem"
                disabled={busy}
                onClick={() => void handleTextAnswer(suggestion.text)}
              >
                {suggestion.text}
              </button>
            ))}
          </div>
        ) : null}

        {interimText ? (
          <p className="dr-voice-interim" aria-live="polite">
            {interimText}
          </p>
        ) : null}

        <footer className="dr-voice-footer">
          <button
            type="button"
            className={voiceClass}
            aria-label={micLabel}
            aria-pressed={phase === 'listening'}
            title={`${micLabel} (Alt+Space)`}
            onClick={() => void handleMicClick()}
            disabled={phase === 'thinking' || phase === 'speaking'}
          >
            <Icon name="mic" size="md" />
          </button>

          <form
            className="dr-voice-form"
            onSubmit={(event) => {
              event.preventDefault()
              void handleTextAnswer(input)
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
              disabled={busy}
            />
            <PrimaryButton type="submit" disabled={!input.trim() || busy}>
              بھیجیں
            </PrimaryButton>
          </form>
        </footer>

        {voiceNotice ? <p className="dr-voice-fallback">{voiceNotice}</p> : null}

        <p className="dr-voice-fallback dr-voice-hint">
          مائیک دبائیں، بات کریں، پھر دوبارہ دبائیں — رفیق سنے گا، سمجھے گا اور جواب بولے گا۔
        </p>

        <div className="dr-voice-footer-note">
          <SecondaryButton type="button" onClick={onClose}>
            بند کریں
          </SecondaryButton>
        </div>
      </aside>
    </div>
  )
}
