/**
 * KC-027 — Push-to-talk microphone recorder with silence auto-stop.
 * Audio is discarded after transcription; nothing is persisted.
 */

export type MicRecorderStatus = 'idle' | 'requesting' | 'recording' | 'denied' | 'unsupported' | 'error'

export type MicRecorderControllers = {
  start: () => Promise<void>
  stop: () => Promise<Blob | null>
  cancel: () => void
  getStatus: () => MicRecorderStatus
}

type MicRecorderOptions = {
  /** Auto-stop after this much continuous silence (ms). */
  silenceMs?: number
  /** Hard cap on recording length (ms). */
  maxDurationMs?: number
  onStatus?: (status: MicRecorderStatus) => void
  onSilenceStop?: () => void
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
  ]
  return candidates.find((type) => MediaRecorder.isTypeSupported(type))
}

export function createMicRecorder(options: MicRecorderOptions = {}): MicRecorderControllers {
  const silenceMs = options.silenceMs ?? 1800
  const maxDurationMs = options.maxDurationMs ?? 20_000

  let status: MicRecorderStatus = 'idle'
  let mediaStream: MediaStream | null = null
  let mediaRecorder: MediaRecorder | null = null
  let chunks: BlobPart[] = []
  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let silenceStartedAt: number | null = null
  let rafId = 0
  let maxTimer = 0
  let stopResolver: ((blob: Blob | null) => void) | null = null

  const setStatus = (next: MicRecorderStatus) => {
    status = next
    options.onStatus?.(next)
  }

  const cleanupGraph = () => {
    if (rafId) {
      cancelAnimationFrame(rafId)
      rafId = 0
    }
    if (maxTimer) {
      window.clearTimeout(maxTimer)
      maxTimer = 0
    }
    try {
      mediaStream?.getTracks().forEach((track) => track.stop())
    } catch {
      // ignore
    }
    mediaStream = null
    try {
      void audioContext?.close()
    } catch {
      // ignore
    }
    audioContext = null
    analyser = null
    mediaRecorder = null
    silenceStartedAt = null
  }

  const monitorSilence = () => {
    if (!analyser) return
    const data = new Uint8Array(analyser.fftSize)
    const tick = () => {
      if (!analyser || status !== 'recording') return
      analyser.getByteTimeDomainData(data)
      let sum = 0
      for (let i = 0; i < data.length; i += 1) {
        const centered = (data[i] - 128) / 128
        sum += centered * centered
      }
      const rms = Math.sqrt(sum / data.length)
      const now = performance.now()
      if (rms < 0.04) {
        if (silenceStartedAt == null) silenceStartedAt = now
        else if (now - silenceStartedAt >= silenceMs) {
          options.onSilenceStop?.()
          void stop()
          return
        }
      } else {
        silenceStartedAt = null
      }
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)
  }

  const start = async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      throw Object.assign(new Error('mic-unsupported'), { code: 'unsupported' })
    }
    if (typeof MediaRecorder === 'undefined') {
      setStatus('unsupported')
      throw Object.assign(new Error('mic-unsupported'), { code: 'unsupported' })
    }

    setStatus('requesting')
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    } catch {
      setStatus('denied')
      throw Object.assign(new Error('mic-denied'), { code: 'denied' })
    }

    const mimeType = pickMimeType()
    chunks = []
    mediaRecorder = mimeType
      ? new MediaRecorder(mediaStream, { mimeType })
      : new MediaRecorder(mediaStream)

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }
    mediaRecorder.onstop = () => {
      const type = mediaRecorder?.mimeType || mimeType || 'audio/webm'
      const blob = chunks.length > 0 ? new Blob(chunks, { type }) : null
      cleanupGraph()
      setStatus('idle')
      stopResolver?.(blob)
      stopResolver = null
    }

    try {
      audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(mediaStream)
      analyser = audioContext.createAnalyser()
      analyser.fftSize = 2048
      source.connect(analyser)
    } catch {
      // Silence detection optional if AudioContext fails.
    }

    setStatus('recording')
    mediaRecorder.start(250)
    monitorSilence()
    maxTimer = window.setTimeout(() => {
      void stop()
    }, maxDurationMs)
  }

  const stop = async (): Promise<Blob | null> => {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') {
      cleanupGraph()
      setStatus('idle')
      return null
    }
    return new Promise((resolve) => {
      stopResolver = resolve
      try {
        mediaRecorder?.stop()
      } catch {
        cleanupGraph()
        setStatus('idle')
        resolve(null)
      }
    })
  }

  const cancel = () => {
    chunks = []
    try {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop()
    } catch {
      // ignore
    }
    cleanupGraph()
    setStatus('idle')
    stopResolver?.(null)
    stopResolver = null
  }

  return {
    start,
    stop,
    cancel,
    getStatus: () => status,
  }
}
