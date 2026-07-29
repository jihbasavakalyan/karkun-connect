# KC-0131.1 — Conversation Foundation — KC-ARCH-009 Gate

**Ticket:** KC-0131.1  
**Type:** New Feature (architecture foundation only)  
**Standards:** DRDS v1.0 (Approved Baseline) · DRDS-ARR-v1.0 · KC-ARCH-001 · KC-ARCH-009  
**Date:** 2026-07-29  
**Coding authorized after:** Phases 0–3 + Go/No-Go below  

---

## Phase 0 — Root cause & impact

### 0.1 Classification

**New Feature** — establishes DRDS-aligned conversation infrastructure abstractions. No bug fix; no production incident.

### 0.2 Root cause

N/A (not a bug). Product decision: implement DRDS §21.1 Conversation Foundation as pure architecture.

### 0.3 / 0.4 Impact Matrix

| Area | Impacted? | How | Notes |
|------|-----------|-----|-------|
| UI | N | No wiring | Explicit non-scope |
| Pages / Components / Hooks | N | — | — |
| Services (business) | N | Not modified | — |
| Repositories | N | No access | — |
| Firestore | N | No access | — |
| Authentication / Authorization | N | Types may mirror role strings only | No auth changes |
| Session Management (auth) | N | Conversation session only (in-memory) | Ephemeral |
| Bootstrap / Dashboard | N | — | — |
| Campaign / Automation / Voice / API | N | No integration this sprint | — |
| Persistence / Caching / Routing | N | No persistence | — |
| State Management | N | New module only | Not wired to stores |
| Dependencies | N | No new runtime deps | — |
| Conversation (existing KC-004) | Y (additive) | New `foundation/` sibling module | No behaviour change to existing engine |
| Monitoring / Logging / Security | N | No new surfaces | — |

---

## Phase 1 — Regression risk

| Category | Risk | Notes |
|----------|------|-------|
| Data Integrity | LOW | No writes |
| Persistence | LOW | No persistence |
| Authentication / Authorization | LOW | No changes |
| Bootstrap / Dashboard | LOW | No wiring |
| Repositories / Firestore | LOW | Forbidden by scope |
| Concurrency / Races | LOW | In-memory only; not shared across UI |
| Performance | LOW | Unused until later tickets |
| Caching | LOW | — |
| UI / Navigation / API | LOW | Untouched |
| Security | LOW | No mic/LLM/secrets |
| Monitoring / Logging | LOW | Optional structured comments only |

**HIGH risks:** none.

**Operational class:** Engineering — proceed.

---

## Phase 2 — Implementation plan

| Element | Plan |
|---------|------|
| Strategy | Add `src/conversation/foundation/` implementing DRDS lifecycle/session/intent/plan/confirmation/response abstractions. Coexist with existing KC-004 conversation layer; do not replace or rewire it. |
| Create | Foundation types/models/contracts/services/session/planning/confirmation/response; architecture doc; verify script; ARCH-009 gate (this file) |
| Modify | `src/conversation/index.ts` — additive re-exports only under clear foundation names; `package.json` verify script |
| Delete | None |
| Repos / Firestore / APIs / migrations | None |
| Order | Types → models/contracts → lifecycle/session → planning/confirmation/response → tests → docs → export → verify |
| Commit | Single commit as requested |
| Rollback | Delete foundation module + exports + verify script |
| Success | Typecheck/build; verify script pass; no UI/repo/Firestore diffs |

---

## Phase 3 — Verification plan

| Type | Plan |
|------|------|
| Unit | `scripts/verify-kc-0131-1-conversation-foundation.ts` — lifecycle, transitions, session, planner, confirmation, response |
| Integration | None (explicit) |
| Regression | Confirm no changes under `src/features`, `src/pages`, repositories, firestore rules |
| Cold start / login / dashboard / Firestore / auth | N/A — no runtime wiring |
| Evidence | Verify script exit 0; `tsc -b` / build success; git diff scoped to foundation + docs + script |

---

## Go / No-Go

| # | Question | Answer | If YES — Impact / Mitigation / Tests |
|---|----------|--------|--------------------------------------|
| 1 | Root cause proven? | N/A (feature) | — |
| 2 | Objective evidence? | YES | DRDS + ARR frozen baseline |
| 3 | Software problem? | YES (new capability) | Architecture-only delivery |
| 4 | Configuration? | NO | — |
| 5 | Operational? | NO | — |
| 6 | Affect bootstrap? | NO | — |
| 7 | Affect authentication? | NO | — |
| 8 | Affect authorization? | NO | — |
| 9 | Affect repositories? | NO | — |
| 10 | Affect Firestore? | NO | — |
| 11 | Affect dashboard? | NO | — |
| 12 | Affect persistence? | NO | In-memory only |
| 13 | Affect routing? | NO | — |
| 14 | Affect caching? | NO | — |
| 15 | Introduce async deps? | NO | Sync foundation APIs |
| 16 | Race conditions? | NO | Not shared with UI yet |
| 17 | Impact production startup? | NO | Not imported by app bootstrap |
| 18 | Impact existing workflows? | NO | Additive module; existing engine untouched |

**Go / No-Go decision: GO**

---

## Dual-path note (ARR prerequisite)

Existing KC-004 `ConversationEngine` / runtime orchestration and rule-based ops answers remain as-is. KC-0131.1 adds a **DRDS-aligned foundation** as the consolidation target for KC-0131.2+. This sprint does **not** migrate callers — avoids a third intelligence path by not wiring foundation into voice/UI yet.
