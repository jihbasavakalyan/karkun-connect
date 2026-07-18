/**
 * KC-019 / KC-026 — Browser client for Digital Rafeeq cloud TTS.
 * Talks only to /api/tts — never to Google Cloud directly.
 * Respects Rafeeq preferences (voice on/off, speed). Autoplay stays gesture-driven.
 */

import { TTS_ERROR_MESSAGE_URDU } from './ttsMessages'
import type { SpeakPlaybackAdapter } from './speechPlayback'
import { getUserPreferences } from '@/stores/userPreferencesStore'

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

function speakingRateFromPreferences(): number {
  const speed = getUserPreferences().rafeeq.voiceSpeed
  if (speed === 'slow') return 0.85
  if (speed === 'fast') return 1.1
  return 0.95
}

export async function speakRafeeqCloudText(text: string): Promise<void> {
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('empty-text')
  }
  if (!isCloudSpeechAvailable()) {
    throw new Error('speech-unavailable')
  }

  const prefs = getUserPreferences().rafeeq
  if (!prefs.voiceResponses) {
    const error = new Error('voice-disabled')
    ;(error as Error & { userMessage?: string }).userMessage =
      'آواز بند ہے۔ اسے سیٹنگز میں آن کیا جا سکتا ہے۔'
    throw error
  }

  stopCloudSpeech()
  const abort = new AbortController()
  controller.abort = abort

  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: trimmed,
      speakingRate: speakingRateFromPreferences(),
    }),
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
