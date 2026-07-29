/**
 * Module 17 — Voice Ready
 * Interfaces only. Reuse existing TTS. No speech recognition implementation here.
 */

/** Playback contract — satisfied by existing VoiceConversationService / TTS helpers */
export type RafeeqVoicePlayback = {
  readonly speak: (text: string, options?: { locale?: 'ur' | 'en' }) => Promise<void>
  readonly stop: () => void
  readonly isSpeaking: () => boolean
}

/** Recognition contract — implementers live in features/digitalRafeeq/voice */
export type RafeeqVoiceRecognition = {
  readonly start: () => Promise<void>
  readonly stop: () => Promise<void>
  readonly isListening: () => boolean
}

export type RafeeqVoiceReadySurface = {
  readonly playback: RafeeqVoicePlayback | null
  readonly recognition: RafeeqVoiceRecognition | null
  readonly supportsTts: boolean
  readonly supportsStt: boolean
  /** Architecture prepared; STT implementation is out of scope for this module */
  readonly recognitionImplementation: 'external_existing' | 'none'
}

/**
 * Factory that only exposes readiness metadata — does not create STT engines.
 */
export function createVoiceReadySurface(options?: {
  playback?: RafeeqVoicePlayback | null
  recognition?: RafeeqVoiceRecognition | null
}): RafeeqVoiceReadySurface {
  return Object.freeze({
    playback: options?.playback ?? null,
    recognition: options?.recognition ?? null,
    supportsTts: Boolean(options?.playback),
    supportsStt: Boolean(options?.recognition),
    recognitionImplementation: options?.recognition
      ? 'external_existing'
      : 'none',
  })
}

export const VOICE_READY_NOTES = Object.freeze({
  tts: 'Reuse existing Digital Rafeeq TTS (cloudSpeechPlayback / speechPlayback)',
  stt: 'No new speech recognition in v2 — wire existing VoiceConversationService',
  bargeIn: 'Interrupt via playback.stop() using existing helpers',
})
