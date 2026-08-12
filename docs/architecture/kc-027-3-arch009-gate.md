# KC-027.3 — Backup/Recovery Health Visibility — KC-ARCH-009 Gate

**Ticket:** KC-027.3  
**Type:** Infrastructure / Operational Process (documentation)  
**Standards:** KC-ARCH-009 · builds on KC-027.1 / KC-027.2  
**Date:** 2026-08-12  
**Constraint:** Docs/ops only. No `src/` · no `api/` · no GCP mutations · no new dependencies · no UI · no deployment. Do not invent next backup execution time. Do not treat Settings “Backup Status” as Firestore DR health.

---

## Phase 0 — Root cause & architecture impact

### 0.1 Classification

| Track | Type |
|-------|------|
| Expose Firestore backup/recovery health contract to operators | Infrastructure / Operational Process |

**Primary request type:** Infrastructure

### 0.2 Gap (not a runtime bug)

| Gap | Classification | Evidence |
|-----|----------------|----------|
| Operators lack a single canonical health card for PITR, schedules, latest READY backup, verified restore, drill cert, limitations | Operational Process | Facts scattered across baseline + runbook; Settings “Backup Status” is local/migration only |
| Risk of false confidence from in-app backup UI vs GCP managed DR | Operations / UX boundary | `DataManagementSettingsSection` Backup Status ≠ DR |

**STOP rule:** Docs/ops contract only — **no** live GCP poll in app; **no** UI; **no** speculative API.

### 0.3 Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| UI / Pages / Hooks / Services / Repositories | N | |
| Firestore runtime / rules / indexes | N | |
| Auth / Connect / Assignment / Campaign | N | |
| Backup schedules / PITR (GCP) | N | Unchanged |
| Documentation / verify scripts | Y | Health contract + gate + `verify:kc-027.3` |

---

## Phase 1 — Regression risk

| Domain | Risk | Notes |
|--------|------|-------|
| Application runtime | N/A | No `src/` / `api/` |
| False “live status” claims | **HIGH** (process) | Label source `curated-ops-snapshot`; states `unknown`/`verified`/`stale`/`failed` |
| Confusing migration backup with DR | **HIGH** (process) | Explicit domain separation in health doc |

### HIGH mitigation

| Item | Mitigation | Verification |
|------|------------|--------------|
| Live vs curated | Health doc forbids live claims without server probe | `verify:kc-027.3` asserts `curated-ops-snapshot` + states |
| Settings Backup Status | Explicit “NOT Firestore DR” language | Asserted in health doc + verify |

### Operational classification

**Operational Process** — establish curated health contract; defer live API/UI.

---

## Phase 2 — Implementation plan

### Strategy

1. Publish canonical health schema + current curated snapshot from KC-027.2 evidence.  
2. Record AC-1…AC-8; security boundary for any future API.  
3. Add ARCH-009 gate + `verify:kc-027.3`.  
4. Point baseline / runbook / ops README at the health doc.  
5. **STOP** — no deploy, no GCP, no UI.

### Files

| Action | Path |
|--------|------|
| Create | `docs/architecture/kc-027-3-arch009-gate.md` |
| Create | `docs/operations/firestore-backup-recovery-health.md` |
| Create | `scripts/verify-kc-027-3-backup-recovery-health.ts` |
| Edit | `docs/operations/README.md` |
| Edit | `docs/operations/firestore-backup-recovery-baseline.md` |
| Edit | `docs/operations/firestore-nonprod-recovery-runbook.md` |
| Edit | `package.json` (`verify:kc-027.3`) |

### Success criteria

- Health contract includes all required fields + explicit states  
- GCP DR ≠ in-app JSON backup  
- KC-027.2 evidence recorded; known limitations listed  
- Verifies 027.1 / 027.2 / 027.3 pass; no `src/` / `api/` diff  

---

## Phase 3 — Verification plan

| Check | Method |
|-------|--------|
| KC-027.1 still green | `npm run verify:kc-027.1` |
| KC-027.2 still green | `npm run verify:kc-027.2` |
| KC-027.3 contract present | `npm run verify:kc-027.3` |
| No app surface | `git diff --name-only` excludes `src/` and `api/` |

---

## Go / No-Go

| # | Question | Answer |
|---|----------|--------|
| Root cause / gap proven? | **YES** |
| Software problem? | **NO** — ops visibility contract |
| Affect bootstrap/auth/repos/Firestore runtime? | **NO** |
| Proceed? | **GO** — docs + verify only; live API/UI **deferred** |

---

## Acceptance criteria (AC-1…AC-8)

| ID | Criterion | Status |
|----|-----------|--------|
| AC-1 | Canonical Backup/Recovery Health schema documented (fields + enums `unknown` \| `verified` \| `stale` \| `failed`) | Met in health doc |
| AC-2 | Distinguishes GCP managed DR vs in-app/local JSON migration backup; Settings “Backup Status” is not DR | Met |
| AC-3 | Records KC-027.2 verified snapshot + open gaps (PITR, schedule IDs) | Met |
| AC-4 | Acquisition boundary: curated ops now; future API Admin-auth + server-side + no client secrets | Met |
| AC-5 | Forbids inventing next backup time; forbids client GCP credentials | Met |
| AC-6 | `verify:kc-027.3` asserts health doc + gate; does not call GCP | Met |
| AC-7 | No `src/` UI; no GCP mutations; no new dependencies | Met |
| AC-8 | Implementation of live API/UI deferred until health contract certified | Met — deferred |

---

## Phase 4 — Post-implementation audit

| Item | Result |
|------|--------|
| `src/` changed? | **NO** |
| `api/` changed? | **NO** |
| GCP changed? | **NO** |
| New dependencies? | **NO** |
| UI shipped? | **NO** |
| Health contract + gate + verify? | **YES** |
| `npm run verify:kc-027.1` | **PASS** (run at certify) |
| `npm run verify:kc-027.2` | **PASS** (run at certify) |
| `npm run verify:kc-027.3` | **PASS** (run at certify) |

## Phase 5 — Certification

**READY WITH KNOWN LIMITATIONS** — curated health contract established; PITR and schedule configuration remain `unknown` until ops re-lists; no live server probe; no Admin UI.

## Phase 6

No deploy. No production operations. Ops may refresh the health card after CLI checks without an application release.

---

## Security boundary (permanent)

- No GCP credentials/tokens in the client  
- No PII / document contents in health payloads  
- Future live API (if ever): server-side, Admin-authenticated, read-only, least privilege  
- No restore / delete / import capability on any health endpoint  
