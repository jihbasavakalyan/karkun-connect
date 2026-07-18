/**
 * KC-019 — Safe TTS logging (no credentials, no PII payloads).
 */

export type TtsLogEvent = {
  event: 'tts_generate' | 'tts_cache' | 'tts_error'
  provider?: string
  cache?: 'hit' | 'miss'
  durationMs?: number
  textLength?: number
  voiceName?: string
  errorCode?: string
}

export function logTts(event: TtsLogEvent): void {
  const line = {
    scope: 'digital-rafeeq-tts',
    ts: new Date().toISOString(),
    ...event,
  }
  if (event.event === 'tts_error') {
    console.error(JSON.stringify(line))
    return
  }
  console.info(JSON.stringify(line))
}
