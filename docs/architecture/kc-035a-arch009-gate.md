# KC-035A — KC-ARCH-009 Gate (Digital Rafeeq Conversation Engine Foundation)

**Classification:** New Feature (infrastructure)  
**Standards:** KC-ARCH-001 · KC-ARCH-009  
**Request type:** New Feature — conversation engine foundation only (no intent/workflow/STT/TTS)

## Phase 0 — Root cause & impact

**Problem:** Live Rafeeq voice path uses thin MVP turn memory; KC-035A requires a typed, persistent conversation engine (session, context, state machine, clarification, secretary style) for Voice OS sprints KC-035B–E.

**Reuse:** Existing KC-0131.1 foundation + MVP session IDs remain; do **not** invent Firestore conversation SoR or parallel intent engines.

### Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| `src/conversation/engine/*` (new) | Y | Session, context, SM, resolver, clarification, Urdu style |
| MVP `session.ts` bridge | Y | Thin sync of person/clear — no business logic |
| Voice drawer / STT / TTS / intent / workflows | N | Out of scope |
| Firestore / repos / metrics / automation | N | — |
| Existing foundation KC-0131.1 | N | Untouched contracts |

## Phase 1 — Regression risk

| Domain | Risk | Mitigation |
|--------|------|------------|
| Existing Rafeeq Q&A / safe actions | LOW | Bridge is additive; no change to `runRafeeqTurn` intent paths |
| Foundation verify:kc-0131.1 | LOW | Separate package; do not alter foundation states |
| Typecheck | MEDIUM | Strong types + `verify:kc-035a` |

No HIGH items. Proceed.

## Phase 2 — Plan

1. Add `src/conversation/engine/` (types, SM, session, memory, resolver, clarification, secretary Urdu).
2. Thin MVP bridge for session id sharing / person sync / clear.
3. `scripts/verify-kc-035a-conversation-engine.ts` + `npm run verify:kc-035a`.
4. Commit, push, deploy, smoke, certify.

## Phase 3 — Verification

- `npm run verify:kc-035a`
- `npm run typecheck` (+ lint if available)
- Existing `verify:digital-rafeeq` / `verify:rafeeq-mvp-bridge` or `verify:voice-conversation` smoke
- Production SHA match after deploy

## Go / No-Go

| # | Answer |
|---|--------|
| Business logic in engine? | NO |
| Intent / workflow / voice I/O? | NO |
| Proceed? | **GO** |

---

## Phase 4 — Regression audit

- `verify:kc-035a` 7/7
- `verify:kc-0131.1` 7/7 (foundation unaffected)
- `verify:kc-rafeeq-mvp-bridge` 10/10
- `typecheck` clean
- Scoped eslint on new engine paths clean (repo-wide lint has pre-existing failures)

## Phase 5 — Certification

**READY** — infrastructure-only; existing Rafeeq paths additive bridge only.

## Phase 6 — Post-deploy

Filled after production SHA verification.
