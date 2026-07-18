/**
 * KC-019 — Voice foundation exports (server-only).
 */

export { VoiceService, getVoiceService } from './VoiceService.js'
export { GoogleTTSProvider } from './providers/GoogleTTSProvider.js'
export { handleTtsRequest } from './httpHandler.js'
export {
  TTS_ERROR_MESSAGE_URDU,
  DEFAULT_TTS_LANGUAGE,
  DEFAULT_TTS_SPEAKING_RATE,
  DEFAULT_TTS_PITCH,
  URDU_VOICE_CANDIDATES,
} from './types.js'
export type {
  VoiceProvider,
  VoiceProviderId,
  GenerateSpeechInput,
  GenerateSpeechResult,
  VoiceServiceOptions,
} from './types.js'
