/**
 * KC-019 — Voice foundation exports (server-only).
 */

export { VoiceService, getVoiceService } from './VoiceService'
export { GoogleTTSProvider } from './providers/GoogleTTSProvider'
export { handleTtsRequest } from './httpHandler'
export {
  TTS_ERROR_MESSAGE_URDU,
  DEFAULT_TTS_LANGUAGE,
  DEFAULT_TTS_SPEAKING_RATE,
  DEFAULT_TTS_PITCH,
  URDU_VOICE_CANDIDATES,
} from './types'
export type {
  VoiceProvider,
  VoiceProviderId,
  GenerateSpeechInput,
  GenerateSpeechResult,
  VoiceServiceOptions,
} from './types'
