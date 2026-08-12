# KC-027.4 — Operational Backup Monitoring & Alerting — KC-ARCH-009 Gate

**Ticket:** KC-027.4  
**Type:** Infrastructure / Operational Process (documentation)  
**Standards:** KC-ARCH-009 · builds on KC-027.1 / KC-027.2 / KC-027.3  
**Date:** 2026-08-12  
**Stage:** **A — Docs/ops policy only**  
**Constraint:** No `src/` · no `api/` · no GCP mutations · no new dependencies · no UI · no deployment · do not modify restore database `kc0272-restore-20260812`.

---

## Phase 0 — Root cause & architecture impact

### 0.1 Classification

| Track | Type |
|-------|------|
| Define operational monitoring/alerting policy for Firestore backup/recovery | Infrastructure / Operational Process |

**Primary request type:** Infrastructure

### 0.2 Gap

| Gap | Classification | Evidence |
|-----|----------------|----------|
| Health contract (KC-027.3) lacks alerting thresholds, composite severity, and incident mapping | Operational Process | Health doc refresh policy only; `monitoring.md` has no backup signals |
| Risk of conflating Google platform facts with invented SLAs | Operations | Discovery: no backup-age SLA; no next-run assumption |

**STOP rule:** Stage A docs only — no probe, no notify, no UI.

### 0.3 Impact Matrix

| Area | Impacted? | How |
|------|-----------|-----|
| Application runtime / UI / API | N | |
| Firestore / GCP configuration | N | |
| Documentation / verify scripts | Y | Monitoring policy + gate + `verify:kc-027.4` |

---

## Phase 1 — Regression risk

| Domain | Risk | Notes |
|--------|------|-------|
| False SLA claims | **HIGH** (process) | Label thresholds as OUR policy |
| False recovery confidence | **HIGH** (process) | Backup ≠ recovery; require drill freshness |
| App surface creep | LOW | Explicit Stage A stop |

### HIGH mitigation

| Item | Mitigation | Verification |
|------|------------|--------------|
| SLA confusion | Three-layer table (platform / policy / derived) | `verify:kc-027.4` |
| Backup ≠ restore | Explicit prohibition + drill freshness thresholds | Asserted in monitoring doc |

---

## Phase 2 — Implementation plan

### Strategy

1. Publish monitoring signals, states, composite severity, thresholds, incident mapping.  
2. Record Stage A/B/C architecture and security boundary.  
3. Point health / baseline / runbook / README at monitoring policy.  
4. Add `verify:kc-027.4`.  
5. **STOP**.

### Files

| Action | Path |
|--------|------|
| Create | `docs/architecture/kc-027-4-arch009-gate.md` |
| Create | `docs/operations/firestore-backup-recovery-monitoring.md` |
| Create | `scripts/verify-kc-027-4-backup-monitoring.ts` |
| Edit | `docs/operations/README.md` |
| Edit | `docs/operations/firestore-backup-recovery-health.md` |
| Edit | `docs/operations/firestore-backup-recovery-baseline.md` |
| Edit | `docs/operations/firestore-nonprod-recovery-runbook.md` |
| Edit | `package.json` (`verify:kc-027.4`) |

---

## Phase 3 — Verification plan

| Check | Method |
|-------|--------|
| Prior gates | `npm run verify:kc-027.1` … `verify:kc-027.3` |
| This gate | `npm run verify:kc-027.4` |
| No app surface | Diff excludes `src/` and `api/` |

---

## Go / No-Go

| Question | Answer |
|----------|--------|
| Gap proven? | **YES** |
| Software problem? | **NO** — ops policy |
| Proceed Stage A? | **GO** |
| Stage B/C now? | **NO** — deferred |

---

## Acceptance criteria (AC-1…AC-9)

| ID | Criterion | Status |
|----|-----------|--------|
| AC-1 | Signals + states (`healthy\|warning\|stale\|failed\|unknown`) documented | Met |
| AC-2 | Thresholds separate platform facts / ops policy / derived thresholds | Met |
| AC-3 | Forbids next-run invention and Google backup-age SLA claims | Met |
| AC-4 | Maps conditions to incident P2/P3/P4 consistently with incident-response | Met |
| AC-5 | Extends KC-027.3; does not replace it | Met |
| AC-6 | Security boundary restated | Met |
| AC-7 | `verify:kc-027.4` asserts docs; does not call GCP | Met |
| AC-8 | Stage A now; B/C deferred with prerequisites | Met |
| AC-9 | No `src/` UI, no `api/`, no GCP mutations, no new dependencies | Met |

---

## Phase 4 — Post-implementation audit

| Item | Result |
|------|--------|
| `src/` / `api/` changed? | **NO** |
| GCP / restore DB modified? | **NO** |
| New dependencies? | **NO** |
| Stage A policy + verify shipped? | **YES** |

## Phase 5 — Certification

**READY WITH KNOWN LIMITATIONS** — Stage A policy complete; live probe and notifications not implemented; PITR/schedule configuration may still score `unknown` until ops enablement.

## Phase 6

No deploy. Ops may apply checklist manually using existing `gcloud` probes.

---

## Security boundary (permanent)

- No client GCP credentials  
- No PII / document contents in monitor payloads  
- No restore / delete / import on monitoring paths  
- Future automation: server-side, least privilege, read-only  
