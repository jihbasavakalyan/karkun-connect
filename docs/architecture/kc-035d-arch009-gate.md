# KC-035D — KC-ARCH-009 Gate (Dialogue Manager)

**Classification:** New Feature (dialogue orchestration)  
**Standards:** KC-ARCH-001 · KC-ARCH-009  
**Master contract:** [KC-035 Digital Rafeeq 2.0](./kc-035-digital-rafeeq-2.md)  
**Request type:** New Feature — turn management only (no STT/TTS, no LLM, no recommendation engine, no voice UI)

## Phase 0 — Root cause & impact

**Problem:** KC-035A remembers, KC-035B understands, KC-035C executes — but multi-turn control (interruptions, context switches, corrections, repair, resume/cancel/restart as a coherent dialogue) is not centralized. WorkflowExecutor handles some control intents; ConversationEngine holds slots. Operators need a Dialogue Manager that owns turn policy without duplicating business rules.

**Reuse:** ConversationSessionManager + memory, IntentEngine, WorkflowExecutor (cancel/resume/restart/timeout/run), SECRETARY_URDU / WORKFLOW_URDU.

### Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| `src/dialogue/**` (new) | Y | Manager, policies, responses |
| `DigitalRafeeqService` | Y | Thin `processDialogueTurn` façade |
| KC-035A / B / C | Y | Called by dialogue; contracts preserved |
| MVP classify / report PDF / Firestore | N | Untouched |
| Recommendation / Voice UI | N | Out of scope (035E/F) |

## Phase 1 — Regression risk

| Domain | Risk | Mitigation |
|--------|------|------------|
| Existing Rafeeq MVP path | LOW | Additive service method |
| Workflow execution | MEDIUM | Dialogue delegates to executor; verify cancel/resume unchanged |
| Intent recognition | LOW | Read-only consume |
| Typecheck | MEDIUM | Strong models + `verify:kc-035d` |

No HIGH. **GO.**

## Phase 2 — Implementation plan

1. Models + dialogue move classifier (interrupt / switch / correct / repair / control)
2. DialogueManager turn loop: recognize → classify → conversation sync → workflow delegate
3. Central dialogue Urdu acknowledgements (extend secretary tone; no software wording)
4. `DigitalRafeeqService.processDialogueTurn`
5. `npm run verify:kc-035d` + typecheck + scoped eslint
6. Commit / push / production certify

## Phase 3 — Verification

- Registry of dialogue moves + interrupt / switch / correct / repair / resume / cancel / restart
- Multi-turn clarification then execute
- `verify:kc-035a` / `035b` / `035c` regression
- Production SHA + bundle smoke (`processDialogueTurn` / dialogue markers)

## Go / No-Go

| # | Answer |
|---|--------|
| Duplicate visit/ijtema/BM logic? | NO |
| Bypass repositories? | NO |
| Fork confidence thresholds? | NO |
| Proceed? | **GO** |

---

## Phase 4 — Regression audit

Workflows / dialogue moves tested:
- Move classifier (cancel, correction markers)
- Cancel / resume / restart
- Interruption (pending confirm → new operational intent)
- Context switch + correction repair
- Repeat / help / multi-turn clarification routing
- KC-035A / B / C verify scripts green

## Phase 5 — Certification

**READY** for production deploy (dialogue orchestration only).

## Phase 6 — Post-deploy

Filled after Vercel READY + production smoke.
