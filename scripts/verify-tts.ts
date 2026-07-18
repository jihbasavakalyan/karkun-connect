/**
 * KC-019.1 — Smoke-test Google TTS credentials + MP3 generation.
 * Usage: npx vite-node --env-file=.env.local scripts/verify-tts.ts
 */

import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { VoiceService } from '../src/server/voice/VoiceService'

async function main() {
  const path = process.env.GOOGLE_APPLICATION_CREDENTIALS
  const jsonEnv = process.env.GOOGLE_TTS_CREDENTIALS_JSON
  console.log(
    'Credential mode:',
    jsonEnv ? 'GOOGLE_TTS_CREDENTIALS_JSON' : path ? 'GOOGLE_APPLICATION_CREDENTIALS' : 'ADC/default',
  )
  if (path) console.log('Credentials path:', path)

  const service = new VoiceService()
  const started = Date.now()
  const sample = 'السلام علیکم۔ یہ ڈیجیٹل رفیق کی آواز کی جانچ ہے۔'
  const result = await service.generateSpeech({ text: sample })

  mkdirSync(resolve('.tts-cache'), { recursive: true })
  const out = resolve('.tts-cache', `verify-${Date.now()}.mp3`)
  writeFileSync(out, result.audio)

  console.log(
    JSON.stringify(
      {
        ok: true,
        provider: result.provider,
        voiceName: result.voiceName,
        languageCode: result.languageCode,
        cached: result.cached,
        generationMs: result.generationMs,
        audioBytes: result.audio.length,
        elapsedMs: Date.now() - started,
        samplePath: out,
      },
      null,
      2,
    ),
  )

  const again = await service.generateSpeech({ text: sample })
  console.log(JSON.stringify({ secondCallCached: again.cached, provider: again.provider }, null, 2))
}

main().catch((error) => {
  console.error('TTS verify failed:', error instanceof Error ? error.message : error)
  process.exit(1)
})
