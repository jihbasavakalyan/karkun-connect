/**
 * KC-019 — Shared HTTP handler for /api/tts (Vercel + Vite middleware).
 */

import { getVoiceService } from './VoiceService'
import { TTS_ERROR_MESSAGE_URDU } from './types'

export type TtsHttpRequest = {
  method?: string
  body?: unknown
}

export type TtsHttpSuccess = {
  status: number
  headers: Record<string, string>
  body: Buffer | { error: string; message: string }
}

export type TtsHttpResult = TtsHttpSuccess

function readText(body: unknown): string {
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body) as { text?: unknown }
      return typeof parsed.text === 'string' ? parsed.text : ''
    } catch {
      return ''
    }
  }
  if (body && typeof body === 'object' && 'text' in body) {
    const value = (body as { text?: unknown }).text
    return typeof value === 'string' ? value : ''
  }
  return ''
}

export async function handleTtsRequest(request: TtsHttpRequest): Promise<TtsHttpResult> {
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
        message: 'Use POST with JSON { "text": "..." }.',
      },
    }
  }

  const text = readText(request.body).trim()
  if (!text) {
    return {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: {
        error: 'empty_text',
        message: 'Text is required.',
      },
    }
  }

  try {
    const result = await getVoiceService().generateSpeech({ text })
    return {
      status: 200,
      headers: {
        'Content-Type': result.contentType,
        'Cache-Control': 'private, max-age=86400',
        'X-TTS-Provider': result.provider,
        'X-TTS-Voice': result.voiceName,
        'X-TTS-Cache': result.cached ? 'hit' : 'miss',
        'X-TTS-Duration-Ms': String(result.generationMs),
      },
      body: result.audio,
    }
  } catch (error) {
    const statusCode =
      error && typeof error === 'object' && 'statusCode' in error
        ? Number((error as { statusCode: number }).statusCode)
        : 502
    return {
      status: Number.isFinite(statusCode) ? statusCode : 502,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
      body: {
        error: 'tts_unavailable',
        message: TTS_ERROR_MESSAGE_URDU,
      },
    }
  }
}
