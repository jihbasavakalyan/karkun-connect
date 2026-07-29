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
  type OpsAnswerMetric,
} from './opsAnswers'
import { runRafeeqTurn, getOrCreateSession, hydrateRecentSearches } from '@/conversation/mvp'
import { RAFEEQ_A11Y } from '@/conversation/mvp/v2/accessibility'
import { RAFEEQ_UX } from '@/conversation/mvp/v2/uxPolish'
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
  requiresConfirmation?: boolean
  summaryTitle?: string
  metrics?: OpsAnswerMetric[]
  insights?: string[]
  why?: string[]
  contextualSuggestions?: string[]
  executionResult?: 'success' | 'cancelled' | 'failed'
  executionMessage?: string
}

const SEARCH_SUGGESTIONS = [
  'Find Aslam',
  'Open Dashboard',
  'Go to Registry',
  'How is the campaign progressing?',
  'How many visits are pending?',
  'Show Weekly Ijtema progress',
]

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
          تلاش ہو رہی ہے…
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
      requiresConfirmation: turn.requiresConfirmation,
      summaryTitle: turn.summaryTitle,
      metrics: turn.metrics,
      insights: turn.insights,
      why: turn.why,
      contextualSuggestions: turn.contextualSuggestions,
      executionResult: turn.executionResult,
      executionMessage: turn.executionMessage,
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
  const lastSubmitAtRef = useRef(0)
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

  const mvpSessionId = useMemo(() => `rafeeq-drawer-${role}`, [role])

  const recentSearchChips = useMemo(() => {
    const session = getOrCreateSession(mvpSessionId)
    return session.recentSearches.slice(0, 4)
  }, [mvpSessionId, messages.length])

  useEffect(() => {
    if (!open) return
    hydrateRecentSearches(getOrCreateSession(mvpSessionId), role)
  }, [open, mvpSessionId, role])

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

    const turn = runRafeeqTurn(query, {
      role,
      ruknId: ruknId ?? null,
      locale: 'ur',
      sessionId: mvpSessionId,
    })

    if (!turn.usedFallback && turn.text) {
      const intel = turn.metadata['campaignIntelligence'] as
        | {
            title?: string
            metrics?: OpsAnswerMetric[]
            insights?: string[]
          }
        | null
        | undefined
      return {
        text: turn.text,
        actions: [...turn.actions],
        requiresConfirmation: turn.requiresConfirmation,
        summaryTitle:
          (turn.metadata['summaryTitle'] as string | undefined) ??
          intel?.title,
        metrics:
          (turn.metadata['metrics'] as OpsAnswerMetric[] | undefined) ??
          intel?.metrics,
        insights:
          (turn.metadata['insights'] as string[] | undefined) ?? intel?.insights,
        why: (
          (turn.metadata['explainability'] as Array<{ label: string }> | undefined) ??
          []
        ).map((r) => r.label),
        contextualSuggestions:
          (turn.metadata['contextualSuggestions'] as string[] | undefined) ?? [],
        executionResult: turn.metadata['executionResult'] as
          | 'success'
          | 'cancelled'
          | 'failed'
          | undefined,
        executionMessage: turn.metadata['executionMessage'] as string | undefined,
      }
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
    const now = Date.now()
    if (now - lastSubmitAtRef.current < 400) return
    lastSubmitAtRef.current = now
    setInput('')
    await conversation.converseFromText(trimmed, answerFn, { speakReply: false })
  }

  const handleMicClick = async () => {
    if (phase === 'listening') {
      setBusy(true)
      await conversation.finishListeningAndConverse(answerFn)
      return
    }
    if (busy) {
      const statusNotice =
        phase === 'thinking'
          ? 'سوچ رہے ہیں…'
          : phase === 'speaking'
            ? 'بول رہے ہیں…'
            : 'رفیق مصروف ہے۔ ذرا انتظار کریں۔'
      setVoiceNotice(statusNotice)
      return
    }
    stopCloudSpeech()
    stopLocalSpeech()
    try {
      await conversation.startListening(answerFn)
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
        className={`dr-voice-drawer urdu-text ${RAFEEQ_UX.responsiveDrawerClass} ${RAFEEQ_UX.transitionClass}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-label={RAFEEQ_A11Y.drawerLabel}
        dir={RAFEEQ_UX.urduDir}
        lang={RAFEEQ_UX.urduLang}
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
            <p className="dr-voice-empty">{RAFEEQ_UX.emptyBodyUr}</p>
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
              {message.summaryTitle && message.metrics && message.metrics.length > 0 ? (
                <div className="dr-voice-summary-card" role="region" aria-label={message.summaryTitle}>
                  <p className="dr-voice-summary-title">{message.summaryTitle}</p>
                  <ul className="dr-voice-metric-list">
                    {message.metrics.map((metric) => (
                      <li
                        key={metric.id}
                        className={`dr-voice-metric-row status-${metric.status ?? 'steady'}`}
                      >
                        <span className="dr-voice-metric-label">{metric.label}</span>
                        <span className="dr-voice-metric-value">{metric.value}</span>
                        <span
                          className={`dr-voice-metric-status status-${metric.status ?? 'steady'}`}
                          aria-hidden="true"
                        />
                      </li>
                    ))}
                  </ul>
                  {message.insights && message.insights.length > 0 ? (
                    <p className="dr-voice-insight">{message.insights[0]}</p>
                  ) : null}
                </div>
              ) : null}
              {message.why && message.why.length > 0 ? (
                <ul className="dr-voice-why" aria-label="Why">
                  {message.why.slice(0, 4).map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              ) : null}
              {message.contextualSuggestions &&
              message.contextualSuggestions.length > 0 ? (
                <div className="dr-voice-suggestions" role="list" aria-label="Suggested next steps">
                  {message.contextualSuggestions.slice(0, 6).map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      className="dr-voice-chip"
                      role="listitem"
                      disabled={busy}
                      onClick={() => void handleTextAnswer(sug)}
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              ) : null}
              {message.executionResult ? (
                <p
                  className={`dr-voice-execution-result status-${message.executionResult}`}
                  role="status"
                >
                  {message.executionMessage ??
                    (message.executionResult === 'success'
                      ? '✓ Action completed'
                      : message.executionResult === 'cancelled'
                        ? 'عمل منسوخ'
                        : 'عمل ناکام')}
                </p>
              ) : null}
              {message.requiresConfirmation ? (
                <p className="dr-voice-confirm-note" role="status">
                  تصدیق درکار: Confirm دبائیں یا Cancel کریں۔
                </p>
              ) : null}
              {message.actions && message.actions.length > 0 && (
                <div className="dr-voice-results" role="list">
                  {message.actions.map((action) => {
                    const confirmRole = action.confirmRole
                    if (confirmRole === 'cancel' || action.route.startsWith('?rafeeqCancel')) {
                      return (
                        <button
                          key={action.id}
                          type="button"
                          className="dr-voice-action dr-voice-action-cancel"
                          role="listitem"
                          disabled={busy}
                          onClick={() => void handleTextAnswer('Cancel')}
                        >
                          {action.label}
                        </button>
                      )
                    }
                    if (
                      confirmRole === 'followup' ||
                      action.route.startsWith('?rafeeq=')
                    ) {
                      const query = action.route.startsWith('?rafeeq=')
                        ? decodeURIComponent(action.route.slice('?rafeeq='.length))
                        : action.label
                      return (
                        <button
                          key={action.id}
                          type="button"
                          className="dr-voice-chip"
                          role="listitem"
                          disabled={busy}
                          onClick={() => void handleTextAnswer(query)}
                        >
                          {action.label}
                        </button>
                      )
                    }
                    if (confirmRole === 'confirm' && action.route.startsWith('?rafeeqConfirm')) {
                      return (
                        <button
                          key={action.id}
                          type="button"
                          className="dr-voice-action dr-voice-action-confirm"
                          role="listitem"
                          disabled={busy}
                          onClick={() => void handleTextAnswer('Confirm')}
                        >
                          {action.label}
                        </button>
                      )
                    }
                    const external =
                      /^(tel:|sms:|https?:|mailto:)/i.test(action.route) ||
                      action.route.startsWith('//')
                    const rich = Boolean(action.entityType || action.description)
                    const openLabel =
                      action.primaryActionLabel ??
                      (confirmRole === 'confirm' ? 'Confirm' : 'کھولیں')
                    const onConfirmLaunch = () => {
                      if (confirmRole === 'confirm') {
                        void handleTextAnswer('Confirm')
                      }
                      if (!external || confirmRole === 'confirm') {
                        // Confirm with tel/wa still navigates via href; also clear pending.
                      }
                      if (!external) onClose()
                    }
                    if (rich || confirmRole === 'confirm' || confirmRole === 'alternative') {
                      const cardClass =
                        confirmRole === 'confirm'
                          ? 'dr-voice-result-card dr-voice-result-card-confirm'
                          : 'dr-voice-result-card'
                      const body = (
                        <>
                          {action.entityType ? (
                            <span className="dr-voice-result-type">{action.entityType}</span>
                          ) : null}
                          <span className="dr-voice-result-name">{action.label}</span>
                          {action.description ? (
                            <span className="dr-voice-result-desc">{action.description}</span>
                          ) : null}
                          <span className="dr-voice-result-cta">{openLabel}</span>
                        </>
                      )
                      if (external) {
                        return (
                          <a
                            key={action.id}
                            href={action.route}
                            className={cardClass}
                            role="listitem"
                            target={action.route.startsWith('http') ? '_blank' : undefined}
                            rel={action.route.startsWith('http') ? 'noreferrer' : undefined}
                            onClick={() => {
                              if (confirmRole === 'confirm') void handleTextAnswer('Confirm')
                              if (action.route.startsWith('http')) onClose()
                            }}
                          >
                            {body}
                          </a>
                        )
                      }
                      return (
                        <Link
                          key={action.id}
                          to={action.route}
                          className={cardClass}
                          role="listitem"
                          onClick={onConfirmLaunch}
                        >
                          {body}
                        </Link>
                      )
                    }
                    const actionClass = message.requiresConfirmation
                      ? 'dr-voice-action dr-voice-action-confirm'
                      : 'dr-voice-action'
                    if (external) {
                      return (
                        <a
                          key={action.id}
                          href={action.route}
                          className={actionClass}
                          target={action.route.startsWith('http') ? '_blank' : undefined}
                          rel={action.route.startsWith('http') ? 'noreferrer' : undefined}
                          onClick={onClose}
                        >
                          {action.label}
                        </a>
                      )
                    }
                    return (
                      <Link
                        key={action.id}
                        to={action.route}
                        className={actionClass}
                        onClick={onClose}
                      >
                        {action.label}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {recentSearchChips.length > 0 ? (
          <div className="dr-voice-suggestions" role="list" aria-label="حالیہ تلاش">
            {recentSearchChips.map((chip) => (
              <button
                key={`recent-${chip}`}
                type="button"
                className="dr-voice-chip"
                disabled={busy}
                onClick={() => void handleTextAnswer(`Find ${chip}`)}
              >
                {chip}
              </button>
            ))}
          </div>
        ) : null}

        {messages.length === 0 ? (
          <div className="dr-voice-suggestions" role="list" aria-label="تجویز کردہ تلاش">
            {SEARCH_SUGGESTIONS.map((text) => (
              <button
                key={text}
                type="button"
                className="dr-voice-chip"
                disabled={busy}
                onClick={() => void handleTextAnswer(text)}
              >
                {text}
              </button>
            ))}
          </div>
        ) : null}

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
              aria-label={RAFEEQ_A11Y.inputLabel}
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

        {phase === 'error' ? (
          <div className="dr-voice-error-recovery" role="alert">
            <p className="dr-voice-fallback">جواب نہیں مل سکا۔ دوبارہ کوشش کریں۔</p>
            <SecondaryButton
              type="button"
              disabled={busy}
              onClick={() => void handleTextAnswer('Help')}
            >
              مدد
            </SecondaryButton>
          </div>
        ) : null}

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
