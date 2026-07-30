# KC-028B — Production Write Lifecycle Stabilization — KC-ARCH-009 Gate

**Ticket:** KC-028B  
**Type:** Bug Fix + Enhancement (stabilization — reliability, not features)  
**Standards:** KC-ARCH-001 · KC-ARCH-009 · reuse KC-0098 `singleActionGuard` / `useBusyAction` / `awaitQueuedWrite`  
**Date:** 2026-07-30  
**Constraint:** No UI redesign · no Firestore schema redesign · no repository redesign · reuse existing architecture · small commits · do not push until typecheck + `verify:kc-028b` + manual smoke pass.

---

## Phase 0 — Root cause & architecture impact

### 0.1 Classification

| Track | Type |
|-------|------|
| Unified write lifecycle manager | Enhancement (shared reliability) |
| Inbox Approve / Reject durability + stale Pending | Bug Fix |
| Duplicate click → false “Already processed” | Bug Fix |
| Visit / Ijtema / Baitul / JIH / Communication / Guidance ACK + feedback | Bug Fix + Enhancement |
| Performance stage instrumentation | Enhancement (observability) |

**Primary request type:** Bug Fix + Enhancement (stabilization)

### 0.2 Root cause (evidence)

| Symptom | Root cause class | Evidence |
|---------|------------------|----------|
| Approve / reject feel slow; no feedback | Implementation | Inbox uses ad-hoc `busyId`; Reject is sync + fire-and-forget `awaitKarkunRequestsPersist`; English “Approving…” only; no shared progress/slow copy |
| Visit “not saved” / slow BM / Ijtema / Communication | Implementation | Mix of `confirmExecutionSaveFeedback`, labeled `awaitQueuedWrite`, or neither; Communication history `appendHistoryRecord` never awaits queue; Guidance CommitmentPanel fire-and-forget |
| Multi-click / no feedback | Implementation | Some screens lack `useBusyAction` / exclusive keys; busy message delayed or absent |
| “Already processed” while still Pending | Implementation | `approveNewKarkunRequest` returns `alreadyProcessedResult()` when `approveInFlight` has the same id instead of joining the in-flight Promise (`karkunRequestService.ts`) |
| Pending counters / stale cards | Implementation | Reject/UI refresh before Firestore ACK; no post-ACK refresh protocol; concurrent admin relies on snapshot but local reject path can race |

**STOP rule:** Not Configuration/Infrastructure as primary — queue + `awaitQueuedWrite` already exist; UX/lifecycle wiring and one approve de-dupe bug are proven in code. No schema redesign.

### 0.3 Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| UI / Components | Y | Progress Urdu; disable actions; Inbox / Pending queue / modals / Quick Actions / CommitmentPanel |
| Pages | Y | Admin Inbox; Weekly Ijtema; Monthly Baitul Maal (progress wiring) |
| Hooks | Y | New `useWriteLifecycle`; reuse `useBusyAction` / `singleActionGuard` |
| Services | Y | Reject becomes async + await persist; approve joins in-flight; Communication await queue; optional guidance await |
| Repositories | Y (call sites only) | Continue `awaitQueuedWrite` / `queueWrite` — no redesign |
| Firestore | N schema | Same docs/labels; ACK awaited more consistently |
| Auth / Session / Bootstrap | N | |
| Dashboard / Metrics / Counters | Y | Post-ACK refresh of inbox counters / ticks |
| Campaign / Automation | N logic | Execution matrix callers only |
| Notifications / Voice / API | N | Communication API path unchanged; history persist ACK only |
| Caching / Persistence | Y | Lifecycle: Writing → Server ACK → refresh |
| Routing | N | |
| State Management | Y | Store notify after ACK; remove stale Pending after resolve |
| Background Tasks | LOW | Existing queue chains |
| Performance / Monitoring / Logging | Y | Stage timings `[KC-028B]` |
| Security | LOW | No rules change |
| Dependencies | N | No new packages |

---

## Phase 1 — Regression risk

| Domain | Risk | Notes |
|--------|------|-------|
| Persistence / Firestore ACK | HIGH | More awaits may lengthen busy UI; must not double-await incorrectly or hang |
| Inbox approve concurrency | HIGH | Joining in-flight vs ALREADY_PROCESSED changes duplicate-click semantics |
| Reject API sync → async | MEDIUM | Callers must await |
| Guidance shared blob | MEDIUM | Await `executions.guidance` after mutate |
| Communication history | MEDIUM | Await `communications` after append |
| Dashboard / bootstrap / auth | LOW | Untouched |
| Race (multi-admin) | HIGH | Snapshot + post-ACK refresh; disable while busy |

### HIGH items

| Item | Why | Impact | Mitigation | Verification | Rollback |
|------|-----|--------|------------|--------------|----------|
| ACK await | Wrong label / hang | Stuck buttons | Reuse existing labels; timeout + Urdu timeout error; `runExclusive` finally clears busy | `verify:kc-028b` timing + timeout paths | Revert lifecycle commits |
| Approve in-flight join | Second click awaited | Wrong if caller expected ALREADY_PROCESSED | Join Promise; UI still disabled | Duplicate-click fixture | Revert service change |
| Multi-admin Pending | Stale card | Wrong folder | Resolve before ACK; refresh tick after ACK; snapshot already updates peers | Concurrent admin checklist | Revert inbox wiring |

### Operational classification

Engineering — proceed. Not ops-only.

---

## Phase 2 — Implementation plan

### Strategy

Introduce one `runWriteLifecycle` + `useWriteLifecycle` on top of KC-0098 / KC-ARCH-001 (`tryBeginAction`, `runExclusive`, `awaitQueuedWrite`, `toOperatorPersistError`). Wire listed modules; fix approve in-flight; make reject durable; Urdu progress/errors; stage logs. No schema/repo redesign.

### Files

| Action | Path |
|--------|------|
| Create | `docs/architecture/kc-028b-arch009-gate.md` |
| Create | `src/lib/reliability/writeLifecycle.ts` |
| Create | `src/hooks/useWriteLifecycle.ts` |
| Edit | `src/lib/reliability/index.ts`, `persistErrors.ts` (Urdu write codes) |
| Edit | `src/services/karkunRequestService.ts` — join in-flight; async reject + await |
| Edit | `AdminInboxPage.tsx`, `PendingKarkunRequestQueue.tsx` |
| Edit | `NewKarkunRequestModal.tsx`, `NewMuttafiqRequestModal.tsx` |
| Edit | `ConnectionQuickActionsPanel.tsx` (+ matrix paths as needed) |
| Edit | `WeeklyIjtemaRegisterPage.tsx`, `RuknMonthlyBaitulMaalPage.tsx` |
| Edit | `communicationService.ts` — await `communications` |
| Edit | `CommitmentPanel.tsx` — await guidance |
| Create | `scripts/verify-kc-028b.ts` + `package.json` `verify:kc-028b` |

### Order / commits

1. `fix(sync): introduce unified write lifecycle`  
2. `fix(inbox): synchronize processed request state`  
3. `fix(execution): stabilize execution persistence`  
4. `fix(ui): prevent duplicate submissions`  
5. `fix(performance): instrument Firestore write timings`

### Rollback

Revert KC-028B commits; prior `useBusyAction` / fire-and-forget reject restored.

### Success criteria

Every listed write: immediate busy + Urdu progress; no duplicate submit; Firestore ACK before success; refresh repos/counters/UI; no stale Pending after process; stage timings logged; `verify:kc-028b` green.

---

## Phase 3 — Verification plan

| Type | Plan |
|------|------|
| Unit | Lifecycle phases, duplicate key coalesce, error classification Urdu, slow-after-3s message, timeout |
| Integration (static) | Module call sites use lifecycle / await labels; approve joins inflight; reject awaits persist |
| Regression | `verify:reliability` still green |
| Performance | Stage durations present in lifecycle log API |
| Production smoke (manual) | Admin approve/reject; Visit; Ijtema; BM; Communication; Guidance — feedback + refresh |

Evidence: `npm run verify:kc-028b` exit 0 + typecheck. Reject “looks fixed”.

---

## Go / No-Go checklist

| # | Question | Answer |
|---|----------|--------|
| 1 | Root cause proven? | **YES** — code evidence above |
| 2 | Objective evidence? | **YES** — service/UI paths audited |
| 3 | Software problem? | **YES** |
| 4 | Could be configuration? | Partial for some slow networks — lifecycle still required for UX |
| 5 | Operational only? | **NO** |
| 6 | Affect bootstrap? | **NO** |
| 7 | Affect authentication? | **NO** |
| 8 | Affect authorization? | **NO** (no rules change) |
| 9 | Affect repositories? | **YES** — call `awaitQueuedWrite` only · Impact: longer busy · Mitigation: timeout · Tests: verify |
| 10 | Affect Firestore? | **YES** — await ACK · same docs · Mitigation: existing queue · Tests: verify |
| 11 | Affect dashboard? | **YES** — counter refresh after ACK · Mitigation: tick/notify · Tests: inbox fixtures |
| 12 | Affect persistence? | **YES** — central lifecycle · Mitigation: reuse ARCH-001 · Tests: reliability + kc-028b |
| 13 | Affect routing? | **NO** |
| 14 | Affect caching? | **YES** — post-ACK refresh · Mitigation: existing store reload/notify |
| 15 | Async dependencies? | **YES** — reject async · Mitigation: await all callers |
| 16 | Race conditions? | **YES** — multi-admin / duplicate click · Mitigation: join inflight + exclusive keys |
| 17 | Production startup? | **NO** |
| 18 | Existing workflows? | **YES** — Impact: busy until ACK · Mitigation: Urdu progress/slow · Tests: module verifies |

**Proceed:** **GO**

---

## Phase 4–6

### Phase 4 — Regression audit

- `npm run verify:kc-028b` exit 0 (Urdu progress/errors, duplicate coalesce, slow path, timeout, refresh hooks, ACK stages, module wiring, `verify:reliability`)
- `npx tsc --noEmit` exit 0
- Approve in-flight joins Promise (no false ALREADY_PROCESSED while Pending)
- Reject awaits `settings.karkunRequests` before success UI
- No schema / repository redesign; reuse `awaitQueuedWrite` + `singleActionGuard`

### Phase 5 — Certification

**READY WITH KNOWN LIMITATIONS**

- CampaignExecutionMatrix still uses `useBusyAction` + `confirmExecutionSaveFeedback` (Quick Actions path fully on write lifecycle)
- Concurrent multi-admin still relies on existing Firestore snapshot hydrate for peer updates; local busy disable covers same-client duplicate clicks
- Manual production smoke still required before push

### Phase 6 — Post-deploy

Pending production deploy + verification.
