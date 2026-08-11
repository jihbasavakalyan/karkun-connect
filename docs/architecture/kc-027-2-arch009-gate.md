# KC-027.2 — Non-Production Recovery Readiness — KC-ARCH-009 Gate

**Ticket:** KC-027.2  
**Type:** Infrastructure / Operational Process (documentation)  
**Standards:** KC-ARCH-009 · builds on KC-027.1  
**Date:** 2026-08-12  
**Constraint:** No production Firestore changes. No backup schedule / PITR changes. No auth/rules/Connect/Assignment/app feature changes. Prefer docs/ops only. Do not invent collection names — use `src/repositories/firestore/collections.ts` only. Stop before deployment or production operations.

---

## Phase 0 — Root cause & architecture impact

### 0.1 Classification

| Track | Type |
|-------|------|
| Prepare non-production recovery drill readiness | Infrastructure / Operational Process |

**Primary request type:** Infrastructure

### 0.2 Gap (not a runtime bug)

| Gap | Classification | Evidence |
|-----|----------------|----------|
| KC-027.1 runbook lists paths but lacks formal restore-target strategy, domain validation matrix, acceptance criteria, and cleanup gates | Operational Process | `firestore-nonprod-recovery-runbook.md` A3/A4 are brief |
| Ops need drill-ready checklist before enabling live restore practice | Operations | Baseline §9 ops checklist still open; schedules/PITR may be unset |

**STOP rule:** Docs/ops only — **no** speculative app code; **no** live GCP mutation in this ticket.

### 0.3 Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| UI / Pages / Hooks / Services / Repositories | N | |
| Firestore runtime / rules / indexes | N | |
| Auth / Connect / Assignment / Campaign engines | N | |
| Backup schedules / PITR (GCP) | N | Explicitly unchanged this ticket |
| Documentation / verify scripts | Y | Runbook expansion + KC-027.2 gate + verify |

---

## Phase 1 — Regression risk

| Domain | Risk | Notes |
|--------|------|-------|
| Application runtime | N/A | No `src/` edits |
| Accidental prod restore guidance | **HIGH** (process) | Strengthen prohibitions + cleanup only deletes drill DB IDs |
| Invented collection names | MEDIUM | Align checks to `FIRESTORE_COLLECTIONS` / `FIRESTORE_DOCS` |

### HIGH mitigation

| Item | Mitigation | Verification |
|------|------------|--------------|
| Prod `(default)` touch | Hard stop language; cleanup whitelist `recovery-drill-*` only | `verify:kc-027.2` asserts prohibitions + cleanup constraints |

### Operational classification

**Operational Process** — update runbook; do not enable GCP or restore.

---

## Phase 2 — Implementation plan

### Strategy

1. Document preferred non-prod restore target strategy (Path A primary for first drill).  
2. Define pre-restore checks, post-restore domain validation (verified collections/docs only), acceptance criteria, cleanup/rollback.  
3. Update runbook; add ARCH-009 gate; add lightweight `verify:kc-027.2`.  
4. Run `verify:kc-027.1` + `verify:kc-027.2`; confirm no `src/` diff.  
5. **STOP** — no deploy, no production ops.

### Files

| Action | Path |
|--------|------|
| Create | `docs/architecture/kc-027-2-arch009-gate.md` |
| Edit | `docs/operations/firestore-nonprod-recovery-runbook.md` |
| Edit | `docs/operations/firestore-backup-recovery-baseline.md` (pointer to KC-027.2) |
| Edit | `docs/operations/README.md` (KC-027.2 note) |
| Create | `scripts/verify-kc-027-2-nonprod-recovery-readiness.ts` |
| Edit | `package.json` (`verify:kc-027.2`) |

### Success criteria

- Restore-target strategy, validation domains, acceptance criteria, pre/post steps, cleanup documented  
- Collection/doc IDs only from repository evidence  
- Verify scripts pass; no `src/` changes  

---

## Phase 3 — Verification plan

| Check | Method |
|-------|--------|
| KC-027.1 still green | `npm run verify:kc-027.1` |
| KC-027.2 sections present | `npm run verify:kc-027.2` |
| No app surface | `git diff --name-only` excludes `src/` |
| Typecheck/build | Only if non-doc code requires (verify script TS — run typecheck if needed) |

---

## Go / No-Go

| # | Question | Answer |
|---|----------|--------|
| Root cause / gap proven? | **YES** |
| Software problem? | **NO** — ops readiness docs |
| Affect bootstrap/auth/repos/Firestore runtime? | **NO** |
| Proceed? | **GO** — docs + verify only |

---

## Phase 4 — Post-implementation audit

| Item | Result |
|------|--------|
| `src/` changed? | **NO** |
| GCP schedules/PITR/prod DB changed? | **NO** |
| Runbook expanded (strategy, validation, AC, cleanup)? | **YES** |
| `npm run verify:kc-027.1` | **PASS** |
| `npm run verify:kc-027.2` | **PASS** |

## Phase 5 — Certification

**READY WITH KNOWN LIMITATIONS** — non-prod drill procedure is documented and verifiable; live restore remains blocked until ops confirm `locationId`, managed backups, (optional) PITR, and GCS/staging prerequisites.

## Phase 6

No deploy. No production operations.
