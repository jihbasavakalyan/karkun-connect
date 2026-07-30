# KC-027 — Production Stabilization & Secretary Excellence — KC-ARCH-009 Gate

**Ticket:** KC-027  
**Type:** Bug Fix + Enhancement (stabilization)  
**Standards:** KC-ARCH-001 · KC-ARCH-009 · existing Rafeeq MVP/v2  
**Date:** 2026-07-30  
**Constraint:** No new features; no architecture redesign; no Firestore schema change unless save still fails after live rules/claims are proven. Small logical commits; do not push until verifies pass.

---

## Phase 0 — Root cause & architecture impact

### 0.1 Classification

| Track | Type |
|-------|------|
| Secretary self («میری رپورٹ» / «میری ترجیحات») | Bug Fix + Enhancement |
| Urdu labels in secretary paths | Bug Fix |
| Voice auto-navigate | Bug Fix |
| TTS Urdu pronunciation | Enhancement |
| Execution save failed | Configuration / Environment (primary); code harden only if proven) |
| Duplicate people in search display | Data (+ display hygiene) |

**Primary request type:** Bug Fix + Enhancement (stabilization)

### 0.2 Root cause (evidence)

| Track | Root cause class | Evidence |
|-------|------------------|----------|
| Secretary self | Implementation | «میری رپورٹ» not mapped before `PROFILE_PATTERNS`; empty subject → «کس کارکن کی رپورٹ؟»; `ruknId` unused for first-person (`classifyMvp.ts`, `handlers.ts`) |
| Urdu labels | Implementation | Residual English metric / next-action labels in secretary formatters |
| Voice nav | Implementation | Route resolved + spoken; drawer never `navigate()` (`DigitalRafeeqVoiceDrawer.tsx`, `VoiceConversationService.ts`) |
| TTS | Implementation | Plain Google `input.text`; no lexicon/SSML (`GoogleTTSProvider.ts`) |
| Save failed | Environment / Configuration (primary) | Shared `executions/guidance` has no `ruknId`; repo rules already allow `docId == 'guidance'` (`firestore.rules` L102–112). Production deny ⇒ undeployed rules and/or missing JWT `role` |
| Duplicates | Data (+ display) | Distinct docs same mobile; search already dedupes by id; soft-removed / same-mobile collapse gaps in Rafeeq display |

**STOP rule:** Guidance schema redesign is **out of scope** until ops prove live rules contain `docId == 'guidance'` and JWT has `role == 'rukn'` + `ruknId`, and save still fails.

### 0.3 Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| UI / Components | Y | Voice drawer auto-navigate; persist toast labels (conditional) |
| Pages | N | Existing hosts unchanged |
| Hooks | Y (minor) | Voice drawer `useNavigate` on NAVIGATION turns |
| Services | Y (read) | Official campaign summary, work queue / recommendations / guidance composition |
| Repositories | N (unless harden) | No schema; optional awaitQueuedWrite paths already present |
| Firestore | N (ops first) | Rules already correct in repo; deploy ops; schema change banned unless last resort |
| Authentication / Authorization | Ops check | Prove JWT claims on failing Rukn; no claim-writer changes in app |
| Session / Bootstrap | N | |
| Dashboard / Metrics | Read | `buildOfficialCampaignSummary` / metrics already used |
| Campaign / Automation | Read | Summary + secretary sections only |
| Notifications | N | |
| Voice | Y | Auto-nav + TTS prep aliases |
| API | Y (minor) | `/api/tts` speakable string / SSML prep server-side |
| Caching | N | |
| Persistence | Conditional | Harden toast / await only if save still fails after ops |
| Routing | Y | Voice NAVIGATION → `navigate(route)`; broaden Urdu open patterns |
| State Management | N | |
| Background Tasks | N | |
| Performance | LOW | TTS string prep only |
| Monitoring / Logging | LOW | Existing MVP observability |
| Security | LOW | Read-only secretary; display collapse only for duplicates |
| Dependencies | N | No new packages |

---

## Phase 1 — Regression risk

| Domain | Risk | Notes |
|--------|------|-------|
| Conversation classify collisions | HIGH | «میری رپورٹ» must not steal person reports; «رپورٹ کھولو» must stay NAVIGATION |
| Secretary / campaign intel text | MEDIUM | Must still satisfy prior secretary + campaign-intel verifies |
| Voice navigation | MEDIUM | Auto-nav must not fire for non-NAVIGATION intents; chips remain fallback |
| TTS display vs speak | MEDIUM | Display text unchanged; only speakable prep |
| Persistence / guidance | HIGH (ops) | Do not redesign blob; prove rules + claims first |
| Duplicate display | MEDIUM | Collapse same-mobile in Rafeeq search only — no Firestore hard-merge |
| Auth / bootstrap / dashboard math | LOW | No changes |
| Soft-removed visibility | MEDIUM | Must stay hidden in Rafeeq people hits |

### HIGH items

| Item | Why | Impact | Mitigation | Verification | Rollback |
|------|-----|--------|------------|--------------|----------|
| Classify self vs person | First-person patterns run before PROFILE; bare `میری` must not become a name | Wrong person ask / stolen nav | Match full phrases (`میری رپورٹ`, `میرا جائزہ`, …); require `ruknId` | `verify:rafeeq-secretary` fixtures | Revert secretary commit |
| Guidance save | Production deny may be ops-only | False “save failed” if we invent schema | Ops prove rules string + JWT; code harden only if still failing | `verify:reliability` + KC-027 smoke checklist | Revert execution commit; undeploy rules only via ops |

### Operational classification

| Track | Class | Action |
|-------|-------|--------|
| Save failed (primary) | Configuration / Infrastructure | Prove/redeploy rules; prove claims — **no schema code** until proven |
| True data twins | Data / Ops | Point Admins to Duplicate Resolution / integrityScanner |
| Secretary / voice / display dups | Engineering | Proceed through Phases 2–3 |

---

## Phase 2 — Implementation plan

### Strategy

Reuse official campaign summary + secretary section formatters for first-person; auto-navigate on NAVIGATION voice turns; TTS pronunciation prep without changing display text; ops-first for guidance save; soft-removed + same-mobile collapse in Rafeeq search display only.

### Files to modify / create

| Action | Path |
|--------|------|
| Create | `docs/architecture/kc-027-arch009-gate.md` (this doc) |
| Create | `scripts/verify-kc-027.ts` + `package.json` `verify:kc-027` |
| Edit | `src/conversation/mvp/classifyMvp.ts` — self-report / self-priorities before PROFILE |
| Edit | `src/conversation/mvp/handlers.ts` / `runRafeeqTurn.ts` — `handleRuknSelfReport` dispatch |
| Edit | Secretary formatters — strip residual English |
| Edit | `DigitalRafeeqVoiceDrawer.tsx` — auto `navigate` on NAVIGATION |
| Edit | `classify.ts` / `navigationMap.ts` / optional `universalSearch` MODULE_ALIASES — Urdu open + baitul |
| Edit | `GoogleTTSProvider.ts` (+ prep helper) — Urdu pronunciation aliases |
| Edit | Persist UX / await paths **only if** save still fails after ops proof |
| Edit | Rafeeq `searchPeopleReadOnly` / universal people hits — soft-removed + same-mobile collapse |
| Extend | `scripts/verify-rafeeq-secretary.ts`, `scripts/verify-rafeeq-voice.ts` |

### Not changing

- Firestore schema / per-Rukn guidance docs (unless last resort, separate commit + new gate)
- Duplicate hard-merge in Firestore
- Unrelated WIP (personResolution / communication / assignment dirty files) — leave unstaged
- Secretary Engine planner redesign (`src/conversation/secretary`)

### Commit order

1. `fix(rafeeq): improve secretary intelligence`
2. `fix(voice): improve Urdu pronunciation and command execution`
3. `fix(execution): restore production save pipeline` (ops first; code only if needed)
4. `fix(registry): eliminate duplicate people`
5. Aggregate verify + gate Phase 4–5 update

### Rollback

Revert each commit independently; no migrations.

### Success criteria

- «میری رپورٹ» / «میری ترجیحات» never ask «کس کارکن»; use `ruknId` + official summary / priorities
- Voice NAVIGATION auto-navigates; TTS prep transforms organisational words
- Reliability verify still asserts guidance exception; save smoke checklist documented
- Soft-removed hidden; same-mobile → one person id in Rafeeq search
- `npm run verify:kc-027` green before push

---

## Phase 3 — Verification plan

| Type | Plan |
|------|------|
| Unit | Classify self phrases; TTS prep aliases; same-mobile collapse; soft-removed hidden |
| Integration | `runRafeeqTurn` self-report + priorities; voice nav fixtures resolve routes |
| Regression | `verify:rafeeq-secretary`, `verify:rafeeq-voice`, `verify:rafeeq-campaign-intelligence`, `verify:reliability` |
| Auth / Firestore | Ops checklist: live rules contain `docId == 'guidance'`; JWT `role` + `ruknId` |
| Production smoke | After deploy: Rukn login, «میری رپورٹ», voice open registry, matrix/visit save, search no soft-removed twins |
| Cold start / hard refresh / logout-login | Phase 6 post-deploy |

**Evidence required:** verify script exit 0 + console summaries; rules string proof; claims proof; no “looks fixed”.

---

## Go / No-Go checklist

| # | Question | Answer | If YES: Impact / Mitigation / Regression |
|---|----------|--------|------------------------------------------|
| 1 | Root cause proven? | YES | Evidence table in Phase 0.2 |
| 2 | Objective evidence available? | YES | classify/handlers/drawer/TTS/rules citations |
| 3 | Software problem? | YES (except save primary) | Secretary/voice/dups = code; save = ops first |
| 4 | Could this be configuration? | YES (save) | Prove/redeploy rules + claims before schema |
| 5 | Could this be operational? | YES (duplicates data) | Admin Duplicate Resolution for true twins |
| 6 | Affects bootstrap? | NO | — |
| 7 | Affects authentication? | NO (ops prove claims only) | — |
| 8 | Affects authorization? | NO (rules already in repo) | Ops deploy if live missing |
| 9 | Affects repositories? | NO (unless harden await) | KC-ARCH-001 helpers only |
| 10 | Affects Firestore? | NO schema | Display collapse only |
| 11 | Affects dashboard? | NO | Read summary only |
| 12 | Affects persistence? | CONDITIONAL | Harden toast/await only if save still fails |
| 13 | Affects routing? | YES | Voice auto-nav; broaden Urdu patterns / Mitigation: chips fallback / `verify:rafeeq-voice` |
| 14 | Affects caching? | NO | — |
| 15 | Introduces async dependencies? | LOW | navigate after turn; existing TTS await |
| 16 | Race conditions? | LOW | Single navigate per turn |
| 17 | Impact production startup? | NO | — |
| 18 | Impact existing workflows? | YES | Person report classify order / Mitigation: self patterns before PROFILE, preserve `رپورٹ کھولو` / secretary + voice verifies |

### Plan Go / No-Go decisions

| Item | Decision |
|------|----------|
| Reuse official campaign summary + secretary sections for «میری رپورٹ» | YES |
| Auto-navigate on NAVIGATION voice turns | YES |
| TTS prep/SSML aliases, display text unchanged | YES |
| Guidance per-Rukn schema | NO unless ops proof fails |
| Duplicate hard-merge in Firestore | NO — display collapse + existing Admin wizard |
| Mix commits / push early | NO |

**Proceed?** **GO** for secretary, voice, display-duplicates, gate/verify. **GO with ops-first** for execution save.

---

## KC-027 — Execution save smoke checklist (ops)

| Check | Evidence / action |
|-------|-------------------|
| Repo rules contain `docId == 'guidance'` | `firestore.rules` L102–112; `verify:reliability` asserts |
| Live rules redeployed | **2026-07-30** — `firebase deploy --only firestore:rules --project karkun-connect-75c68` → released successfully |
| JWT on failing Rukn | Manual: Auth → user → custom claims `role == 'rukn'` + `ruknId` (KC-0100 provision). If deny after rules release, fix claims — do **not** invent per-Rukn guidance schema yet |
| Persist UX | Permission on `executions.guidance` surfaces role/ruknId hint (`FRIENDLY_PERSIST_GUIDANCE_PERMISSION_ERROR`) |
| Await durable writes | Matrix/visit use `confirmExecutionSaveFeedback`; baitul/ijtema use `awaitQueuedWrite` — no new paths |
| JIH portal | `compliance.jihPortal` remains Admin-only — no Rukn portal writes without product decision |
| Schema last resort | Per-Rukn guidance docs **banned** unless deny proven after rules+claims |

---

## Phase 4–6

Filled after implementation and production verification.

### Phase 4 — Regression audit

_Pending full aggregate verify._

### Phase 5 — Certification

_Pending — `NOT READY` until `npm run verify:kc-027` green._

### Phase 6 — Post-deploy

_Pending production app deploy + verification (rules already released 2026-07-30)._
