/**
 * KC-027 — Push-to-talk microphone recorder with silence auto-stop.
 * Audio is discarded after transcription; nothing is persisted.
 *
 * Safari / iOS: prefers audio/mp4, must not use small timeslices, flush via requestData().
 * Premature auto-stop guard: voiceDetected + warm-up; Safari analyser graph; flatline fallback.
 */

import { voicePipelineLog } from './voicePipelineDiag'

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

/** Safari / iOS WebKit (not Chrome/Edge/Firefox on iOS). */
export function isSafariLikeBrowser(
  ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): boolean {
  if (!ua) return false
  if (/CriOS|FxiOS|EdgiOS|OPiOS|Chrome|Chromium|Edg\//i.test(ua)) return false
  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (typeof navigator !== 'undefined' &&
      navigator.platform === 'MacIntel' &&
      navigator.maxTouchPoints > 1)
  if (isIOS) return true
  return /Safari/i.test(ua) && /Apple Computer|Macintosh/i.test(ua)
}

const RMS_SILENCE_THRESHOLD = 0.04
/** Do not arm silence until voice is heard or this warm-up elapses. */
const SILENCE_WARMUP_MS = 1000

export function createMicRecorder(options: MicRecorderOptions = {}): MicRecorderControllers {
  const silenceMs = options.silenceMs ?? 1800
  const maxDurationMs = options.maxDurationMs ?? 20_000
  const safariLike = isSafariLikeBrowser()

  let status: MicRecorderStatus = 'idle'
  let mediaStream: MediaStream | null = null
  let mediaRecorder: MediaRecorder | null = null
  let selectedMime: string | undefined
  let chunks: BlobPart[] = []
  let chunkSizes: number[] = []
  let audioContext: AudioContext | null = null
  let analyser: AnalyserNode | null = null
  let silenceGain: GainNode | null = null
  let silenceStartedAt: number | null = null
  let rafId = 0
  let maxTimer = 0
  let stopResolver: ((blob: Blob | null) => void) | null = null
  let recorderStartedAt = 0
  let rmsSampleCount = 0
  let rmsMin = Number.POSITIVE_INFINITY
  let rmsMax = 0
  let rmsSum = 0
  let lastRmsLogAt = 0
  let silenceArmCount = 0
  let silenceResetCount = 0
  let voiceDetected = false
  let firstSpeechAt: number | null = null
  let silenceAutoStopEnabled = true
  let flatlineFallbackApplied = false

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
      silenceGain?.disconnect()
    } catch {
      // ignore
    }
    silenceGain = null
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
    if (!analyser) {
      voicePipelineLog('Silence monitor skipped (no analyser)', {
        audioContextState: audioContext?.state ?? 'none',
      })
      return
    }
    const data = new Uint8Array(analyser.fftSize)
    const tick = () => {
      if (!analyser || status !== 'recording') return
      analyser.getByteTimeDomainData(data)

      let minByte = 255
      let maxByte = 0
      let sum = 0
      for (let i = 0; i < data.length; i += 1) {
        const sample = data[i] ?? 128
        if (sample < minByte) minByte = sample
        if (sample > maxByte) maxByte = sample
        const centered = (sample - 128) / 128
        sum += centered * centered
      }
      const rms = Math.sqrt(sum / data.length)
      const now = performance.now()
      const elapsed = now - recorderStartedAt
      const flatline = maxByte - minByte <= 1
      rmsSampleCount += 1
      rmsMin = Math.min(rmsMin, rms)
      rmsMax = Math.max(rmsMax, rms)
      rmsSum += rms

      if (rms >= RMS_SILENCE_THRESHOLD) {
        if (!voiceDetected) {
          voiceDetected = true
          firstSpeechAt = now
          voicePipelineLog('voiceDetected', {
            voiceDetected: true,
            firstSpeechTimestampMs: Math.round(elapsed),
            rms: Number(rms.toFixed(5)),
          })
        }
      }

      // Safari: analyser flatline → disable silence auto-stop (manual / max duration only).
      if (
        safariLike &&
        silenceAutoStopEnabled &&
        !voiceDetected &&
        !flatlineFallbackApplied &&
        elapsed >= SILENCE_WARMUP_MS &&
        rmsMax < RMS_SILENCE_THRESHOLD
      ) {
        flatlineFallbackApplied = true
        silenceAutoStopEnabled = false
        silenceStartedAt = null
        voicePipelineLog('Safari flatline fallback — silence auto-stop disabled', {
          voiceDetected,
          rmsMax: Number(rmsMax.toFixed(5)),
          elapsedSinceRecorderStartMs: Math.round(elapsed),
          maxDurationMs,
        })
      }

      if (now - lastRmsLogAt >= 250) {
        lastRmsLogAt = now
        voicePipelineLog('Silence detector level (RMS)', {
          rms: Number(rms.toFixed(5)),
          rmsThreshold: RMS_SILENCE_THRESHOLD,
          belowThreshold: rms < RMS_SILENCE_THRESHOLD,
          voiceDetected,
          silenceAutoStopEnabled,
          byteMin: minByte,
          byteMax: maxByte,
          flatline,
          audioContextState: audioContext?.state ?? 'none',
          mediaRecorderState: mediaRecorder?.state ?? 'none',
          silenceArmedMs:
            silenceStartedAt != null ? Math.round(now - silenceStartedAt) : null,
          elapsedSinceRecorderStartMs: Math.round(elapsed),
        })
      }

      const warmUpElapsed = elapsed >= SILENCE_WARMUP_MS
      const canArmSilence =
        silenceAutoStopEnabled && (voiceDetected || warmUpElapsed)

      if (rms < RMS_SILENCE_THRESHOLD) {
        if (!canArmSilence) {
          // Warm-up / waiting for first speech — do not arm.
          if (silenceStartedAt != null) {
            silenceStartedAt = null
          }
        } else if (silenceStartedAt == null) {
          silenceStartedAt = now
          silenceArmCount += 1
          voicePipelineLog('Silence timer armed', {
            voiceDetected,
            warmUpElapsed,
            firstSpeechTimestampMs:
              firstSpeechAt != null
                ? Math.round(firstSpeechAt - recorderStartedAt)
                : null,
            rms: Number(rms.toFixed(5)),
            silenceMs,
            threshold: RMS_SILENCE_THRESHOLD,
            flatline,
            elapsedSinceRecorderStartMs: Math.round(elapsed),
          })
        } else if (now - silenceStartedAt >= silenceMs) {
          voicePipelineLog('Silence timer fired', {
            voiceDetected,
            firstSpeechTimestampMs:
              firstSpeechAt != null
                ? Math.round(firstSpeechAt - recorderStartedAt)
                : null,
            silenceHeldMs: Math.round(now - silenceStartedAt),
            silenceMs,
            recordingDurationMs: Math.round(elapsed),
            rms: Number(rms.toFixed(5)),
            rmsMin: Number(rmsMin.toFixed(5)),
            rmsMax: Number(rmsMax.toFixed(5)),
            silenceArmCount,
            silenceResetCount,
          })
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
      } else if (silenceStartedAt != null) {
        silenceResetCount += 1
        voicePipelineLog('Silence timer reset', {
          voiceDetected,
          rms: Number(rms.toFixed(5)),
          wasArmedMs: Math.round(now - silenceStartedAt),
          elapsedSinceRecorderStartMs: Math.round(elapsed),
        })
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

    chunks = []
    chunkSizes = []
    rmsSampleCount = 0
    rmsMin = Number.POSITIVE_INFINITY
    rmsMax = 0
    rmsSum = 0
    lastRmsLogAt = 0
    silenceArmCount = 0
    silenceResetCount = 0
    silenceStartedAt = null
    voiceDetected = false
    firstSpeechAt = null
    silenceAutoStopEnabled = true
    flatlineFallbackApplied = false

    setStatus('requesting')
    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
      voicePipelineLog('getUserMedia granted', {
        trackCount: mediaStream.getTracks().length,
        trackStates: mediaStream.getTracks().map((t) => ({
          kind: t.kind,
          enabled: t.enabled,
          muted: t.muted,
          readyState: t.readyState,
        })),
      })
    } catch {
      setStatus('denied')
      throw Object.assign(new Error('mic-denied'), { code: 'denied' })
    }

    selectedMime = pickMimeType()
    mediaRecorder = selectedMime
      ? new MediaRecorder(mediaStream, { mimeType: selectedMime })
      : new MediaRecorder(mediaStream)

    const effectiveMime =
      mediaRecorder.mimeType || selectedMime || 'application/octet-stream'
    const useTimeslice = !isMp4FamilyMime(effectiveMime)

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
        chunkSizes.push(event.data.size)
        voicePipelineLog(
          chunkSizes.length === 1 ? 'First audio chunk received' : 'Audio chunk received',
          {
            size: event.data.size,
            chunkCount: chunks.length,
            chunkSizes: [...chunkSizes],
            mediaRecorderState: mediaRecorder?.state ?? 'none',
            elapsedSinceRecorderStartMs: Math.round(performance.now() - recorderStartedAt),
          },
        )
      } else {
        voicePipelineLog('Empty audio chunk ignored', {
          chunkCount: chunks.length,
          mediaRecorderState: mediaRecorder?.state ?? 'none',
        })
      }
    }
    mediaRecorder.onstop = () => {
      const type = mediaRecorder?.mimeType || selectedMime || 'audio/webm'
      const blob = chunks.length > 0 ? new Blob(chunks, { type }) : null
      const elapsedMs = Math.round(performance.now() - recorderStartedAt)
      const estimatedDurationMs =
        blob && blob.size > 0 ? Math.round((blob.size / 24000) * 1000) : 0
      voicePipelineLog('MediaRecorder.stop complete', {
        voiceDetected,
        firstSpeechTimestampMs:
          firstSpeechAt != null ? Math.round(firstSpeechAt - recorderStartedAt) : null,
        recordingDurationMs: elapsedMs,
        chunkCount: chunks.length,
        chunkSizes: [...chunkSizes],
        blobSize: blob?.size ?? 0,
        blobType: blob?.type ?? type,
        blobDurationEstimateMs: estimatedDurationMs,
        silenceArmCount,
        silenceResetCount,
        silenceAutoStopEnabled,
        flatlineFallbackApplied,
        rmsMin: Number.isFinite(rmsMin) ? Number(rmsMin.toFixed(5)) : null,
        rmsMax: Number(rmsMax.toFixed(5)),
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
        voicePipelineLog('AudioContext created', {
          state: audioContext.state,
          safariLike,
        })
        if (audioContext.state === 'suspended') {
          await audioContext.resume()
          voicePipelineLog('AudioContext resumed', { state: audioContext.state })
        }
        const source = audioContext.createMediaStreamSource(mediaStream)
        analyser = audioContext.createAnalyser()
        analyser.fftSize = 2048
        source.connect(analyser)
        // Safari: leaf analysers often flatline — keep graph alive via muted destination.
        if (safariLike) {
          silenceGain = audioContext.createGain()
          silenceGain.gain.value = 0
          analyser.connect(silenceGain)
          silenceGain.connect(audioContext.destination)
          voicePipelineLog('Safari analyser graph', {
            path: 'MediaStreamSource → Analyser → Gain(0) → destination',
            audioContextState: audioContext.state,
          })
        } else {
          voicePipelineLog('Analyser connected (leaf graph)', {
            audioContextState: audioContext.state,
            fftSize: analyser.fftSize,
          })
        }
      }
    } catch (error) {
      voicePipelineLog('AudioContext/analyser setup failed', {
        message: error instanceof Error ? error.message : String(error),
      })
    }

    setStatus('recording')
    recorderStartedAt = performance.now()
    if (useTimeslice) {
      mediaRecorder.start(250)
    } else {
      mediaRecorder.start()
    }
    voicePipelineLog('MediaRecorder.start', {
      selectedMime: selectedMime ?? '(browser default)',
      effectiveMime,
      useTimeslice,
      timesliceMs: useTimeslice ? 250 : null,
      mediaRecorderState: mediaRecorder.state,
      audioContextState: audioContext?.state ?? 'none',
      silenceMs,
      silenceWarmupMs: SILENCE_WARMUP_MS,
      rmsThreshold: RMS_SILENCE_THRESHOLD,
      voiceDetected: false,
      safariLike,
    })
    monitorSilence()
    maxTimer = window.setTimeout(() => {
      voicePipelineLog('Max duration timer fired → stop', {
        maxDurationMs,
        voiceDetected,
        recordingDurationMs: Math.round(performance.now() - recorderStartedAt),
      })
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
      voicePipelineLog('stop() no-op (inactive)', {
        mediaRecorderState: mediaRecorder?.state ?? 'none',
      })
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
          voicePipelineLog('requestData()', {
            mediaRecorderState: mediaRecorder.state,
            chunkCountBefore: chunks.length,
            elapsedSinceRecorderStartMs: Math.round(performance.now() - recorderStartedAt),
          })
          mediaRecorder.requestData()
        }
        voicePipelineLog('MediaRecorder.stop()', {
          mediaRecorderState: mediaRecorder?.state ?? 'none',
          voiceDetected,
          recordingDurationMs: Math.round(performance.now() - recorderStartedAt),
          blobSizePendingChunks: chunkSizes.reduce((a, b) => a + b, 0),
        })
        mediaRecorder?.stop()
      } catch (error) {
        voicePipelineLog('MediaRecorder.stop() threw', {
          message: error instanceof Error ? error.message : String(error),
        })
        cleanupGraph()
        setStatus('idle')
        resolve(null)
      }
    })
  }

  const cancel = () => {
    chunks = []
    chunkSizes = []
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
