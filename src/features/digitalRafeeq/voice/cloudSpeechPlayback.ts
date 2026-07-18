/**
 * KC-019 — Browser client for Digital Rafeeq cloud TTS.
 * Talks only to /api/tts — never to Google Cloud directly.
 */

import { TTS_ERROR_MESSAGE_URDU } from './ttsMessages'
import type { SpeakPlaybackAdapter } from './speechPlayback'

type CloudSpeakController = {
  abort: AbortController | null
  audio: HTMLAudioElement | null
  objectUrl: string | null
}

const controller: CloudSpeakController = {
  abort: null,
  audio: null,
  objectUrl: null,
}

function cleanupAudio(): void {
  if (controller.audio) {
    controller.audio.pause()
    controller.audio.src = ''
    controller.audio = null
  }
  if (controller.objectUrl) {
    URL.revokeObjectURL(controller.objectUrl)
    controller.objectUrl = null
  }
}

export function stopCloudSpeech(): void {
  controller.abort?.abort()
  controller.abort = null
  cleanupAudio()
}

export function isCloudSpeechAvailable(): boolean {
  return typeof window !== 'undefined' && typeof Audio !== 'undefined' && typeof fetch === 'function'
}

export async function speakRafeeqCloudText(text: string): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('empty-text')
  }
  if (!isCloudSpeechAvailable()) {
    throw new Error('speech-unavailable')
  }

  stopCloudSpeech()
  const abort = new AbortController()
  controller.abort = abort

  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: trimmed }),
    signal: abort.signal,
  })

  if (!response.ok) {
    let message = TTS_ERROR_MESSAGE_URDU
    try {
      const payload = (await response.json()) as { message?: string }
      if (payload.message) message = payload.message
    } catch {
      // keep default
    }
    const error = new Error(message)
    ;(error as Error & { userMessage?: string }).userMessage = message
    throw error
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  controller.objectUrl = objectUrl

  const audio = new Audio(objectUrl)
  controller.audio = audio

  await new Promise<void>((resolve, reject) => {
    audio.onended = () => {
      cleanupAudio()
      resolve()
    }
    audio.onerror = () => {
      cleanupAudio()
      reject(new Error(TTS_ERROR_MESSAGE_URDU))
    }
    void audio.play().catch((error) => {
      cleanupAudio()
      reject(error instanceof Error ? error : new Error(TTS_ERROR_MESSAGE_URDU))
    })
  })
}

export const cloudSpeechAdapter: SpeakPlaybackAdapter = {
  speak: (text) => speakRafeeqCloudText(text),
  stop: stopCloudSpeech,
  isAvailable: isCloudSpeechAvailable,
}
