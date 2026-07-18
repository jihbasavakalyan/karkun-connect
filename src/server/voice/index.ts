/**
 * KC-019 / KC-027 — Voice foundation exports (server-only).
 */

export { VoiceService, getVoiceService, resetVoiceServiceForTests } from './VoiceService.js'
export { GoogleTTSProvider } from './providers/GoogleTTSProvider.js'
export { GoogleSTTProvider } from './providers/GoogleSTTProvider.js'
export { handleTtsRequest } from './httpHandler.js'
export { handleSttRequest } from './sttHttpHandler.js'
export {
  TTS_ERROR_MESSAGE_URDU,
  STT_ERROR_MESSAGE_URDU,
  STT_NO_SPEECH_MESSAGE_URDU,
  STT_MIC_DENIED_MESSAGE_URDU,
  DEFAULT_TTS_LANGUAGE,
  DEFAULT_TTS_SPEAKING_RATE,
  DEFAULT_TTS_PITCH,
  DEFAULT_STT_LANGUAGE,
  URDU_VOICE_CANDIDATES,
} from './types.js'
export type {
  VoiceProvider,
  VoiceProviderId,
  SpeechToTextProvider,
  GenerateSpeechInput,
  GenerateSpeechResult,
  TranscribeSpeechInput,
  TranscribeSpeechResult,
  VoiceServiceOptions,
} from './types.js'
