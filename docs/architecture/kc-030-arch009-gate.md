# KC-030 — Production Pilot Certification — KC-ARCH-009 Gate

**Ticket:** KC-030  
**Type:** Configuration / Verification (certification — no product change)  
**Standards:** KC-ARCH-001 · KC-ARCH-009  
**Date:** 2026-07-31  
**Build:** `a3b623f` · `1.0.0-rc.1`  
**Constraint:** No new features · no UI redesign · no Firestore schema · no refactoring unless a blocking production defect is proven.

---

## Phase 0 — Classification & impact

### 0.1 Classification

**Primary type:** Configuration / Verification (pilot certification)

### 0.2 Root cause / motivation

Platform is feature-complete for Basavakalyan controlled pilot. Product asks for end-to-end readiness evidence and a formal certification decision — not code changes.

### 0.3 Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| Application code / UI / schema / repos | N | Docs + verify evidence only |
| Pilot documentation | Y | New KC-030 package under `docs/pilot/kc-030/` |
| Production runtime | N this sprint | Live interactive smoke deferred to operators |

**STOP:** No speculative code fixes. Failed verify scripts classified as harness drift vs product defect before any change.

---

## Phase 1 — Regression risk

| Domain | Risk | Notes |
|--------|------|-------|
| False certification | HIGH | Mitigate with evidence tables + explicit residual risks |
| Harness failures mistaken for blockers | MEDIUM | Classify each FAIL with root cause |
| Live smoke gaps | MEDIUM | Document operator checklist; do not invent PASS |

### Operational classification

Verification / documentation — proceed. Not an engineering feature sprint.

---

## Phase 2 — Plan

1. Run critical automated verifies + `tsc -b`  
2. Classify any FAIL (product vs harness)  
3. Produce five deliverables + evidence index  
4. Certify readiness  
5. Commit docs only  

---

## Phase 3 — Verification plan

| Check | Method | Evidence |
|-------|--------|----------|
| Reliability / write ACK | `verify:kc-028b`, `verify:reliability` | PASS logs |
| Auth contracts | `verify:auth`, `verify:login-render` | PASS |
| Report / PDF | `verify:kc0125`, `verify:kc-bug-0126` | PASS |
| Voice / Secretary | `verify:rafeeq-voice`, `verify:rafeeq-secretary`, `verify:kc-027` | PASS |
| Typecheck | `tsc -b` | Clean |
| Live Admin/Rukn smoke | Operator checklist | Pending sign-off |

---

## Go / No-Go

| Question | Answer |
|----------|--------|
| Code changes required? | **NO** (unless blocking defect proven) |
| Blocking Critical/High product defect proven? | **NO** |
| Proceed to documentation + certify? | **GO** |

---

## Phase 4–5

See `docs/pilot/kc-030/final-certification-summary.md`.

**Certification:** READY FOR CONTROLLED PILOT
