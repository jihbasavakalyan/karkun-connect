/**
 * KC-027 — Push-to-talk microphone recorder with silence auto-stop.
 * Audio is discarded after transcription; nothing is persisted.
 *
 * Safari / iOS: prefers audio/mp4, must not use small timeslices, flush via requestData().
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

/** Prefer Opus/WebM when available; include Safari MP4/AAC candidates. */
export const MEDIA_RECORDER_MIME_CANDIDATES = Object.freeze([
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/mp4;codecs=mp4a.40.2',
  'audio/aac',
  'audio/mpeg',
])

export function pickMimeType(
  isTypeSupported: (type: string) => boolean = (type) =>
    typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type),
): string | undefined {
  return MEDIA_RECORDER_MIME_CANDIDATES.find((type) => isTypeSupported(type))
}

export function isMp4FamilyMime(mime: string | undefined | null): boolean {
  if (!mime) return false
  const lower = mime.toLowerCase()
  return (
    lower.includes('mp4') ||
    lower.includes('aac') ||
    lower.includes('m4a') ||
    (lower.includes('mpeg') && !lower.includes('webm'))
  )
}

function logRecorderDiag(message: string, detail?: Record<string, unknown>): void {
  if (typeof console === 'undefined' || typeof console.info !== 'function') return
  if (detail) console.info(`[rafeeq-mic] ${message}`, detail)
  else console.info(`[rafeeq-mic] ${message}`)
}

export function createMicRecorder(options: MicRecorderOptions = {}): MicRecorderControllers {
  const silenceMs = options.silenceMs ?? 1800
  const maxDurationMs = options.maxDurationMs ?? 20_000

  let status: MicRecorderStatus = 'idle'
  let mediaStream: MediaStream | null = null
  let mediaRecorder: MediaRecorder | null = null
  let selectedMime: string | undefined
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
          // Stop the monitor; when onSilenceStop is set, the owner must call stop()
          // (e.g. finishListeningAndConverse) so the audio blob is not discarded.
          if (rafId) {
            cancelAnimationFrame(rafId)
            rafId = 0
          }
          if (options.onSilenceStop) {
            options.onSilenceStop()
          } else {
            void stop()
          }
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

    selectedMime = pickMimeType()
    chunks = []
    mediaRecorder = selectedMime
      ? new MediaRecorder(mediaStream, { mimeType: selectedMime })
      : new MediaRecorder(mediaStream)

    const effectiveMime =
      mediaRecorder.mimeType || selectedMime || 'application/octet-stream'
    const useTimeslice = !isMp4FamilyMime(effectiveMime)

    logRecorderDiag('Recorder started', {
      selectedMime: selectedMime ?? '(browser default)',
      effectiveMime,
      useTimeslice,
    })

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
        logRecorderDiag('Chunk received', {
          chunkSize: event.data.size,
          chunkCount: chunks.length,
        })
      }
    }
    mediaRecorder.onstop = () => {
      const type = mediaRecorder?.mimeType || selectedMime || 'audio/webm'
      const blob = chunks.length > 0 ? new Blob(chunks, { type }) : null
      logRecorderDiag('Recorder stopped', {
        chunkCount: chunks.length,
        blobSize: blob?.size ?? 0,
        blobType: blob?.type ?? type,
      })
      cleanupGraph()
      setStatus('idle')
      stopResolver?.(blob)
      stopResolver = null
    }

    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (Ctx) {
        audioContext = new Ctx()
        if (audioContext.state === 'suspended') {
          await audioContext.resume()
        }
        const source = audioContext.createMediaStreamSource(mediaStream)
        analyser = audioContext.createAnalyser()
        analyser.fftSize = 2048
        source.connect(analyser)
      }
    } catch {
      // Silence detection optional if AudioContext fails.
    }

    setStatus('recording')
    // Safari MP4: small timeslices yield empty blobs — start without timeslice.
    if (useTimeslice) {
      mediaRecorder.start(250)
    } else {
      mediaRecorder.start()
    }
    monitorSilence()
    maxTimer = window.setTimeout(() => {
      if (rafId) {
        cancelAnimationFrame(rafId)
        rafId = 0
      }
      if (options.onSilenceStop) {
        options.onSilenceStop()
      } else {
        void stop()
      }
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
        if (
          mediaRecorder &&
          mediaRecorder.state === 'recording' &&
          typeof mediaRecorder.requestData === 'function'
        ) {
          logRecorderDiag('requestData() called')
          mediaRecorder.requestData()
        }
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
