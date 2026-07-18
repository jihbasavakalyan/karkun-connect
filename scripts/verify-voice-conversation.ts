/**
 * KC-027 — Voice conversation foundation verification.
 * Run: npx vite-node scripts/verify-voice-conversation.ts
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createVoiceConversationService } from '@/features/digitalRafeeq/voice/VoiceConversationService'
import {
  STT_ERROR_MESSAGE_URDU,
  STT_MIC_DENIED_MESSAGE_URDU,
  STT_NO_SPEECH_MESSAGE_URDU,
  TTS_ERROR_MESSAGE_URDU,
} from '@/features/digitalRafeeq/voice/ttsMessages'
import { DEFAULT_STT_LANGUAGE, STT_LANGUAGE_ALTERNATIVES } from '@/server/voice/types'

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

type Scenario = { name: string; passed: boolean; detail: string }

function runScenario(name: string, fn: () => string): Scenario {
  try {
    return { name, passed: true, detail: fn() }
  } catch (error) {
    return {
      name,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

async function runScenarioAsync(name: string, fn: () => Promise<string>): Promise<Scenario> {
  try {
    return { name, passed: true, detail: await fn() }
  } catch (error) {
    return {
      name,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

async function main() {
  const results: Scenario[] = []

  results.push(
    runScenario('server STT + TTS routes exist', () => {
      assert(existsSync(resolve('api/stt.ts')), 'api/stt.ts')
      assert(existsSync(resolve('api/tts.ts')), 'api/tts.ts')
      assert(existsSync(resolve('src/server/voice/providers/GoogleSTTProvider.ts')), 'STT provider')
      assert(
        existsSync(resolve('src/features/digitalRafeeq/voice/VoiceConversationService.ts')),
        'conversation service',
      )
      return 'routes+providers'
    }),
  )

  results.push(
    runScenario('STT language defaults support Urdu + English names', () => {
      assert(DEFAULT_STT_LANGUAGE === 'ur-PK', 'ur-PK default')
      assert(STT_LANGUAGE_ALTERNATIVES.includes('en-IN'), 'en-IN alternate')
      assert(STT_LANGUAGE_ALTERNATIVES.includes('ur-IN'), 'ur-IN alternate')
      return DEFAULT_STT_LANGUAGE
    }),
  )

  results.push(
    runScenario('user-facing errors never expose technical details', () => {
      for (const message of [
        TTS_ERROR_MESSAGE_URDU,
        STT_ERROR_MESSAGE_URDU,
        STT_NO_SPEECH_MESSAGE_URDU,
        STT_MIC_DENIED_MESSAGE_URDU,
      ]) {
        assert(!/api[_ ]?key|credential|token|google|stack/i.test(message), message)
        assert(/[\u0600-\u06FF]/.test(message), 'must include Urdu')
      }
      return 'urdu-safe'
    }),
  )

  results.push(
    await runScenarioAsync('text turn uses intelligence callback and session history', async () => {
      const service = createVoiceConversationService()
      let called = ''
      const turn = await service.converseFromText(
        'آج مجھے کیا کرنا چاہیے؟',
        async (query) => {
          called = query
          return {
            text: 'آج تین کارکن ایسے ہیں جن سے دوبارہ رابطہ مفید رہے گا۔',
            actions: [{ id: 'a1', label: 'مربوط کارکنان', route: '/rukn/my-karkun' }],
          }
        },
        { speakReply: false },
      )
      assert(Boolean(turn), 'turn created')
      assert(called.includes('کیا'), 'intelligence received query')
      const history = service.snapshot().history
      assert(history.length === 1, 'one history turn')
      assert(history[0].source === 'text', 'text source')
      assert(history[0].rafeeqResponse.includes('کارکن'), 'response stored')
      service.stopAll()
      return `history=${history.length}`
    }),
  )

  results.push(
    runScenario('vercel.json includes STT function files', () => {
      const raw = readFileSync(resolve('vercel.json'), 'utf8')
      assert(raw.includes('api/stt.ts'), 'stt function')
      assert(raw.includes('src/server/voice/**'), 'voice includeFiles')
      return 'vercel-ok'
    }),
  )

  const failed = results.filter((s) => !s.passed)
  for (const scenario of results) {
    console.log(`${scenario.passed ? 'PASS' : 'FAIL'}  ${scenario.name} — ${scenario.detail}`)
  }
  if (failed.length > 0) {
    console.error(`\nKC-027 verify failed: ${failed.length}/${results.length}`)
    process.exit(1)
  }
  console.log(`\nKC-027 verify passed: ${results.length}/${results.length}`)
}

void main()
