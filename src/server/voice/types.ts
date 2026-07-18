/**
 * KC-019 — Voice provider contracts (TTS foundation).
 * Future: STT, streaming, multi-language, provider switching.
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

export type VoiceServiceOptions = {
  provider?: VoiceProvider
  maxTextLength?: number
}

export const TTS_ERROR_MESSAGE_URDU = 'آواز دستیاب نہیں، براہ کرم دوبارہ کوشش کریں۔'

export const DEFAULT_TTS_LANGUAGE = 'ur-PK'
export const DEFAULT_TTS_SPEAKING_RATE = 0.95
export const DEFAULT_TTS_PITCH = 0
export const DEFAULT_MAX_TTS_CHARS = 1200

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
