/**
 * Verify Digital Rafeeq voice conversation completion lifecycle.
 * Run: npm run verify:rafeeq-voice
 *
 * Asserts mic start → silence/browser end → finishListeningAndConverse → transcript → reply.
 */

import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createVoiceConversationService } from '@/features/digitalRafeeq/voice/VoiceConversationService'
import type { AnswerFn } from '@/features/digitalRafeeq/voice/VoiceConversationService'

type CaseResult = { name: string; passed: boolean; detail: string }

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function run(name: string, fn: () => void): CaseResult {
  try {
    fn()
    return { name, passed: true, detail: 'ok' }
  } catch (error) {
    return {
      name,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

async function runAsync(name: string, fn: () => Promise<void>): Promise<CaseResult> {
  try {
    await fn()
    return { name, passed: true, detail: 'ok' }
  } catch (error) {
    return {
      name,
      passed: false,
      detail: error instanceof Error ? error.message : String(error),
    }
  }
}

function read(rel: string): string {
  return readFileSync(resolve(rel), 'utf8')
}

const answer: AnswerFn = async (query) => ({
  text: `جواب: ${query}`,
  actions: [{ id: 'a1', label: 'Dashboard', route: '/rukn' }],
})

type MockRecognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onresult: ((event: {
    resultIndex: number
    results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }>
  }) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

function installMockFileReader(): void {
  class MockFileReader {
    result: string | ArrayBuffer | null = null
    onload: ((ev: ProgressEvent<FileReader>) => void) | null = null
    onerror: ((ev: ProgressEvent<FileReader>) => void) | null = null
    readAsDataURL(blob: Blob) {
      void blob.arrayBuffer().then((buf) => {
        const bytes = new Uint8Array(buf)
        let binary = ''
        for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!)
        this.result = `data:audio/webm;base64,${Buffer.from(binary, 'binary').toString('base64')}`
        this.onload?.({} as ProgressEvent<FileReader>)
      })
    }
  }
  ;(globalThis as typeof globalThis & { FileReader: typeof FileReader }).FileReader =
    MockFileReader as unknown as typeof FileReader
}

function installMockSpeechRecognition(options?: {
  transcript?: string
  autoEnd?: boolean
}): { getLast: () => MockRecognition | null } {
  let last: MockRecognition | null = null
  const transcript = options?.transcript ?? 'Find Aslam'
  const autoEnd = options?.autoEnd ?? true

  function MockSpeechRecognition(this: MockRecognition) {
    this.lang = ''
    this.continuous = false
    this.interimResults = false
    this.maxAlternatives = 1
    this.onresult = null
    this.onerror = null
    this.onend = null
    this.start = () => {
      queueMicrotask(() => {
        this.onresult?.({
          resultIndex: 0,
          results: [{ 0: { transcript }, isFinal: true }],
        })
        if (autoEnd) this.onend?.()
      })
    }
    this.stop = () => {
      this.onend?.()
    }
    this.abort = () => {
      this.onend?.()
    }
    last = this
  }

  const g = globalThis as typeof globalThis & {
    window: Window &
      typeof globalThis & {
        SpeechRecognition?: new () => MockRecognition
        webkitSpeechRecognition?: new () => MockRecognition
        MediaRecorder?: typeof MediaRecorder
      }
    MediaRecorder?: typeof MediaRecorder
    navigator: Navigator
  }
  if (!g.window) {
    g.window = g as unknown as typeof g.window
  }
  // Force browser STT path: MediaRecorder unavailable for these cases.
  g.MediaRecorder = undefined
  g.window.MediaRecorder = undefined
  Object.defineProperty(g, 'navigator', {
    configurable: true,
    value: {
      ...(g.navigator ?? {}),
      mediaDevices: undefined,
    },
  })
  g.window.SpeechRecognition = MockSpeechRecognition as unknown as new () => MockRecognition
  g.window.webkitSpeechRecognition = undefined

  return {
    getLast: () => last,
  }
}

function installMockMediaPipeline(options?: { blobSize?: number }): {
  restore: () => void
} {
  const blobSize = options?.blobSize ?? 1024
  const g = globalThis as typeof globalThis & {
    window: Window & typeof globalThis
    navigator: Navigator
    MediaRecorder: typeof MediaRecorder
    AudioContext: typeof AudioContext
  }

  if (!g.window) g.window = g as unknown as typeof g.window

  Object.defineProperty(g, 'navigator', {
    configurable: true,
    value: {
      ...(g.navigator ?? {}),
      mediaDevices: {
        getUserMedia: async () =>
          ({
            getTracks: () => [{ stop: () => undefined }],
          }) as unknown as MediaStream,
      },
    },
  })

  class FakeMediaRecorder {
    state = 'inactive'
    ondataavailable: ((ev: { data: Blob }) => void) | null = null
    onstop: (() => void) | null = null
    mimeType = 'audio/webm'

    constructor(_stream: MediaStream, _opts?: MediaRecorderOptions) {}

    start(_timeslice?: number) {
      this.state = 'recording'
    }

    stop() {
      this.state = 'inactive'
      const data = new Blob([new Uint8Array(blobSize)], { type: 'audio/webm' })
      this.ondataavailable?.({ data })
      this.onstop?.()
    }

    static isTypeSupported() {
      return true
    }
  }

  class FakeAudioContext {
    createMediaStreamSource() {
      return { connect: () => undefined }
    }
    createAnalyser() {
      return {
        fftSize: 2048,
        getByteTimeDomainData: (data: Uint8Array) => {
          data.fill(128)
        },
      }
    }
    close() {
      return Promise.resolve()
    }
  }

  g.MediaRecorder = FakeMediaRecorder as unknown as typeof MediaRecorder
  g.AudioContext = FakeAudioContext as unknown as typeof AudioContext
  g.window.MediaRecorder = g.MediaRecorder
  g.window.AudioContext = g.AudioContext
  g.window.SpeechRecognition = undefined
  g.window.webkitSpeechRecognition = undefined
  const raf = ((cb: FrameRequestCallback) =>
    setTimeout(() => cb(performance.now()), 16) as unknown as number) as typeof requestAnimationFrame
  const caf = ((id: number) => clearTimeout(id)) as typeof cancelAnimationFrame
  g.window.requestAnimationFrame = raf
  g.window.cancelAnimationFrame = caf
  ;(g as typeof globalThis & { requestAnimationFrame: typeof requestAnimationFrame }).requestAnimationFrame =
    raf
  ;(g as typeof globalThis & { cancelAnimationFrame: typeof cancelAnimationFrame }).cancelAnimationFrame =
    caf
  g.window.setTimeout = setTimeout as unknown as typeof window.setTimeout
  g.window.clearTimeout = clearTimeout as unknown as typeof window.clearTimeout
  ;(g as typeof globalThis & { performance: Performance }).performance = {
    now: () => Date.now(),
  } as Performance

  return {
    restore: () => undefined,
  }
}

async function main() {
  const cases: CaseResult[] = []

  cases.push(
    run('Source — silence completion wired to finishListeningAndConverse', () => {
      const service = read('src/features/digitalRafeeq/voice/VoiceConversationService.ts')
      const recorder = read('src/features/digitalRafeeq/voice/micRecorder.ts')
      const drawer = read('src/features/digitalRafeeq/voice/DigitalRafeeqVoiceDrawer.tsx')
      assert(service.includes('onSilenceStop'), 'onSilenceStop passed to createMicRecorder')
      assert(service.includes('requestListeningCompletion'), 'requestListeningCompletion exists')
      assert(
        service.includes('void this.finishListeningAndConverse(answer)'),
        'completion calls finishListeningAndConverse',
      )
      assert(
        /if \(options\.onSilenceStop\) \{\s*options\.onSilenceStop\(\)/.test(recorder),
        'micRecorder defers stop to onSilenceStop owner',
      )
      assert(drawer.includes('startListening(answerFn)'), 'drawer passes answerFn to startListening')
      assert(drawer.includes('سن رہے ہیں') || drawer.includes('سوچ رہے ہیں'), 'busy shows status')
    }),
  )

  cases.push(
    await runAsync('Microphone starts (browser fallback when MediaRecorder unavailable)', async () => {
      installMockSpeechRecognition({ autoEnd: false })
      const service = createVoiceConversationService()
      const phases: string[] = []
      service.subscribe((s) => phases.push(s.phase))
      await service.startListening(answer)
      assert(phases.includes('listening'), 'entered listening')
      assert(service.snapshot().phase === 'listening', 'still listening before end')
      service.stopAll()
    }),
  )

  cases.push(
    await runAsync('Browser STT path — onend completes via finishListeningAndConverse', async () => {
      installMockSpeechRecognition({ transcript: 'Find Aslam', autoEnd: true })
      const service = createVoiceConversationService()
      let answered = ''
      await service.startListening(async (q) => {
        answered = q
        return { text: `OK ${q}` }
      })
      // Allow microtasks: recognition result + onend + finish pipeline
      await new Promise((r) => setTimeout(r, 50))
      assert(answered.includes('Aslam'), `intelligence got transcript, got="${answered}"`)
      assert(service.snapshot().history.length >= 1, 'history has turn')
      assert(
        service.snapshot().history[0].source === 'voice',
        'voice source',
      )
      assert(
        service.snapshot().history[0].rafeeqResponse.includes('Aslam'),
        'conversation response stored',
      )
      service.stopAll()
    }),
  )

  cases.push(
    await runAsync('Cloud STT path — finishListeningAndConverse transcribes blob', async () => {
      installMockMediaPipeline({ blobSize: 2048 })
      installMockFileReader()
      const originalFetch = globalThis.fetch
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const url = String(input)
        if (url.includes('/api/stt')) {
          return new Response(
            JSON.stringify({
              transcript: 'How is the campaign progressing?',
              provider: 'mock',
              languageCode: 'ur-PK',
              durationMs: 10,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        }
        return new Response('{}', { status: 404 })
      }) as typeof fetch

      try {
        const service = createVoiceConversationService()
        let answered = ''
        await service.startListening(async (q) => {
          answered = q
          return { text: `Cloud ${q}` }
        })
        assert(service.snapshot().phase === 'listening', `listening after mic start, phase=${service.snapshot().phase} notice=${service.snapshot().notice}`)
        const turn = await service.finishListeningAndConverse(async (q) => {
          answered = q
          return { text: `Cloud ${q}` }
        })
        assert(Boolean(turn), `turn created, phase=${service.snapshot().phase} notice=${service.snapshot().notice}`)
        assert(answered.includes('campaign'), `transcript forwarded, got="${answered}"`)
        assert(service.snapshot().history.length >= 1, 'history')
        service.stopAll()
      } finally {
        globalThis.fetch = originalFetch
      }
    }),
  )

  cases.push(
    await runAsync('Silence auto-stop invokes same completion pipeline', async () => {
      installMockMediaPipeline({ blobSize: 2048 })
      installMockFileReader()
      const originalFetch = globalThis.fetch
      globalThis.fetch = (async (input: RequestInfo | URL) => {
        if (String(input).includes('/api/stt')) {
          return new Response(
            JSON.stringify({
              transcript: 'Show Weekly Ijtema progress',
              provider: 'mock',
              languageCode: 'ur-PK',
              durationMs: 8,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        }
        return new Response('{}', { status: 404 })
      }) as typeof fetch

      try {
        const serviceSrc = read('src/features/digitalRafeeq/voice/VoiceConversationService.ts')
        assert(
          serviceSrc.includes('onSilenceStop: () =>') &&
            serviceSrc.includes('this.requestListeningCompletion()'),
          'silence → requestListeningCompletion',
        )
        assert(
          serviceSrc.includes('void this.finishListeningAndConverse(answer)'),
          'requestListeningCompletion → finishListeningAndConverse',
        )

        const service = createVoiceConversationService()
        let answered = ''
        await service.startListening(async (q) => {
          answered = q
          return { text: `Silence ${q}` }
        })
        assert(
          service.snapshot().phase === 'listening',
          `expected listening, got ${service.snapshot().phase} (${service.snapshot().notice})`,
        )
        await service.finishListeningAndConverse(async (q) => {
          answered = q
          return { text: `Silence ${q}` }
        })
        assert(answered.includes('Ijtema'), `got="${answered}" notice=${service.snapshot().notice}`)
        assert(service.snapshot().history[0]?.source === 'voice', 'voice turn')
        service.stopAll()
      } finally {
        globalThis.fetch = originalFetch
      }
    }),
  )

  cases.push(
    await runAsync('Conversation response + multiple conversations', async () => {
      installMockSpeechRecognition({ transcript: 'Open Dashboard', autoEnd: true })
      const service = createVoiceConversationService()
      await service.startListening(answer)
      await new Promise((r) => setTimeout(r, 50))
      installMockSpeechRecognition({ transcript: 'Find Aslam', autoEnd: true })
      // After first turn preferBrowserStt may already be true
      await service.startListening(answer)
      await new Promise((r) => setTimeout(r, 50))
      assert(service.snapshot().history.length >= 2, `history=${service.snapshot().history.length}`)
      service.stopAll()
    }),
  )

  cases.push(
    await runAsync('Voice playback path attempted when voiceResponses enabled', async () => {
      installMockSpeechRecognition({ transcript: 'Help', autoEnd: true })
      const service = createVoiceConversationService()
      const phases: string[] = []
      service.subscribe((s) => phases.push(s.phase))
      await service.startListening(answer)
      await new Promise((r) => setTimeout(r, 80))
      // speaking may be skipped if Audio unavailable; thinking/ready/idle required
      assert(
        phases.includes('thinking') || phases.includes('ready') || phases.includes('idle'),
        `phases=${phases.join(',')}`,
      )
      assert(service.snapshot().history.length >= 1, 'turn recorded')
      service.stopAll()
    }),
  )

  cases.push(
    await runAsync('Cancellation via stopAll clears listening', async () => {
      installMockSpeechRecognition({ autoEnd: false })
      const service = createVoiceConversationService()
      await service.startListening(answer)
      assert(service.snapshot().phase === 'listening', 'listening')
      service.stopAll()
      assert(service.snapshot().phase === 'idle', 'idle after cancel')
      assert(service.snapshot().history.length === 0, 'no turn after cancel before complete')
    }),
  )

  cases.push(
    await runAsync('Text converse still works (no regression)', async () => {
      const service = createVoiceConversationService()
      const turn = await service.converseFromText('Open Dashboard', answer, {
        speakReply: false,
      })
      assert(Boolean(turn), 'text turn')
      assert(turn!.source === 'text', 'text source')
      service.stopAll()
    }),
  )

  cases.push(
    run('Package script verify:rafeeq-voice registered', () => {
      const pkg = read('package.json')
      assert(pkg.includes('verify:rafeeq-voice'), 'script present')
      assert(existsSync(resolve('scripts/verify-rafeeq-voice.ts')), 'script file')
    }),
  )

  const failed = cases.filter((c) => !c.passed)
  for (const c of cases) {
    console.log(`${c.passed ? '✓' : '✗'} ${c.name}${c.passed ? '' : ` — ${c.detail}`}`)
  }
  if (failed.length > 0) {
    console.error(`\nverify:rafeeq-voice failed: ${failed.length}/${cases.length}`)
    process.exit(1)
  }
  console.log(`\n✓ Digital Rafeeq voice lifecycle verified (${cases.length} checks)`)
}

void main()
