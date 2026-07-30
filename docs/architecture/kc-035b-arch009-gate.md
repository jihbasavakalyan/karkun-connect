# KC-035B — KC-ARCH-009 Gate (Natural Urdu Intent Recognition Engine)

**Classification:** New Feature (infrastructure)  
**Standards:** KC-ARCH-001 · KC-ARCH-009  
**Request type:** New Feature — intent recognition only (no workflow / CRUD / STT)

## Phase 0 — Root cause & impact

**Problem:** Digital Rafeeq needs a canonical, natural-Urdu intent engine independent of UI/voice/workflows. KC-035A provides conversation context; KC-035B understands utterances into typed intents + entities + confidence.

**Reuse:** Read KC-035A `ConversationContext` (no mutation). Do **not** replace MVP `classifyMvp` / KC-0131.3 intent stack in this sprint — additive module under `src/intents/`.

### Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| `src/intents/**` (new) | Y | Models, registry, matchers, extractors, confidence, Urdu normalize, engine |
| KC-035A conversation | Y | Read-only context input |
| MVP classify / voice drawer / workflows / repos | N | Untouched |
| Firestore / metrics / KC-034 report | N | — |

## Phase 1 — Regression risk

| Domain | Risk | Mitigation |
|--------|------|------------|
| Existing Rafeeq | LOW | No wiring into `runRafeeqTurn` execution |
| KC-035A | LOW | Import types only; no state writes |
| Typecheck | MEDIUM | Strong enums + `verify:kc-035b` |

No HIGH items. **GO.**

## Phase 2 — Plan

1. `src/intents/{models,registry,matchers,extractors,confidence,urdu,engine}`
2. Registry for Information / Updates / Navigation / Search / Administration / Conversation
3. Confidence policy centralized; Urdu normalization; entity extraction with context pronouns
4. `verify:kc-035b` + scoped eslint + typecheck
5. Commit, push, deploy, certify

## Phase 3 — Verification

- `npm run verify:kc-035b`
- `npm run typecheck`
- Scoped eslint on `src/intents`
- `verify:kc-035a` regression
- Production SHA + asset smoke

## Go / No-Go

| # | Answer |
|---|--------|
| Workflow / CRUD? | NO |
| Mutate conversation? | NO |
| Proceed? | **GO** |

---

## Phase 4 — Regression audit

- `verify:kc-035b` 11/11
- `verify:kc-035a` regression
- Scoped eslint on `src/intents`
- `typecheck` clean
- No MVP / workflow / repo mutations

## Phase 5 — Certification

**READY** — recognition infrastructure only.

## Phase 6 — Post-deploy

Filled after production SHA verification.
