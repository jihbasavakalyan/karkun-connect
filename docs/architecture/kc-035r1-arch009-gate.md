# KC-035R1 — KC-ARCH-009 Gate (Digital Rafeeq Operational Recovery)

**Classification:** Bug Fix (operational recovery — no architecture redesign)  
**Standards:** KC-ARCH-001 · KC-ARCH-009  
**Master contract:** [KC-035 Digital Rafeeq 2.0](./kc-035-digital-rafeeq-2.md)

## Phase 0 — Root cause & impact

**Problem:** KC-035 A–G layers are implemented and verified in isolation, but the live voice drawer still routes intelligence through MVP `runRafeeqTurn`. Dialogue navigation results are never applied to React Router; FIND_PERSON / SHOW_* intents that lack workflow handlers collapse to generic acknowledgements; English acceptance commands are under-represented in the KC-035 intent registry; pipeline stage observability is incomplete.

**Root cause class:** Implementation  
**Evidence:**
- `DigitalRafeeqVoiceDrawer.answerFn` → `runRafeeqTurn` (MVP), not `DigitalRafeeqService.processDialogueTurn`
- Dialogue `route_navigation` returns `navigation.route` but UI only auto-navigates MVP `intentCode === 'NAVIGATION'`
- `WorkflowRegistry` has no FIND_PERSON / SHOW_PENDING_TASKS / SHOW_WEEKLY_IJTEMA handlers → executor returns generic `WORKFLOW_URDU.acknowledge`
- Intent patterns are Urdu-primary; acceptance strings are English (`Open Dashboard`, `Search Mohammad Aslam`, …)

### Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| Voice UI / drawer | Y | Wire KC-035 turn + execute nav |
| Dialogue / Intent / Workflow / Navigation | Y | Routing + English patterns + search bridge |
| STT / TTS services | Y | Stage logging + failure handling (no redesign) |
| Dev diagnostic overlay | Y | DEV-only panel |
| Firestore / auth / dashboard bootstrap | N | Untouched |
| Campaign / report PDF | N | Untouched |

## Phase 1 — Regression risk

| Domain | Risk | Mitigation |
|--------|------|------------|
| MVP Rafeeq path | MEDIUM | Keep MVP as fallback for unknown / campaign intel |
| Navigation routes | MEDIUM | Reuse `resolveVoiceNavigation` + existing ROUTES |
| Intent confidence bands | LOW | No threshold forks |
| Voice STT/TTS | MEDIUM | Logging + existing error paths only |
| Bootstrap / auth | LOW | No changes |

HIGH items: none that require speculative code. **GO.**

## Phase 2 — Implementation plan

1. Operational turn bridge: STT text → Dialogue → Intent → Workflow/Nav/Search → OpsAnswer
2. Auto-navigate on `navigated` results; secretary Urdu from KC-035G/F copy
3. FIND_PERSON → reuse `searchUniversal` (existing service)
4. English operational patterns + person-name extraction
5. Route SHOW_WEEKLY_IJTEMA / SHOW_REPORT / SHOW_PENDING_TASKS / SHOW_DASHBOARD via voice navigation where appropriate
6. DEV diagnostic overlay + full pipeline stage logs
7. `verify:kc-035r1` + prior KC-035 verifies

## Phase 3 — Verification

- Acceptance English commands: Dashboard, Registry, Weekly Ijtema, Baitul Maal, Reports, Activities, Search Mohammad Aslam, Pending Follow-up
- Each: transcript → intent → workflow/nav → action → Urdu reply
- STT error paths: silence / denied / network (logged)
- TTS: speak after successful turn; unavailable/interrupt handled
- Objective: verify script JSON + typecheck

## Go / No-Go

| # | Answer |
|---|--------|
| Redesign KC-035 layers? | NO |
| Duplicate business logic? | NO — reuse search / navigation / dialogue |
| Bypass repositories? | NO |
| Proceed? | **GO** |

---

## Phase 4 — Regression audit

Workflows / paths tested:
- Acceptance English commands → intent → dialogue → navigate/search
- KC-035A/B/C/D/E/F/G verify scripts green
- `verify:kc-035r1` green (5/5)
- Typecheck green

## Phase 5 — Certification

**READY** for production deploy (operational recovery — wires existing KC-035 layers into live voice UI).

## Phase 6 — Post-deploy

| Check | Result |
|-------|--------|
| GitHub HEAD | `64cf66c` on `origin/main` |
| Vercel | `dpl_2Kj9a7dV3XM6RSy755dv9H9nXkSq` READY (53s) |
| Production URL | https://jihbasavakalyan.org |
| Bundle smoke | `processDialogueTurn`, `executePersonSearch`, secretary Urdu nav copy, `فالواپباقی` present |
| Acceptance commands | Verified via `verify:kc-035r1` + production façade markers |
| Prior KC-035 A–G | verify scripts green |

**Production Certification: READY — Release Complete**
