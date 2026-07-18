# KC-019 — Digital Rafeeq Google Cloud Voice Foundation

Speech synthesis only (Text → MP3). The browser never talks to Google Cloud.

```
Browser (RafeeqSpeakButton)
  → Voice client adapter
  → POST /api/tts { text }
  → VoiceService
  → GoogleTTSProvider
  → Google Cloud Text-to-Speech
  → MP3 (+ cache)
```

## Environment variables (server-only)

Never use `VITE_*` for credentials.

| Variable | Purpose |
|----------|---------|
| `GOOGLE_TTS_CREDENTIALS_JSON` | Full service-account JSON string (recommended on Vercel) |
| `GOOGLE_TTS_CREDENTIALS_JSON_BASE64` | Base64 of the same JSON |
| `GOOGLE_APPLICATION_CREDENTIALS` | Absolute path to JSON key file (local) |
| `TTS_CACHE_DIR` | Optional cache directory (default `.tts-cache` local, `/tmp/...` on Vercel) |

## Local setup

1. Enable Cloud Text-to-Speech on your Google Cloud project.
2. Create a service account with **Cloud Text-to-Speech User**.
3. Download the JSON key to a path **outside** the repo (e.g. `C:\secrets\karkun-tts-sa.json`).
4. In `.env.local` (gitignored):

```env
GOOGLE_APPLICATION_CREDENTIALS=C:\secrets\karkun-tts-sa.json
```

Or paste JSON:

```env
GOOGLE_TTS_CREDENTIALS_JSON={"type":"service_account",...}
```

5. Run `npm run dev` — Vite middleware serves `POST /api/tts`.
6. Open Digital Rafeeq → tap the speaker on a reply (no autoplay).

## Vercel production setup

1. Project → Settings → Environment Variables → Production.
2. Add `GOOGLE_TTS_CREDENTIALS_JSON` with the **entire** service-account JSON as one line.
3. Redeploy.
4. Confirm `GET` SPA still works and `POST /api/tts` returns `audio/mpeg`.

## Voices

Language preference: `ur-PK`, with graceful fallback to the best available `ur-IN` premium voice (Chirp3-HD → WaveNet → Standard). Speaking rate `0.95`, pitch `0`.

## Cache

Key = SHA-256 of provider + voice + rate + pitch + text. Memory + filesystem (best-effort).

## Known limitations

- Serverless cold starts add latency on first request.
- Filesystem cache does not persist across all Vercel instances.
- Google currently publishes premium Urdu mainly as `ur-IN` (not `ur-PK`).
- Speech-to-Text / live conversation are out of scope for KC-019.
