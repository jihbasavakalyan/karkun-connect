/**
 * KC-019 / KC-027 — Voice provider contracts (TTS + STT).
 */

export type VoiceProviderId = 'google' | 'azure' | 'elevenlabs' | 'browser'

export type GenerateSpeechInput = {
  text: string
  languageCode?: string
  voiceName?: string
  speakingRate?: number
  pitch?: number
}

export type GenerateSpeechResult = {
  audio: Buffer
  contentType: 'audio/mpeg'
  provider: VoiceProviderId
  voiceName: string
  languageCode: string
  cached: boolean
  generationMs: number
}

export type VoiceProvider = {
  readonly id: VoiceProviderId
  generateSpeech(input: GenerateSpeechInput): Promise<Omit<GenerateSpeechResult, 'cached' | 'generationMs'>>
}

export type TranscribeSpeechInput = {
  audio: Buffer
  contentType?: string
  languageCode?: string
  sampleRateHertz?: number
}

export type TranscribeSpeechResult = {
  transcript: string
  confidence?: number
  provider: VoiceProviderId
  languageCode: string
  durationMs: number
}

export type SpeechToTextProvider = {
  readonly id: VoiceProviderId
  transcribeSpeech(
    input: TranscribeSpeechInput,
  ): Promise<Omit<TranscribeSpeechResult, 'durationMs'>>
}

export type VoiceServiceOptions = {
  provider?: VoiceProvider
  sttProvider?: SpeechToTextProvider
  maxTextLength?: number
  maxAudioBytes?: number
}

export const TTS_ERROR_MESSAGE_URDU = 'آواز دستیاب نہیں، براہ کرم دوبارہ کوشش کریں۔'
export const STT_ERROR_MESSAGE_URDU = 'آواز سمجھ نہیں آئی، براہ کرم دوبارہ کوشش کریں۔'
export const STT_NO_SPEECH_MESSAGE_URDU = 'کوئی آواز نہیں سنائی دی۔ دوبارہ بول کر آزمائیں۔'
export const STT_MIC_DENIED_MESSAGE_URDU =
  'مائیک کی اجازت نہیں ملی۔ آپ لکھ کر بھی پوچھ سکتے ہیں۔'

export const DEFAULT_TTS_LANGUAGE = 'ur-PK'
export const DEFAULT_TTS_SPEAKING_RATE = 0.95
export const DEFAULT_TTS_PITCH = 0
export const DEFAULT_MAX_TTS_CHARS = 1200
export const DEFAULT_STT_LANGUAGE = 'ur-PK'
export const DEFAULT_MAX_STT_BYTES = 2_500_000
export const STT_LANGUAGE_ALTERNATIVES = ['ur-IN', 'en-IN'] as const

/** Preferred Urdu voices — Google currently publishes premium Urdu as ur-IN. */
export const URDU_VOICE_CANDIDATES = [
  { languageCode: 'ur-PK', name: 'ur-PK-Wavenet-A' },
  { languageCode: 'ur-PK', name: 'ur-PK-Standard-A' },
  { languageCode: 'ur-IN', name: 'ur-IN-Chirp3-HD-Achird' },
  { languageCode: 'ur-IN', name: 'ur-IN-Chirp3-HD-Enceladus' },
  { languageCode: 'ur-IN', name: 'ur-IN-Wavenet-B' },
  { languageCode: 'ur-IN', name: 'ur-IN-Wavenet-A' },
  { languageCode: 'ur-IN', name: 'ur-IN-Standard-B' },
  { languageCode: 'ur-IN', name: 'ur-IN-Standard-A' },
] as const
