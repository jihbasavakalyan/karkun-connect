/**
 * KC-027 — Google Cloud Speech-to-Text provider.
 * Credentials via env only — never shipped to the browser.
 */

import { SpeechClient, protos } from '@google-cloud/speech'
import { assertServiceAccount, loadGoogleServiceAccount } from '../credentials.js'
import {
  DEFAULT_STT_LANGUAGE,
  STT_LANGUAGE_ALTERNATIVES,
  type SpeechToTextProvider,
  type TranscribeSpeechInput,
} from '../types.js'

function createClient(): SpeechClient {
  const credentials = loadGoogleServiceAccount()
  if (credentials) {
    assertServiceAccount(credentials)
    return new SpeechClient({
      credentials,
      projectId: typeof credentials.project_id === 'string' ? credentials.project_id : undefined,
    })
  }
  return new SpeechClient()
}

function resolveEncoding(
  contentType?: string,
): protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding {
  const Encoding = protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding
  const type = (contentType ?? '').toLowerCase()
  if (type.includes('webm') || type.includes('opus')) {
    return Encoding.WEBM_OPUS
  }
  if (type.includes('ogg')) {
    return Encoding.OGG_OPUS
  }
  if (type.includes('wav') || type.includes('wave') || type.includes('linear')) {
    return Encoding.LINEAR16
  }
  if (type.includes('flac')) {
    return Encoding.FLAC
  }
  if (type.includes('mpeg') || type.includes('mp3')) {
    return Encoding.MP3
  }
  return Encoding.WEBM_OPUS
}

export class GoogleSTTProvider implements SpeechToTextProvider {
  readonly id = 'google' as const
  private client: SpeechClient | null = null

  private getClient(): SpeechClient {
    if (!this.client) this.client = createClient()
    return this.client
  }

  async transcribeSpeech(input: TranscribeSpeechInput) {
    const client = this.getClient()
    const languageCode = input.languageCode ?? DEFAULT_STT_LANGUAGE
    const encoding = resolveEncoding(input.contentType)

    const config: protos.google.cloud.speech.v1.IRecognitionConfig = {
      encoding,
      languageCode,
      alternativeLanguageCodes: [...STT_LANGUAGE_ALTERNATIVES].filter(
        (code) => code !== languageCode,
      ),
      enableAutomaticPunctuation: true,
      model: 'latest_long',
      // sampleRateHertz omitted for WEBM_OPUS / OGG_OPUS (container embeds rate)
      ...(encoding === protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.LINEAR16 ||
      encoding === protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.FLAC
        ? { sampleRateHertz: input.sampleRateHertz ?? 16000 }
        : {}),
    }

    const [response] = await client.recognize({
      audio: { content: input.audio.toString('base64') },
      config,
    })

    const alternatives =
      response.results?.flatMap((result) => result.alternatives ?? []) ?? []
    const best = alternatives
      .map((item) => ({
        transcript: (item.transcript ?? '').trim(),
        confidence: typeof item.confidence === 'number' ? item.confidence : undefined,
      }))
      .filter((item) => item.transcript.length > 0)
      .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0]

    if (!best?.transcript) {
      throw Object.assign(new Error('no-speech'), {
        statusCode: 422,
        code: 'no_speech',
      })
    }

    return {
      transcript: best.transcript,
      confidence: best.confidence,
      provider: this.id,
      languageCode,
    }
  }
}
