/**
 * KC-027 — Shared HTTP handler for /api/stt (Vercel + Vite middleware).
 * Accepts JSON { audioBase64, contentType?, languageCode? }.
 * Never returns credentials or raw provider errors to the browser.
 */

import { getVoiceService } from './VoiceService.js'
import {
  STT_ERROR_MESSAGE_URDU,
  STT_NO_SPEECH_MESSAGE_URDU,
} from './types.js'

export type SttHttpRequest = {
  method?: string
  body?: unknown
}

export type SttHttpResult = {
  status: number
  headers: Record<string, string>
  body:
    | {
        transcript: string
        confidence?: number
        provider: string
        languageCode: string
        durationMs: number
      }
    | { error: string; message: string }
    | Buffer
}

function readField(body: unknown, key: string): unknown {
  if (!body || typeof body !== 'object') return undefined
  return (body as Record<string, unknown>)[key]
}

export async function handleSttRequest(request: SttHttpRequest): Promise<SttHttpResult> {
  const method = (request.method ?? 'GET').toUpperCase()
  if (method === 'OPTIONS') {
    return {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: Buffer.alloc(0),
    }
  }

  if (method !== 'POST') {
    return {
      status: 405,
      headers: { 'Content-Type': 'application/json; charset=utf-8', Allow: 'POST, OPTIONS' },
      body: {
        error: 'method_not_allowed',
        message: 'Use POST with JSON { "audioBase64": "..." }.',
      },
    }
  }

  const audioBase64 = readField(request.body, 'audioBase64')
  if (typeof audioBase64 !== 'string' || !audioBase64.trim()) {
    return {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: {
        error: 'empty_audio',
        message: STT_ERROR_MESSAGE_URDU,
      },
    }
  }

  const contentTypeRaw = readField(request.body, 'contentType')
  const languageCodeRaw = readField(request.body, 'languageCode')
  const contentType = typeof contentTypeRaw === 'string' ? contentTypeRaw : undefined
  const languageCode = typeof languageCodeRaw === 'string' ? languageCodeRaw : undefined

  try {
    const audio = Buffer.from(audioBase64, 'base64')
    const result = await getVoiceService().transcribeSpeech({
      audio,
      contentType,
      languageCode,
    })

    return {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-STT-Provider': result.provider,
        'X-STT-Language': result.languageCode,
        'X-STT-Duration-Ms': String(result.durationMs),
      },
      body: {
        transcript: result.transcript,
        confidence: result.confidence,
        provider: result.provider,
        languageCode: result.languageCode,
        durationMs: result.durationMs,
      },
    }
  } catch (error) {
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code: string }).code)
        : ''
    const statusCode =
      error && typeof error === 'object' && 'statusCode' in error
        ? Number((error as { statusCode: number }).statusCode)
        : 502

    return {
      status: Number.isFinite(statusCode) ? statusCode : 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: {
        error: code === 'no_speech' ? 'no_speech' : 'stt_unavailable',
        message: code === 'no_speech' ? STT_NO_SPEECH_MESSAGE_URDU : STT_ERROR_MESSAGE_URDU,
      },
    }
  }
}
