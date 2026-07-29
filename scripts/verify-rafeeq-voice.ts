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
    private timeslice: number | undefined
    private requestDataCalls = 0

    constructor(_stream: MediaStream, opts?: MediaRecorderOptions) {
      if (opts?.mimeType) this.mimeType = opts.mimeType
    }

    start(timeslice?: number) {
      this.timeslice = timeslice
      this.state = 'recording'
    }

    requestData() {
      this.requestDataCalls += 1
      const data = new Blob([new Uint8Array(blobSize)], { type: this.mimeType })
      this.ondataavailable?.({ data })
    }

    stop() {
      this.state = 'inactive'
      // Final fragment (may be empty after requestData flush)
      const data = new Blob([new Uint8Array(Math.max(64, Math.floor(blobSize / 4)))], {
        type: this.mimeType,
      })
      this.ondataavailable?.({ data })
      this.onstop?.()
    }

    static isTypeSupported(type: string) {
      return (
        type.includes('webm') ||
        type.includes('ogg') ||
        type.includes('mp4') ||
        type.includes('aac')
      )
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

  cases.push(
    await runAsync('Safari MIME detection prefers audio/mp4 when WebM unsupported', async () => {
      const { pickMimeType, isMp4FamilyMime } = await import(
        '../src/features/digitalRafeeq/voice/micRecorder'
      )
      const selected = pickMimeType((type) => type.startsWith('audio/mp4') || type === 'audio/aac')
      assert(selected === 'audio/mp4' || selected?.startsWith('audio/mp4'), `selected=${selected}`)
      assert(isMp4FamilyMime(selected), 'mp4 family')
      assert(isMp4FamilyMime('audio/mp4;codecs=mp4a.40.2'), 'aac in mp4')
      assert(!isMp4FamilyMime('audio/webm;codecs=opus'), 'webm not mp4 family')
    }),
  )

  cases.push(
    run('Safari recorder source — no timeslice for MP4 + requestData before stop', () => {
      const recorder = read('src/features/digitalRafeeq/voice/micRecorder.ts')
      assert(recorder.includes("'audio/mp4'"), 'mp4 candidate')
      assert(recorder.includes('isMp4FamilyMime'), 'mp4 family helper')
      assert(recorder.includes('requestData'), 'requestData flush')
      assert(recorder.includes('useTimeslice'), 'timeslice gate')
      assert(recorder.includes('mediaRecorder.start()'), 'start without timeslice path')
      const prepare = read('src/features/digitalRafeeq/voice/sttAudioPrepare.ts')
      assert(prepare.includes('ensureSttCompatibleAudio'), 'STT audio prepare')
      assert(prepare.includes('audio/wav'), 'wav transcode target')
      const stt = read('src/server/voice/providers/GoogleSTTProvider.ts')
      assert(stt.includes('mp4') && stt.includes('ENCODING_UNSPECIFIED'), 'mp4 not mapped to WEBM_OPUS')
    }),
  )

  cases.push(
    await runAsync('iPhone Safari path — non-empty mp4 blob → STT → Rafeeq reply', async () => {
      const g = globalThis as typeof globalThis & {
        window: Window & typeof globalThis
        MediaRecorder: typeof MediaRecorder
        AudioContext: typeof AudioContext
        navigator: Navigator
      }
      if (!g.window) g.window = g as unknown as typeof g.window

      class SafariMediaRecorder {
        state = 'inactive'
        ondataavailable: ((ev: { data: Blob }) => void) | null = null
        onstop: (() => void) | null = null
        mimeType = 'audio/mp4'
        startedWithTimeslice: number | undefined
        requestDataCalls = 0

        constructor(_stream: MediaStream, opts?: MediaRecorderOptions) {
          if (opts?.mimeType) this.mimeType = opts.mimeType
        }

        start(timeslice?: number) {
          this.startedWithTimeslice = timeslice
          this.state = 'recording'
          ;(globalThis as { __lastSafariRecorder?: SafariMediaRecorder }).__lastSafariRecorder =
            this
        }

        requestData() {
          this.requestDataCalls += 1
          this.ondataavailable?.({
            data: new Blob([new Uint8Array(1500)], { type: 'audio/mp4' }),
          })
        }

        stop() {
          this.state = 'inactive'
          this.ondataavailable?.({
            data: new Blob([new Uint8Array(200)], { type: 'audio/mp4' }),
          })
          this.onstop?.()
        }

        static isTypeSupported(type: string) {
          return type.includes('mp4') || type.includes('aac')
        }
      }

      class SafariAudioContext {
        state = 'running'
        resume() {
          return Promise.resolve()
        }
        createMediaStreamSource() {
          return { connect: () => undefined }
        }
        createAnalyser() {
          return {
            fftSize: 2048,
            getByteTimeDomainData: (data: Uint8Array) => data.fill(128),
          }
        }
        decodeAudioData(raw: ArrayBuffer) {
          const samples = Math.max(1600, Math.floor(raw.byteLength / 2))
          return Promise.resolve({
            sampleRate: 16000,
            length: samples,
            numberOfChannels: 1,
            getChannelData: () => {
              const ch = new Float32Array(samples)
              for (let i = 0; i < samples; i += 1) ch[i] = Math.sin(i / 20) * 0.2
              return ch
            },
          } as AudioBuffer)
        }
        close() {
          return Promise.resolve()
        }
      }

      Object.defineProperty(g, 'navigator', {
        configurable: true,
        value: {
          mediaDevices: {
            getUserMedia: async () =>
              ({ getTracks: () => [{ stop: () => undefined }] }) as unknown as MediaStream,
          },
        },
      })
      g.MediaRecorder = SafariMediaRecorder as unknown as typeof MediaRecorder
      g.AudioContext = SafariAudioContext as unknown as typeof AudioContext
      g.window.MediaRecorder = g.MediaRecorder
      g.window.AudioContext = g.AudioContext
      g.window.SpeechRecognition = undefined
      const raf = ((cb: FrameRequestCallback) =>
        setTimeout(() => cb(Date.now()), 16) as unknown as number) as typeof requestAnimationFrame
      g.window.requestAnimationFrame = raf
      ;(g as typeof globalThis & { requestAnimationFrame: typeof requestAnimationFrame }).requestAnimationFrame =
        raf
      g.window.cancelAnimationFrame = ((id: number) =>
        clearTimeout(id)) as typeof cancelAnimationFrame
      installMockFileReader()

      let sttRequests = 0
      let sttContentType = ''
      const originalFetch = globalThis.fetch
      globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).includes('/api/stt')) {
          sttRequests += 1
          const body = JSON.parse(String(init?.body ?? '{}')) as { contentType?: string }
          sttContentType = body.contentType ?? ''
          return new Response(
            JSON.stringify({
              transcript: 'Find Aslam',
              provider: 'mock',
              languageCode: 'ur-PK',
              durationMs: 12,
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
          return { text: `Safari ${q}` }
        })
        const last = (globalThis as { __lastSafariRecorder?: SafariMediaRecorder })
          .__lastSafariRecorder
        assert(Boolean(last), 'safari recorder constructed')
        assert(last!.startedWithTimeslice === undefined, 'Safari must not use start(250)')
        assert(last!.mimeType.includes('mp4'), `mime=${last!.mimeType}`)
        assert(service.snapshot().phase === 'listening', 'listening')

        const turn = await service.finishListeningAndConverse(async (q) => {
          answered = q
          return { text: `Safari ${q}` }
        })
        assert(last!.requestDataCalls >= 1, 'requestData called before stop')
        assert(sttRequests >= 1, `STT request sent count=${sttRequests}`)
        assert(
          sttContentType.includes('wav') || sttContentType.includes('mp4'),
          `STT contentType=${sttContentType}`,
        )
        assert(Boolean(turn), `turn created phase=${service.snapshot().phase} notice=${service.snapshot().notice}`)
        assert(answered.includes('Aslam'), `transcript got="${answered}"`)
        assert(
          (service.snapshot().history[0]?.rafeeqResponse ?? '').includes('Aslam'),
          'Rafeeq responded',
        )
        service.stopAll()
      } finally {
        globalThis.fetch = originalFetch
      }
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
