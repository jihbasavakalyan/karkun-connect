/**
 * KC-019 / KC-027 — VoiceService: TTS generation + STT transcription.
 */

import { getCachedSpeech, hashSpeechKey, setCachedSpeech } from './cache/TtsAudioCache.js'
import { logTts } from './logging.js'
import { GoogleSTTProvider } from './providers/GoogleSTTProvider.js'
import { GoogleTTSProvider } from './providers/GoogleTTSProvider.js'
import {
  DEFAULT_MAX_STT_BYTES,
  DEFAULT_MAX_TTS_CHARS,
  DEFAULT_TTS_LANGUAGE,
  DEFAULT_TTS_PITCH,
  DEFAULT_TTS_SPEAKING_RATE,
  type GenerateSpeechInput,
  type GenerateSpeechResult,
  type SpeechToTextProvider,
  type TranscribeSpeechInput,
  type TranscribeSpeechResult,
  type VoiceProvider,
  type VoiceServiceOptions,
} from './types.js'

export class VoiceService {
  private readonly provider: VoiceProvider
  private readonly sttProvider: SpeechToTextProvider
  private readonly maxTextLength: number
  private readonly maxAudioBytes: number

  constructor(options: VoiceServiceOptions = {}) {
    this.provider = options.provider ?? new GoogleTTSProvider()
    this.sttProvider = options.sttProvider ?? new GoogleSTTProvider()
    this.maxTextLength = options.maxTextLength ?? DEFAULT_MAX_TTS_CHARS
    this.maxAudioBytes = options.maxAudioBytes ?? DEFAULT_MAX_STT_BYTES
  }

  async generateSpeech(input: GenerateSpeechInput): Promise<GenerateSpeechResult> {
    const text = input.text?.trim() ?? ''
    if (!text) {
      throw Object.assign(new Error('Text is required.'), { statusCode: 400, code: 'empty_text' })
    }
    if (text.length > this.maxTextLength) {
      throw Object.assign(new Error(`Text exceeds ${this.maxTextLength} characters.`), {
        statusCode: 400,
        code: 'text_too_long',
      })
    }

    const languageCode = input.languageCode ?? DEFAULT_TTS_LANGUAGE
    const speakingRate = input.speakingRate ?? DEFAULT_TTS_SPEAKING_RATE
    const pitch = input.pitch ?? DEFAULT_TTS_PITCH
    const voiceName = input.voiceName ?? 'auto'

    const cacheKey = hashSpeechKey({
      text,
      languageCode,
      voiceName,
      speakingRate,
      pitch,
      provider: this.provider.id,
    })

    const cached = getCachedSpeech(cacheKey)
    if (cached) {
      logTts({
        event: 'tts_cache',
        cache: 'hit',
        provider: cached.provider,
        voiceName: cached.voiceName,
        textLength: text.length,
      })
      return {
        audio: cached.audio,
        contentType: 'audio/mpeg',
        provider: cached.provider as GenerateSpeechResult['provider'],
        voiceName: cached.voiceName,
        languageCode: cached.languageCode,
        cached: true,
        generationMs: 0,
      }
    }

    logTts({
      event: 'tts_cache',
      cache: 'miss',
      provider: this.provider.id,
      textLength: text.length,
    })

    const started = Date.now()
    try {
      const result = await this.provider.generateSpeech({
        text,
        languageCode,
        voiceName: input.voiceName,
        speakingRate,
        pitch,
      })
      const generationMs = Date.now() - started

      setCachedSpeech(cacheKey, {
        audio: result.audio,
        contentType: 'audio/mpeg',
        voiceName: result.voiceName,
        languageCode: result.languageCode,
        provider: result.provider,
      })

      logTts({
        event: 'tts_generate',
        provider: result.provider,
        voiceName: result.voiceName,
        durationMs: generationMs,
        textLength: text.length,
        cache: 'miss',
      })

      return {
        ...result,
        cached: false,
        generationMs,
      }
    } catch (error) {
      logTts({
        event: 'tts_error',
        provider: this.provider.id,
        textLength: text.length,
        durationMs: Date.now() - started,
        errorCode: error instanceof Error ? error.message.slice(0, 80) : 'unknown',
      })
      throw error
    }
  }

  async transcribeSpeech(input: TranscribeSpeechInput): Promise<TranscribeSpeechResult> {
    if (!input.audio || input.audio.length === 0) {
      throw Object.assign(new Error('Audio is required.'), { statusCode: 400, code: 'empty_audio' })
    }
    if (input.audio.length > this.maxAudioBytes) {
      throw Object.assign(new Error('Audio exceeds size limit.'), {
        statusCode: 413,
        code: 'audio_too_large',
      })
    }

    const started = Date.now()
    try {
      const result = await this.sttProvider.transcribeSpeech(input)
      return {
        ...result,
        durationMs: Date.now() - started,
      }
    } catch (error) {
      logTts({
        event: 'tts_error',
        provider: this.sttProvider.id,
        durationMs: Date.now() - started,
        errorCode: error instanceof Error ? error.message.slice(0, 80) : 'stt_failed',
      })
      throw error
    }
  }
}

let sharedService: VoiceService | null = null

export function getVoiceService(): VoiceService {
  if (!sharedService) {
    sharedService = new VoiceService()
  }
  return sharedService
}

export function resetVoiceServiceForTests(): void {
  sharedService = null
}
