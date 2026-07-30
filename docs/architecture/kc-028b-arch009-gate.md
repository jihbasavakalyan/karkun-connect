# KC-028B — Firestore Write Lifecycle Stabilization — KC-ARCH-009 Gate

**Ticket:** KC-028B  
**Type:** Bug Fix + Enhancement (production reliability / persistence)  
**Standards:** KC-ARCH-001 · KC-ARCH-009 · reuse KC-0098 `singleActionGuard` · existing `awaitQueuedWrite`  
**Date:** 2026-07-31  
**Constraint:** No UI redesign · no Firestore schema · no business/campaign/report/PDF/Rafeeq/notification changes · no repository redesign — shared lifecycle + ACK + retry only.

---

## Phase 0 — Root cause & architecture impact

### 0.1 Classification

| Track | Type |
|-------|------|
| Shared write lifecycle (phases + ACK + refresh) | Enhancement (reliability framework) |
| Transient retry with exponential backoff | Enhancement |
| Unified write error classification | Enhancement |
| `[WRITE]` diagnostics | Enhancement (observability) |
| Repository commit helper + assignment ACK | Enhancement |
| Duplicate-submit coalesce (existing) | Bug Fix (already landed; preserved) |

**Primary:** Enhancement (stabilization) building on prior KC-028B landing (`7438478` et al.)

### 0.2 Root cause

| Gap vs acceptance | Class | Evidence |
|-------------------|-------|----------|
| No automatic retry for timeout/network/unavailable | Implementation | `writeLifecycle.ts` timed out once; no backoff loop |
| Diagnostics used `[KC-028B]` not `[WRITE]` contract | Implementation | `markStage` console.info |
| Assignment mutations fire-and-forget queue | Implementation | `assignmentStore.persistAssignmentState` → `saveState` without await |
| Phase vocabulary vs product brief | Implementation | submitting/server_ack vs validating/committed |

Prior inbox/visit/ijtema/BM/comm ACK wiring already exists — do not rewrite.

**STOP:** Not Configuration/Infrastructure primary. Proceed with framework completion.

### 0.3 Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| UI / Pages / Digital Rafeeq / PDF / Report | N | No screen redesign this pass |
| Hooks | LOW | Compatible with existing `useWriteLifecycle` |
| Services | LOW | Assignment public APIs await `connections` ACK after success |
| Repositories | Y call-site helper only | Shared `commitRepositoryWrite`; queue unchanged |
| Firestore schema / rules | N | |
| Auth / Bootstrap / Campaign calc | N | |
| Dashboard counters | Y via existing refresh hooks | Post-ACK refresh protocol preserved |
| Persistence / Monitoring | Y | Retry + `[WRITE]` logs |
| Dependencies | N | |

---

## Phase 1 — Regression risk

| Domain | Risk | Notes |
|--------|------|-------|
| Retry storms | MEDIUM | Cap attempts; never retry permission/validation/missing |
| Assignment ACK latency | MEDIUM | Success returns wait for queue; timeout via lifecycle when used |
| Phase rename compat | LOW | Keep aliases (`submitting`/`server_ack`) |
| Persistence integrity | LOW | Same `awaitQueuedWrite` |

### HIGH

None in durability schema. Retry classified MEDIUM.

| Item | Why | Impact | Mitigation | Verification | Rollback |
|------|-----|--------|------------|--------------|----------|
| Retry | Wrong retry of permission | Noise / lockouts | `isRetryableWriteError` denylist | verify:kc-028b | Revert lifecycle |

### Operational

Engineering — GO.

---

## Phase 2 — Implementation plan

### Strategy

Complete the shared lifecycle: validating → writing → committed → refreshing → completed; exponential backoff for transient only; `[WRITE]` logs; `commitRepositoryWrite` helper; assignment success awaits `connections`; extend verify. Preserve existing UI wiring.

### Files

| Action | Path |
|--------|------|
| Edit | `docs/architecture/kc-028b-arch009-gate.md` |
| Edit | `src/lib/reliability/writeLifecycle.ts` |
| Create | `src/lib/reliability/repositoryWrite.ts` |
| Edit | `src/lib/reliability/index.ts` |
| Edit | `src/services/assignmentService.ts` (ACK flush only) |
| Edit | `scripts/verify-kc-028b.ts` |

### Commit

`feat(firestore): stabilize write lifecycle with ACK, refresh, and retry framework (KC-028B)`

### Success criteria

ACK before success; shared lifecycle; duplicate coalesce; refresh hooks; unified errors; retry transient only; verify + tsc clean.

---

## Phase 3 — Verification

| Check | Method |
|-------|--------|
| Lifecycle / retry / offline / permission / timeout | `npm run verify:kc-028b` |
| ARCH-001 | nested `verify:reliability` |
| Types | `npx tsc -b` |

Reject “looks stable” without verify PASS.

---

## Go / No-Go

| Question | Answer |
|----------|--------|
| Schema change? | NO |
| UI redesign? | NO |
| Business / campaign / report change? | NO |
| Presentation-only? | NO — reliability framework |
| Proceed? | **GO** |

---

## Phase 4 — Post-implementation audit

| Area | Result |
|------|--------|
| UI / Report / PDF / Rafeeq / Notifications | Untouched this pass |
| Schema / metric engines / campaign calc | Untouched |
| Shared lifecycle | validating → writing → committed → refreshing → completed; failed on error |
| Retry | Transient only (timeout/network/offline); exponential backoff; max 3 |
| Diagnostics | `[WRITE]` logs with operation / repository / documentId / duration |
| Assignment | Success paths await `connections` ACK via `withConnectionsAck` |
| Existing inbox / visit / ijtema / BM / comm wiring | Preserved |

**Verified:** `npm run verify:kc-028b` PASS · nested `verify:reliability` PASS · `tsc -b` clean

---

## Phase 5 — Certification

**READY WITH KNOWN LIMITATIONS**

1. Some screens still use `useBusyAction` (e.g. CampaignExecutionMatrix bulk matrix) — Quick Actions path is on full lifecycle.
2. Timeout cancels the outer Promise but cannot abort an in-flight Firestore SDK call mid-flight.
3. Production log volume is filtered; full `[WRITE]` stream is development-oriented.

Deploy not banned. Manual production smoke / permission validation deferred (out of sprint).

---

## Phase 6 — Post-deploy / smoke

Deferred per sprint instruction (no production smoke or permission validation in this sprint).

---

## Permanent rules compliance

Think → Prove → Reuse → Measure → Verify → Certify  
Evidence-driven; reuse ARCH-001 queue; no speculative schema redesign.
