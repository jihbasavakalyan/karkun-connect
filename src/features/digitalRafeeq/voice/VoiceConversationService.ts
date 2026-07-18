/**
 * KC-027 — VoiceConversationService
 *
 * Pipeline only (no business logic):
 * Record → Transcribe → Intelligence answer → TTS playback → session history
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
  timestamp: string
  source: 'voice' | 'text'
}

export type VoiceConversationState = {
  phase: ConversationPhase
  interimRecognizedText: string
  notice: string
  history: VoiceConversationTurn[]
  micStatus: MicRecorderStatus
}

export type AnswerFn = (query: string) => Promise<OpsAnswer> | OpsAnswer

type Listener = (state: VoiceConversationState) => void

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
  private readonly listeners = new Set<Listener>()
  private readonly recorder = createMicRecorder({
    silenceMs: 1800,
    maxDurationMs: 20_000,
    onStatus: (status) => {
      this.micStatus = status
      this.emit()
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
    this.recorder.cancel()
    stopCloudSpeech()
    this.phase = 'idle'
    this.interimRecognizedText = ''
    this.emit()
  }

  /** Push-to-talk: start listening (Google STT after stop). */
  async startListening(): Promise<void> {
    this.notice = ''
    this.interimRecognizedText = ''
    this.phase = 'listening'
    this.emit()
    try {
      await this.recorder.start()
    } catch (error) {
      this.phase = 'error'
      this.notice = friendlyError(error)
      this.emit()
      throw error
    }
  }

  /**
   * Stop mic, transcribe via Google STT, answer via intelligence, speak reply.
   */
  async finishListeningAndConverse(answer: AnswerFn): Promise<VoiceConversationTurn | null> {
    const token = ++this.turnToken
    this.abort?.abort()
    this.abort = new AbortController()

    let audio: Blob | null = null
    try {
      audio = await this.recorder.stop()
    } catch (error) {
      this.phase = 'error'
      this.notice = friendlyError(error)
      this.emit()
      return null
    }

    if (token !== this.turnToken) return null
    if (!audio || audio.size < 256) {
      this.phase = 'error'
      this.notice = STT_NO_SPEECH_MESSAGE_URDU
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
      this.phase = 'error'
      this.notice = friendlyError(error)
      this.interimRecognizedText = ''
      this.emit()
      return null
    }

    // Discard audio reference immediately after transcription.
    audio = null

    if (token !== this.turnToken) return null
    if (!transcript) {
      this.phase = 'error'
      this.notice = STT_NO_SPEECH_MESSAGE_URDU
      this.interimRecognizedText = ''
      this.emit()
      return null
    }

    this.interimRecognizedText = transcript
    this.emit()

    return this.runIntelligenceTurn({
      transcript,
      answer,
      source: 'voice',
      token,
      speakReply: true,
    })
  }

  /** Text / chip path — same intelligence, optional spoken reply. */
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
      this.emit()
      try {
        await speakRafeeqCloudText(ops.text)
      } catch (error) {
        this.notice = friendlyError(error)
      }
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
