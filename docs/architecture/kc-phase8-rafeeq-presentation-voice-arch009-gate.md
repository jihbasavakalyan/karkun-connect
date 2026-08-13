# KC Phase 8 — Rafeeq Presentation + Voice (TASK-067 / TASK-068) — KC-ARCH-009 Gate

**Ticket:** BATCH-08B / TASK-067 + TASK-068  
**Type:** Enhancement  
**Standards:** KC-ARCH-009 · KC-ARCH-001 · KC-020  
**Authority:** [TASK-066](./kc-phase8-contextual-recommendations-arch009-gate.md) · [KC-020 Rafeeq NBA presenter](./execution-automation-framework.md) · [Digital Rafeeq voice](./digital-rafeeq-voice.md)  
**Date:** 2026-08-13  
**This artifact:** ARCH-009 gate for Rafeeq presentation of TASK-066 recommendations and existing-TTS voice delivery

TASK-069–070 / monitoring / Phase 8 certification / Vercel / Firestore rules / Phase 2 verify string-fix are **out of scope**.

---

## ARCH-009 STATUS

**PASS** (design gate) · **Go/No-Go: GO**

---

## Classification

| Field | Value |
|-------|-------|
| Primary type | **Enhancement** |
| Request | Present TASK-066 `ObjectiveContextualRecommendation` in Digital Rafeeq (Urdu) and speak that same text via existing TTS |
| Not | Second Rafeeq/NBA engine, LLM, new TTS, recommendation DB, autoplay, client credentials |

**STOP checks:**

| Check | Result |
|-------|--------|
| Rafeeq chooses a different action than TASK-066? | **NO** — `actionCode` copied from `recommendation.action.code` |
| New TTS / Google from browser? | **NO** — existing `/api/tts` + `VoiceService` + `RafeeqSpeakButton` |
| Voice required for visual Rafeeq? | **NO** — visual works when `voiceResponses` is off |
| Durable presentation store? | **NO** |

**Persistence decision:** No new SoT.

---

## Layers

```text
ObjectiveContextualRecommendation
        ↓
presentContextualRecommendationForRafeeq   TASK-067
        ↓
Urdu visual (same spokenText)
        ↓
RafeeqSpeakButton → cloudSpeechPlayback → /api/tts → VoiceService   TASK-068
```

| Layer | Responsibility |
|-------|----------------|
| TASK-065/066 | Decision + context |
| TASK-067 | Localize; never change `actionCode` |
| TASK-068 | Speak `spokenText`; respect `voiceResponses` + `voiceSpeed` |

---

## Phase 0 — Impact

| Area | Impacted? | How |
|------|-----------|-----|
| UI | Y | Rukn Home mini line; Rafeeq drawer idle strip |
| Voice | Y | Existing speak button + `/api/tts` |
| Execution package | Y | Presenter next to `presentNextBestActionForRafeeq` |
| Firestore / persistence | N | |
| WI/BM / journey / notifications | N | |

---

## Phase 1 — Risk

| Area | Risk | Mitigation |
|------|------|------------|
| Action override | **HIGH** | Presenter copies `recommendation.action.code` only |
| Second TTS | **HIGH** | No new provider; grep `/api/tts` |
| Credentials on client | **HIGH** | Client talks only to `/api/tts` |
| Autoplay | **MEDIUM** | Gesture-driven `RafeeqSpeakButton`; `voiceAutoPlay` stays unused |
| Campaign Rafeeq copy regression | **MEDIUM** | Phase 8 line only when a presentation exists; else existing `buildContextualRafeeqGuidance` |

---

## Phase 2 — Plan

1. Export shared Urdu-by-code table; add `NO_EVALUATION_ACTION` / `RECORD_PENDING_ACTIVITY`  
2. Pure `presentContextualRecommendationForRafeeq`  
3. Compact strip in existing drawer + optional Home `guidanceLine`  
4. Speak `spokenText` via existing button  
5. Focused verify  

**Rollback:** revert the single commit.

---

## Phase 3 — Verification

`typecheck` · `build` · TASK-063–066 · KC-020 · `verify:rafeeq-voice` · `verify:voice-conversation` · settings · reliability · Phase 3–7

Browser: UNVERIFIED if no credentials.

---

## Go / No-Go

| # | Question | Answer |
|---|----------|--------|
| 1–3 | Proven software enhancement? | YES — structured recommendation exists; Rafeeq does not present it |
| 4–8 | Config / ops / bootstrap / auth? | NO |
| 9 | Repositories? | YES — read via TASK-066 loader |
| 10–12 | Firestore / dashboard rewrite / persistence writes? | NO — Home/drawer presentation only |
| 13 | Routing? | YES — existing `routeHint` as Link |
| 14–16 | Cache / async TTS / races? | YES — existing speak adapter; no new queue |
| 17 | Production startup? | NO |
| 18 | Existing workflows? | YES — execution NBA Urdu + voice conversation unchanged |

**May implementation start?** YES
