import { voicePipelineLog } from './voicePipelineDiag'

/**
 * Convert browser-recorded audio (e.g. Safari audio/mp4 AAC) into WAV / LINEAR16
 * so Google Cloud STT can transcribe without unsupported MP4/AAC encodings.
 */

function writeString(view: DataView, offset: number, value: string): void {
  for (let i = 0; i < value.length; i += 1) {
    view.setUint8(offset + i, value.charCodeAt(i))
  }
}

function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const sampleRate = buffer.sampleRate
  const channelCount = 1
  const samples = buffer.length
  const bytesPerSample = 2
  const blockAlign = channelCount * bytesPerSample
  const dataSize = samples * blockAlign
  const arrayBuffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(arrayBuffer)

  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, channelCount, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bytesPerSample * 8, true)
  writeString(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  const mixed = new Float32Array(samples)
  for (let ch = 0; ch < buffer.numberOfChannels; ch += 1) {
    const channel = buffer.getChannelData(ch)
    for (let i = 0; i < samples; i += 1) {
      mixed[i] += channel[i] / buffer.numberOfChannels
    }
  }

  let offset = 44
  for (let i = 0; i < samples; i += 1) {
    const sample = Math.max(-1, Math.min(1, mixed[i] ?? 0))
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
    offset += 2
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' })
}

function needsWavTranscode(contentType: string): boolean {
  const type = contentType.toLowerCase()
  if (!type) return true
  if (type.includes('webm') || type.includes('ogg') || type.includes('wav') || type.includes('flac')) {
    return false
  }
  if (type.includes('mp3')) return false
  return (
    type.includes('mp4') ||
    type.includes('aac') ||
    type.includes('m4a') ||
    type.includes('mpeg')
  )
}

/**
 * Safari MediaRecorder yields audio/mp4 (AAC). Google STT v1 has no AAC/MP4 encoding —
 * decode in-browser and send WAV / LINEAR16 instead.
 */
export async function ensureSttCompatibleAudio(
  audio: Blob,
): Promise<{ blob: Blob; contentType: string }> {
  const contentType = audio.type || ''
  if (!needsWavTranscode(contentType)) {
    return { blob: audio, contentType: contentType || 'audio/webm' }
  }

  if (typeof window === 'undefined') {
    return { blob: audio, contentType: contentType || 'audio/mp4' }
  }

  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) {
    return { blob: audio, contentType: contentType || 'audio/mp4' }
  }

  const context = new Ctx()
  try {
    if (context.state === 'suspended') {
      await context.resume()
    }
    const raw = await audio.arrayBuffer()
    const decoded = await context.decodeAudioData(raw.slice(0))
    const wav = audioBufferToWavBlob(decoded)
    const wavDurationMs = Math.round((decoded.length / decoded.sampleRate) * 1000)
    voicePipelineLog('WAV duration', {
      fromType: contentType || '(empty)',
      toType: 'audio/wav',
      fromSize: audio.size,
      toSize: wav.size,
      wavDurationMs,
      sampleRate: decoded.sampleRate,
      samples: decoded.length,
    })
    return { blob: wav, contentType: 'audio/wav' }
  } finally {
    try {
      await context.close()
    } catch {
      // ignore
    }
  }
}
