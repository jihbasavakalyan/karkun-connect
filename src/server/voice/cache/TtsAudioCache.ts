/**
 * KC-019 — TTS audio cache keyed by hash(text + voice params).
 * Memory cache for warm serverless instances + filesystem where practical.
 */

import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

type CacheEntry = {
  audio: Buffer
  contentType: 'audio/mpeg'
  voiceName: string
  languageCode: string
  provider: string
}

const memory = new Map<string, CacheEntry>()
const MAX_MEMORY_ENTRIES = 64

function cacheDir(): string {
  const configured = process.env.TTS_CACHE_DIR?.trim()
  if (configured) return configured
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return join(tmpdir(), 'karkun-tts-cache')
  }
  return join(process.cwd(), '.tts-cache')
}

function ensureCacheDir(): string {
  const dir = cacheDir()
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

export function hashSpeechKey(parts: {
  text: string
  languageCode: string
  voiceName: string
  speakingRate: number
  pitch: number
  provider: string
}): string {
  return createHash('sha256')
    .update(
      [
        parts.provider,
        parts.languageCode,
        parts.voiceName,
        String(parts.speakingRate),
        String(parts.pitch),
        parts.text,
      ].join('|'),
    )
    .digest('hex')
}

export function getCachedSpeech(key: string): CacheEntry | null {
  const mem = memory.get(key)
  if (mem) return mem

  try {
    const dir = ensureCacheDir()
    const metaPath = join(dir, `${key}.json`)
    const audioPath = join(dir, `${key}.mp3`)
    if (!existsSync(metaPath) || !existsSync(audioPath)) return null
    const meta = JSON.parse(readFileSync(metaPath, 'utf8')) as Omit<CacheEntry, 'audio'>
    const audio = readFileSync(audioPath)
    const entry: CacheEntry = { ...meta, audio, contentType: 'audio/mpeg' }
    remember(key, entry)
    return entry
  } catch {
    return null
  }
}

export function setCachedSpeech(key: string, entry: CacheEntry): void {
  remember(key, entry)
  try {
    const dir = ensureCacheDir()
    writeFileSync(join(dir, `${key}.mp3`), entry.audio)
    writeFileSync(
      join(dir, `${key}.json`),
      JSON.stringify({
        contentType: entry.contentType,
        voiceName: entry.voiceName,
        languageCode: entry.languageCode,
        provider: entry.provider,
      }),
    )
  } catch {
    // Filesystem cache is best-effort (read-only FS, quota, etc.).
  }
}

function remember(key: string, entry: CacheEntry): void {
  if (memory.size >= MAX_MEMORY_ENTRIES) {
    const first = memory.keys().next().value
    if (first) memory.delete(first)
  }
  memory.set(key, entry)
}
