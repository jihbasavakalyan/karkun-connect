# KC-027 — Digital Rafeeq Voice Conversation

Full duplex voice companion on top of the **same** Digital Rafeeq intelligence layer used by text chat.

```
User speaks
  → Microphone (push-to-talk)
  → POST /api/stt  (Google Cloud Speech-to-Text, server-only credentials)
  → Recognized Urdu text (shown briefly)
  → answerOperationalQuery / Digital Rafeeq intelligence
  → Natural Urdu response
  → POST /api/tts  (Google Cloud Text-to-Speech)
  → Spoken reply + session history
```

```
                Digital Rafeeq
                       │
        ┌──────────────┼──────────────┐
        │              │              │
    Text Chat     Voice Chat     Future WhatsApp
        │              │              │
        └──────────────┼──────────────┘
          Intelligence Engine
          Automation Engine
          Execution Context
          Campaign Knowledge
```

## Architecture files

| Layer | Path |
|-------|------|
| Mic recorder | `src/features/digitalRafeeq/voice/micRecorder.ts` |
| Conversation orchestrator | `src/features/digitalRafeeq/voice/VoiceConversationService.ts` |
| Cloud STT client | `src/features/digitalRafeeq/voice/cloudSpeechRecognition.ts` |
| Cloud TTS client | `src/features/digitalRafeeq/voice/cloudSpeechPlayback.ts` |
| Drawer UX | `src/features/digitalRafeeq/voice/DigitalRafeeqVoiceDrawer.tsx` |
| Google STT provider | `src/server/voice/providers/GoogleSTTProvider.ts` |
| STT HTTP | `src/server/voice/sttHttpHandler.ts` → `api/stt.ts` |
| Shared credentials | `src/server/voice/credentials.ts` |

## Conversation phases

`idle → listening → thinking → speaking → ready → idle`

Subtle waveform / thinking / speaking animations only — no loading screens.

## Push-to-talk

1. Tap mic → listening starts  
2. Speak (Urdu / Urdu + English names)  
3. Silence auto-stop (~1.8s) **or** tap mic again  
4. Transcript shown → intelligence → spoken reply  

Keyboard: **Alt+Space** toggles mic.

## Environment (server-only)

Reuses the same service account as TTS:

| Variable | Purpose |
|----------|---------|
| `GOOGLE_TTS_CREDENTIALS_JSON` | Preferred on Vercel (also used for STT) |
| `GOOGLE_APPLICATION_CREDENTIALS` | Local JSON path |
| `GOOGLE_STT_CREDENTIALS_JSON` | Optional STT-specific override |

Grant the service account **Cloud Speech-to-Text User** (in addition to Text-to-Speech User).

Never use `VITE_*` for credentials. Audio is not stored after transcription.

## Session history

In-memory only for the open drawer session:

User speech → recognized text → Rafeeq response → timestamp  

Cleared when the drawer closes / service stops. No permanent persistence yet.

## Error recovery (Urdu, retryable)

| Case | User message |
|------|----------------|
| Mic denied | مائیک کی اجازت نہیں ملی… |
| No speech | کوئی آواز نہیں سنائی دی… |
| STT / network failure | آواز سمجھ نہیں آئی… / رابطہ منقطع… |
| TTS failure | آواز دستیاب نہیں… |

Text input always remains available.

## Settings integration (KC-026)

- `voiceResponses` — spoken reply on/off  
- `voiceSpeed` — TTS speaking rate  
- `suggestedQuestions` — chip visibility  
- `dailyGreeting` — welcome line  

## Future roadmap (no redesign required)

- Continuous conversation / barge-in  
- Wake phrase  
- Streaming STT / TTS  
- Additional languages  
- Offline provider abstraction  

## Verify

```bash
npm run verify:voice-conversation
```
