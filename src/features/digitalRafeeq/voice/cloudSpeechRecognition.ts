/**
 * KC-027 — Cloud Speech-to-Text client.
 * Browser → POST /api/stt — never talks to Google directly.
 */

import {
  STT_ERROR_MESSAGE_URDU,
  STT_NO_SPEECH_MESSAGE_URDU,
} from './ttsMessages'
import { ensureSttCompatibleAudio } from './sttAudioPrepare'

export type CloudTranscriptResult = {
  transcript: string
  confidence?: number
  provider: string
  languageCode: string
  durationMs: number
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('audio-read-failed'))
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.readAsDataURL(blob)
  })
}

export async function transcribeCloudAudio(
  audio: Blob,
  options?: { languageCode?: string; signal?: AbortSignal },
): Promise<CloudTranscriptResult> {
  const prepared = await ensureSttCompatibleAudio(audio)
  const audioBase64 = await blobToBase64(prepared.blob)

  if (typeof console !== 'undefined' && console.info) {
    console.info('[rafeeq-stt] /api/stt request', {
      contentType: prepared.contentType,
      byteLength: prepared.blob.size,
      languageCode: options?.languageCode ?? 'ur-PK',
    })
  }

  const response = await fetch('/api/stt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64,
      contentType: prepared.contentType,
      languageCode: options?.languageCode ?? 'ur-PK',
    }),
    signal: options?.signal,
  })

  if (typeof console !== 'undefined' && console.info) {
    console.info('[rafeeq-stt] /api/stt response', { status: response.status })
  }

  if (!response.ok) {
    let message = STT_ERROR_MESSAGE_URDU
    try {
      const payload = (await response.json()) as { error?: string; message?: string }
      if (typeof console !== 'undefined' && console.info) {
        console.info('[rafeeq-stt] /api/stt error body', payload)
      }
      if (payload.error === 'no_speech') message = STT_NO_SPEECH_MESSAGE_URDU
      else if (payload.message) message = payload.message
    } catch {
      // keep default
    }
    const error = new Error(message)
    ;(error as Error & { userMessage?: string }).userMessage = message
    throw error
  }

  return (await response.json()) as CloudTranscriptResult
}
