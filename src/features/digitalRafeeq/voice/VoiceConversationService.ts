/**
 * KC-027 — VoiceConversationService
 *
 * Pipeline only (no business logic):
 * Record → Transcribe (Google STT, browser fallback) → Intelligence → TTS → history
 */

import { transcribeCloudAudio } from './cloudSpeechRecognition'
import { speakRafeeqCloudText, stopCloudSpeech } from './cloudSpeechPlayback'
import { createMicRecorder, type MicRecorderStatus } from './micRecorder'
import {
  STT_ERROR_MESSAGE_URDU,
  STT_MIC_DENIED_MESSAGE_URDU,
  STT_NO_SPEECH_MESSAGE_URDU,
} from './ttsMessages'
import { getUserPreferences } from '@/stores/userPreferencesStore'
import type { OpsAnswer, OpsAnswerAction } from './opsAnswers'
import {
  patchPipelineDiag,
  recordPipelineStage,
  voicePipelineLog,
} from './voicePipelineDiag'

export type ConversationPhase =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'ready'
  | 'error'

export type VoiceConversationTurn = {
  id: string
  userSpeechRecognized: string
  rafeeqResponse: string
  actions?: OpsAnswerAction[]
  requiresConfirmation?: boolean
  summaryTitle?: string
  metrics?: OpsAnswer['metrics']
  insights?: string[]
  why?: string[]
  contextualSuggestions?: string[]
  executionResult?: OpsAnswer['executionResult']
  executionMessage?: string
  timestamp: string
  source: 'voice' | 'text'
}

export type VoiceConversationState = {
  phase: ConversationPhase
  interimRecognizedText: string
  notice: string
  history: VoiceConversationTurn[]
  micStatus: MicRecorderStatus
  sttMode: 'google' | 'browser'
}

export type AnswerFn = (query: string) => Promise<OpsAnswer> | OpsAnswer

type Listener = (state: VoiceConversationState) => void

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: {
    resultIndex: number
    results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>
  }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
}

function getBrowserSpeechCtor(): (new () => SpeechRecognitionLike) | undefined {
  if (typeof window === 'undefined') return undefined
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

function friendlyError(error: unknown): string {
  if (!error || typeof error !== 'object') return STT_ERROR_MESSAGE_URDU
  const code = 'code' in error ? String((error as { code?: string }).code) : ''
  if (code === 'denied') return STT_MIC_DENIED_MESSAGE_URDU
  if (code === 'unsupported') {
    return 'اس آلے میں مائیک دستیاب نہیں۔ آپ لکھ کر پوچھ سکتے ہیں۔'
  }
  if ('userMessage' in error && typeof (error as { userMessage?: string }).userMessage === 'string') {
    return (error as { userMessage: string }).userMessage
  }
  if (error instanceof Error && error.message) {
    if (/no.speech|no_speech/i.test(error.message)) return STT_NO_SPEECH_MESSAGE_URDU
    if (/network|fetch|failed/i.test(error.message)) {
      return 'رابطہ منقطع ہو گیا۔ دوبارہ کوشش کریں۔'
    }
  }
  return STT_ERROR_MESSAGE_URDU
}

export class VoiceConversationService {
  private phase: ConversationPhase = 'idle'
  private interimRecognizedText = ''
  private notice = ''
  private history: VoiceConversationTurn[] = []
  private micStatus: MicRecorderStatus = 'idle'
  private preferBrowserStt = false
  private browserFinal = ''
  private browserRecognition: SpeechRecognitionLike | null = null
  private pendingAnswer: AnswerFn | null = null
  private completionInFlight = false
  private readonly listeners = new Set<Listener>()
  private readonly recorder = createMicRecorder({
    silenceMs: 1800,
    maxDurationMs: 20_000,
    onStatus: (status) => {
      this.micStatus = status
      this.emit()
    },
    onSilenceStop: () => {
      this.requestListeningCompletion()
    },
  })
  private turnToken = 0
  private abort: AbortController | null = null

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    listener(this.snapshot())
    return () => {
      this.listeners.delete(listener)
    }
  }

  snapshot(): VoiceConversationState {
    return {
      phase: this.phase,
      interimRecognizedText: this.interimRecognizedText,
      notice: this.notice,
      history: [...this.history],
      micStatus: this.micStatus,
      sttMode: this.preferBrowserStt ? 'browser' : 'google',
    }
  }

  clearHistory(): void {
    this.history = []
    this.emit()
  }

  stopAll(): void {
    this.turnToken += 1
    this.abort?.abort()
    this.abort = null
    this.completionInFlight = false
    this.pendingAnswer = null
    this.recorder.cancel()
    this.stopBrowserRecognition()
    stopCloudSpeech()
    this.phase = 'idle'
    this.interimRecognizedText = ''
    this.emit()
  }

  /**
   * Push-to-talk: start listening.
   * Pass `answer` so silence / browser-end auto-complete can reuse finishListeningAndConverse.
   */
  async startListening(answer?: AnswerFn): Promise<void> {
    if (answer) this.pendingAnswer = answer
    this.completionInFlight = false
    this.notice = ''
    this.interimRecognizedText = ''
    this.browserFinal = ''
    this.phase = 'listening'
    this.emit()
    voicePipelineLog('stt:listening_start', {
      mode: this.preferBrowserStt ? 'browser' : 'google',
    })

    if (this.preferBrowserStt) {
      this.startBrowserRecognition()
      return
    }

    try {
      await this.recorder.start()
      voicePipelineLog('stt:recording_started', { micStatus: this.micStatus })
    } catch (error) {
      // Fall back to browser STT when MediaRecorder/mic path is unavailable.
      const ctor = getBrowserSpeechCtor()
      if (ctor) {
        this.preferBrowserStt = true
        this.notice = 'مقامی آواز کی پہچان استعمال ہو رہی ہے۔'
        this.startBrowserRecognition()
        this.emit()
        return
      }
      this.phase = 'error'
      this.notice = friendlyError(error)
      recordPipelineStage({
        stage: 'speech_to_text',
        stageInput: { phase: 'start' },
        stageOutput: null,
        success: false,
        failure: friendlyError(error),
        startedAt: Date.now(),
      })
      this.emit()
      throw error
    }
  }

  /**
   * Single completion pipeline: stop mic, transcribe, answer via intelligence, speak reply.
   * Used by manual mic click, silence auto-stop, and browser SpeechRecognition onend.
   */
  async finishListeningAndConverse(answer: AnswerFn): Promise<VoiceConversationTurn | null> {
    if (this.completionInFlight) return null
    this.completionInFlight = true
    this.pendingAnswer = answer

    try {
      const token = ++this.turnToken
      this.abort?.abort()
      this.abort = new AbortController()

      if (this.preferBrowserStt) {
        this.stopBrowserRecognition()
        const transcript = this.browserFinal.trim()
        if (!transcript) {
          this.phase = 'error'
          this.notice = STT_NO_SPEECH_MESSAGE_URDU
          recordPipelineStage({
            stage: 'speech_to_text',
            stageInput: { mode: 'browser' },
            stageOutput: null,
            success: false,
            failure: 'silence_or_empty',
            startedAt: Date.now(),
          })
          this.emit()
          return null
        }
        this.phase = 'thinking'
        this.interimRecognizedText = transcript
        recordPipelineStage({
          stage: 'speech_to_text',
          stageInput: { mode: 'browser' },
          stageOutput: { transcript },
          success: true,
          startedAt: Date.now(),
        })
        this.emit()
        return await this.runIntelligenceTurn({
          transcript,
          answer,
          source: 'voice',
          token,
          speakReply: true,
        })
      }

      let audio: Blob | null = null
      const sttStarted = Date.now()
      try {
        audio = await this.recorder.stop()
        voicePipelineLog('stt:recording_stopped', { size: audio?.size ?? 0 })
      } catch (error) {
        this.phase = 'error'
        this.notice = friendlyError(error)
        recordPipelineStage({
          stage: 'speech_to_text',
          stageInput: { mode: 'google' },
          stageOutput: null,
          success: false,
          failure: friendlyError(error),
          startedAt: sttStarted,
        })
        this.emit()
        return null
      }

      if (token !== this.turnToken) return null
      if (!audio || audio.size < 256) {
        this.phase = 'error'
        this.notice = STT_NO_SPEECH_MESSAGE_URDU
        recordPipelineStage({
          stage: 'speech_to_text',
          stageInput: { mode: 'google', audioSize: audio?.size ?? 0 },
          stageOutput: null,
          success: false,
          failure: 'silence_or_empty',
          startedAt: sttStarted,
        })
        this.emit()
        return null
      }

      this.phase = 'thinking'
      this.interimRecognizedText = 'آواز پہچانی جا رہی ہے…'
      this.emit()

      let transcript = ''
      try {
        const result = await transcribeCloudAudio(audio, {
          languageCode: 'ur-PK',
          signal: this.abort.signal,
        })
        transcript = result.transcript.trim()
      } catch (error) {
        if (token !== this.turnToken) return null
        // Switch to browser STT for subsequent turns when Google STT is unavailable.
        this.preferBrowserStt = true
        this.phase = 'error'
        this.notice =
          'کلاؤڈ سننے کا نظام ابھی دستیاب نہیں۔ دوبارہ مائیک دبائیں — مقامی پہچان استعمال ہوگی۔'
        this.interimRecognizedText = ''
        audio = null
        recordPipelineStage({
          stage: 'speech_to_text',
          stageInput: { mode: 'google' },
          stageOutput: null,
          success: false,
          failure: friendlyError(error),
          startedAt: sttStarted,
        })
        this.emit()
        void error
        return null
      }

      audio = null

      if (token !== this.turnToken) return null
      if (!transcript) {
        this.phase = 'error'
        this.notice = STT_NO_SPEECH_MESSAGE_URDU
        this.interimRecognizedText = ''
        recordPipelineStage({
          stage: 'speech_to_text',
          stageInput: { mode: 'google' },
          stageOutput: null,
          success: false,
          failure: 'empty_transcript',
          startedAt: sttStarted,
        })
        this.emit()
        return null
      }

      recordPipelineStage({
        stage: 'speech_to_text',
        stageInput: { mode: 'google' },
        stageOutput: { transcript },
        success: true,
        startedAt: sttStarted,
      })
      this.interimRecognizedText = transcript
      this.emit()

      return await this.runIntelligenceTurn({
        transcript,
        answer,
        source: 'voice',
        token,
        speakReply: true,
      })
    } finally {
      this.completionInFlight = false
    }
  }

  async converseFromText(
    text: string,
    answer: AnswerFn,
    options?: { speakReply?: boolean },
  ): Promise<VoiceConversationTurn | null> {
    const token = ++this.turnToken
    const trimmed = text.trim()
    if (!trimmed) return null
    this.notice = ''
    this.interimRecognizedText = trimmed
    this.phase = 'thinking'
    this.emit()
    return this.runIntelligenceTurn({
      transcript: trimmed,
      answer,
      source: 'text',
      token,
      speakReply: options?.speakReply ?? false,
    })
  }

  /** Auto-complete from silence / browser onend — same pipeline as manual mic stop. */
  private requestListeningCompletion(): void {
    if (this.completionInFlight || this.phase !== 'listening') return
    const answer = this.pendingAnswer
    if (!answer) {
      this.phase = 'idle'
      this.notice = 'سننا مکمل نہیں ہو سکا۔ دوبارہ مائیک دبائیں۔'
      this.emit()
      return
    }
    void this.finishListeningAndConverse(answer)
  }

  private startBrowserRecognition(): void {
    const Ctor = getBrowserSpeechCtor()
    if (!Ctor) {
      this.phase = 'error'
      this.notice = 'اس براؤزر میں آواز کی پہچان دستیاب نہیں۔ سوال لکھ کر بھیجیں۔'
      this.emit()
      return
    }

    this.stopBrowserRecognition()
    const recognition = new Ctor()
    recognition.lang = 'ur-IN'
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      let interim = ''
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const transcript = result[0]?.transcript ?? ''
        if (result.isFinal) finalText += transcript
        else interim += transcript
      }
      if (interim) this.interimRecognizedText = interim
      if (finalText.trim()) {
        this.browserFinal = finalText.trim()
        this.interimRecognizedText = this.browserFinal
      }
      this.emit()
    }
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.phase = 'error'
        this.notice = STT_MIC_DENIED_MESSAGE_URDU
        this.emit()
      } else if (event.error !== 'aborted' && event.error !== 'no-speech') {
        this.phase = 'error'
        this.notice = STT_ERROR_MESSAGE_URDU
        this.emit()
      }
    }
    recognition.onend = () => {
      if (this.completionInFlight) return
      if (this.phase !== 'listening') return
      if (this.browserFinal.trim() && this.pendingAnswer) {
        this.requestListeningCompletion()
        return
      }
      this.phase = 'idle'
      this.micStatus = 'idle'
      if (!this.browserFinal.trim()) {
        this.notice = STT_NO_SPEECH_MESSAGE_URDU
      }
      this.emit()
    }
    this.browserRecognition = recognition
    this.micStatus = 'recording'
    try {
      recognition.start()
    } catch {
      this.phase = 'error'
      this.notice = STT_ERROR_MESSAGE_URDU
      this.emit()
    }
  }

  private stopBrowserRecognition(): void {
    try {
      this.browserRecognition?.stop()
    } catch {
      // ignore
    }
    try {
      this.browserRecognition?.abort()
    } catch {
      // ignore
    }
    this.browserRecognition = null
    this.micStatus = 'idle'
  }

  private async runIntelligenceTurn(input: {
    transcript: string
    answer: AnswerFn
    source: 'voice' | 'text'
    token: number
    speakReply: boolean
  }): Promise<VoiceConversationTurn | null> {
    let ops: OpsAnswer
    try {
      ops = await input.answer(input.transcript)
    } catch {
      if (input.token !== this.turnToken) return null
      this.phase = 'error'
      this.notice = 'جواب تیار نہیں ہو سکا۔ دوبارہ کوشش کریں۔'
      this.emit()
      return null
    }

    if (input.token !== this.turnToken) return null

    const turn: VoiceConversationTurn = {
      id: `turn-${Date.now()}`,
      userSpeechRecognized: input.transcript,
      rafeeqResponse: ops.text,
      actions: ops.actions,
      requiresConfirmation: ops.requiresConfirmation,
      summaryTitle: ops.summaryTitle,
      metrics: ops.metrics,
      insights: ops.insights,
      why: ops.why,
      contextualSuggestions: ops.contextualSuggestions,
      executionResult: ops.executionResult,
      executionMessage: ops.executionMessage,
      timestamp: new Date().toISOString(),
      source: input.source,
    }
    this.history = [...this.history, turn]
    this.interimRecognizedText = ''
    this.emit()

    const prefs = getUserPreferences().rafeeq
    const shouldSpeak = input.speakReply && prefs.voiceResponses
    if (shouldSpeak) {
      this.phase = 'speaking'
      patchPipelineDiag({ ttsStatus: 'speaking' })
      this.emit()
      const ttsStarted = Date.now()
      try {
        await speakRafeeqCloudText(ops.text)
        recordPipelineStage({
          stage: 'text_to_speech',
          stageInput: { textLength: ops.text.length },
          stageOutput: { played: true },
          success: true,
          startedAt: ttsStarted,
        })
        patchPipelineDiag({ ttsStatus: 'done' })
      } catch (error) {
        const message = friendlyError(error)
        this.notice = message
        const interrupted =
          error instanceof Error &&
          (/abort|interrupt/i.test(error.message) || error.name === 'AbortError')
        recordPipelineStage({
          stage: 'text_to_speech',
          stageInput: { textLength: ops.text.length },
          stageOutput: null,
          success: false,
          failure: interrupted ? 'interrupted' : message,
          startedAt: ttsStarted,
        })
        patchPipelineDiag({
          ttsStatus: interrupted ? 'interrupted' : 'failed',
        })
      }
    } else {
      patchPipelineDiag({ ttsStatus: 'skipped' })
      recordPipelineStage({
        stage: 'text_to_speech',
        stageInput: { speakReply: input.speakReply, voiceResponses: prefs.voiceResponses },
        stageOutput: { skipped: true },
        success: true,
        startedAt: Date.now(),
      })
    }

    if (input.token !== this.turnToken) return turn
    this.phase = 'ready'
    this.emit()
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        if (this.turnToken === input.token && this.phase === 'ready') {
          this.phase = 'idle'
          this.emit()
        }
      }, 600)
    } else {
      this.phase = 'idle'
      this.emit()
    }
    return turn
  }

  private emit(): void {
    const snap = this.snapshot()
    for (const listener of this.listeners) listener(snap)
  }
}

export function createVoiceConversationService(): VoiceConversationService {
  return new VoiceConversationService()
}
