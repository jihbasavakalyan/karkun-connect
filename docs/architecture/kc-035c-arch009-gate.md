# KC-035C — KC-ARCH-009 Gate (Operational Workflow Engine)

**Classification:** New Feature (orchestration infrastructure)  
**Standards:** KC-ARCH-001 · KC-ARCH-009  
**Request type:** New Feature — workflow orchestration only (no STT / LLM / voice UI)

## Phase 0 — Root cause & impact

**Problem:** KC-035A remembers and KC-035B understands; Rafeeq still needs a typed workflow layer that orchestrates existing services for multi-step operational conversations.

**Reuse:** Matrix/write adapters, `buildPersonSecretaryFacts`, KC-035A clarification + session, KC-035B intents. Do **not** duplicate visit/ijtema/BM/app business logic.

### Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| `src/workflows/**` (new) | Y | Registry, executor, handlers, responses, policies |
| DigitalRafeeqService | Y | Thin `runWorkflow` façade (optional entry) |
| KC-035A / KC-035B | Y | Read/write conversation slots; consume intents |
| MVP classify / report PDF / Firestore schemas | N | Untouched |

## Phase 1 — Regression risk

| Domain | Risk | Mitigation |
|--------|------|------------|
| Existing Rafeeq MVP | LOW | Additive service method; no change to `runRafeeqTurn` path |
| Canonical metrics | LOW | Refresh via existing builders/providers only |
| Typecheck | MEDIUM | Strong models + `verify:kc-035c` |

No HIGH. **GO.**

## Phase 2 — Plan

1. Models + registry + definitions for 5 workflows  
2. Executor (permissions, clarification, confirm, execute, recover)  
3. Handlers calling Matrix / write adapters / person secretary  
4. Central Urdu response builder + next-action policy  
5. `verify:kc-035c` + deploy/certify  

## Phase 3 — Verification

- `npm run verify:kc-035c`
- typecheck + scoped eslint
- `verify:kc-035a` / `verify:kc-035b` regression
- Production SHA + asset smoke

## Go / No-Go

| # | Answer |
|---|--------|
| Duplicate business logic? | NO |
| Bypass repositories? | NO |
| Proceed? | **GO** |

---

## Phase 4 — Regression audit

Workflows tested:
- Registry discovery (5 workflows, intent map)
- Clarification when person missing (KC-035A framework)
- Confirm → execute → cancel / resume / restart / timeout
- Show person details + record visit failure path
- Permissions for rukn/admin
- KC-035A / KC-035B verify scripts green (unaffected)

## Phase 5 — Certification

**READY** for production deploy (orchestration-only; adapters call existing services).

## Phase 6 — Post-deploy

| Check | Result |
|-------|--------|
| GitHub HEAD | `2ab762f` on `origin/main` |
| Vercel | `dpl_6PtmSynN1TTJm63St29BMNxSaTGe` READY |
| Production URL | https://jihbasavakalyan.org |
| Bundle smoke | `runOperationalWorkflow`, `SHOW_PERSON_DETAILS`, `RECORD_VISIT`, visit-saved Urdu, `recognizeUrduIntent` present |
| KC-035A / KC-035B | verify scripts green; intent markers in prod bundle |

**Production Certification: READY — Release Complete**
