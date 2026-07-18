/**
 * KC-019 — Google Cloud Text-to-Speech provider.
 * Credentials via env only — never shipped to the browser.
 */

import { existsSync, readFileSync } from 'node:fs'
import { TextToSpeechClient, protos } from '@google-cloud/text-to-speech'
import {
  DEFAULT_TTS_LANGUAGE,
  DEFAULT_TTS_PITCH,
  DEFAULT_TTS_SPEAKING_RATE,
  URDU_VOICE_CANDIDATES,
  type GenerateSpeechInput,
  type VoiceProvider,
} from '../types.js'

type CredentialsJson = {
  client_email?: string
  private_key?: string
  project_id?: string
  [key: string]: unknown
}

function loadCredentials(): CredentialsJson | undefined {
  const raw = process.env.GOOGLE_TTS_CREDENTIALS_JSON?.trim()
  if (raw) {
    return JSON.parse(raw) as CredentialsJson
  }

  const b64 = process.env.GOOGLE_TTS_CREDENTIALS_JSON_BASE64?.trim()
  if (b64) {
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf8')) as CredentialsJson
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  if (credentialsPath) {
    if (!existsSync(credentialsPath)) {
      throw new Error(`GOOGLE_APPLICATION_CREDENTIALS file not found: ${credentialsPath}`)
    }
    return JSON.parse(readFileSync(credentialsPath, 'utf8')) as CredentialsJson
  }

  return undefined
}

function assertServiceAccount(credentials: CredentialsJson): void {
  const missing = ['project_id', 'client_email', 'private_key', 'token_uri'].filter(
    (key) => !credentials[key],
  )
  if (missing.length > 0) {
    throw new Error(`Invalid Google service account JSON. Missing: ${missing.join(', ')}`)
  }
}

function createClient(): TextToSpeechClient {
  const credentials = loadCredentials()
  if (credentials) {
    assertServiceAccount(credentials)
    return new TextToSpeechClient({
      credentials,
      projectId: typeof credentials.project_id === 'string' ? credentials.project_id : undefined,
    })
  }
  // Application Default Credentials (gcloud / metadata server)
  return new TextToSpeechClient()
}

export class GoogleTTSProvider implements VoiceProvider {
  readonly id = 'google' as const
  private client: TextToSpeechClient | null = null
  private resolvedVoice: { languageCode: string; name: string } | null = null

  private getClient(): TextToSpeechClient {
    if (!this.client) {
      this.client = createClient()
    }
    return this.client
  }

  private async resolveVoice(
    preferredLanguage = DEFAULT_TTS_LANGUAGE,
    preferredName?: string,
  ): Promise<{ languageCode: string; name: string }> {
    if (preferredName) {
      return { languageCode: preferredLanguage, name: preferredName }
    }
    if (this.resolvedVoice) return this.resolvedVoice

    const client = this.getClient()
    try {
      const [response] = await client.listVoices({ languageCode: 'ur' })
      const available = new Set(
        (response.voices ?? [])
          .map((voice) => voice.name)
          .filter((name): name is string => Boolean(name)),
      )

      for (const candidate of URDU_VOICE_CANDIDATES) {
        if (available.has(candidate.name)) {
          this.resolvedVoice = candidate
          return candidate
        }
      }

      const anyUrdu = (response.voices ?? []).find((voice) =>
        (voice.languageCodes ?? []).some((code) => code.toLowerCase().startsWith('ur')),
      )
      if (anyUrdu?.name) {
        const languageCode = anyUrdu.languageCodes?.[0] ?? 'ur-IN'
        this.resolvedVoice = { languageCode, name: anyUrdu.name }
        return this.resolvedVoice
      }
    } catch {
      // Fall through to static candidates.
    }

    this.resolvedVoice = URDU_VOICE_CANDIDATES[2]
    return this.resolvedVoice
  }

  async generateSpeech(input: GenerateSpeechInput) {
    const text = input.text.trim()
    const speakingRate = input.speakingRate ?? DEFAULT_TTS_SPEAKING_RATE
    const pitch = input.pitch ?? DEFAULT_TTS_PITCH
    const client = this.getClient()

    const candidates = input.voiceName
      ? [{ languageCode: input.languageCode ?? DEFAULT_TTS_LANGUAGE, name: input.voiceName }]
      : [
          await this.resolveVoice(input.languageCode ?? DEFAULT_TTS_LANGUAGE),
          ...URDU_VOICE_CANDIDATES,
        ]

    let lastError: unknown
    const tried = new Set<string>()

    for (const candidate of candidates) {
      if (tried.has(candidate.name)) continue
      tried.add(candidate.name)

      const request: protos.google.cloud.texttospeech.v1.ISynthesizeSpeechRequest = {
        input: { text },
        voice: {
          languageCode: candidate.languageCode,
          name: candidate.name,
        },
        audioConfig: {
          audioEncoding: 'MP3',
          speakingRate,
          pitch,
        },
      }

      try {
        const [response] = await client.synthesizeSpeech(request)
        const audioContent = response.audioContent
        if (!audioContent || (typeof audioContent !== 'string' && audioContent.length === 0)) {
          throw new Error('empty-audio')
        }

        const audio =
          typeof audioContent === 'string'
            ? Buffer.from(audioContent, 'base64')
            : Buffer.from(audioContent)

        this.resolvedVoice = candidate
        return {
          audio,
          contentType: 'audio/mpeg' as const,
          provider: this.id,
          voiceName: candidate.name,
          languageCode: candidate.languageCode,
        }
      } catch (error) {
        lastError = error
      }
    }

    throw lastError instanceof Error ? lastError : new Error('google-tts-failed')
  }
}
